'use client'

import useSWR, { SWRConfiguration } from 'swr'
import { useState, useCallback, useEffect } from 'react'
import type {
  FinancialDataResponse,
  RadarResponse,
  DuPontResponse,
  DCFResponse,
  DCFParams,
  PEBandResponse,
  GrowthResponse,
  RiskResponse,
  PeerComparisonResponse,
  HistoricalSnapshot,
  ValuationApiResponse
} from '@/types/financial'

// ==================== 基础配置 ====================

// 使用Next.js代理API路径，避免CORS问题
const API_BASE = '/api/financial'
const REQUEST_TIMEOUT_MS = 15000

const fetcher = async (url: string) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const res = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeoutId))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ==================== 分级缓存策略 ====================

/**
 * 缓存策略分级：
 * - 实时数据（股价）: 5秒刷新，焦点时重新验证
 * - 半静态数据（估值）: 1小时去重，焦点时不重新验证
 * - 静态数据（历史财务）: 24小时缓存，永不主动刷新
 */

// 实时数据缓存配置（股价、行情）
export const realtimeCacheConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  refreshInterval: 15000,
  dedupingInterval: 10000,
  shouldRetryOnError: false,
  errorRetryCount: 1,
}

// 半静态数据缓存配置（财务指标、估值）
export const semiStaticCacheConfig: SWRConfiguration = {
  revalidateOnFocus: false,     // 焦点不刷新
  revalidateOnReconnect: false,
  dedupingInterval: 3600000,    // 1小时去重
  shouldRetryOnError: false,
  errorRetryCount: 1,
}

// 静态数据缓存配置（历史财务、年报）
export const staticCacheConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 86400000,   // 24小时去重
  revalidateIfStale: false,     // 过期也不重新验证
  shouldRetryOnError: false,
  errorRetryCount: 1,
}

// 默认配置（向后兼容）
const defaultSWRConfig = semiStaticCacheConfig

// ==================== 批量查询优化 ====================

interface BatchFinancialResult {
  [module: string]: unknown
}

/**
 * 批量获取财务模块数据
 * 一次请求获取多个模块，减少网络开销
 */
export function useBatchFinancialModules(
  stockCode: string,
  modules: string[] = ['radar', 'dupont', 'dcf', 'growth', 'risk']
) {
  const modulesParam = modules.join(',')

  const { data, error, isLoading, mutate } = useSWR<BatchFinancialResult>(
    stockCode ? `${API_BASE}/batch/${encodeURIComponent(stockCode)}?modules=${modulesParam}` : null,
    fetcher,
    semiStaticCacheConfig
  )

  return {
    data,
    isLoading,
    error,
    refresh: mutate
  }
}

// ==================== 综合财务数据 ====================

export function useFinancialData(stockCode: string) {
  const { data, error, isLoading, mutate } = useSWR<FinancialDataResponse>(
    stockCode ? `${API_BASE}/comprehensive/${encodeURIComponent(stockCode)}` : null,
    fetcher,
    staticCacheConfig  // 使用静态缓存
  )

  return {
    financialData: data,
    isLoading,
    error,
    refresh: mutate
  }
}

// ==================== 分模块数据获取 ====================

export function useRadarScores(stockCode: string) {
  const { data, error, isLoading } = useSWR<RadarResponse>(
    stockCode ? `${API_BASE}/radar/${encodeURIComponent(stockCode)}` : null,
    fetcher,
    defaultSWRConfig
  )

  return {
    radarData: data,
    isLoading,
    error
  }
}

export function useDuPont(stockCode: string) {
  const { data, error, isLoading } = useSWR<DuPontResponse>(
    stockCode ? `${API_BASE}/dupont/${encodeURIComponent(stockCode)}` : null,
    fetcher,
    defaultSWRConfig
  )

  return {
    dupontData: data,
    isLoading,
    error
  }
}

export function useDCF(stockCode: string, initialParams?: DCFParams) {
  const [params, setParams] = useState<DCFParams>(
    initialParams || {
      wacc_adjustment: 0,
      growth_adjustment: 0,
      projection_years: 10
    }
  )
  const [adjustedData, setAdjustedData] = useState<DCFResponse | null>(null)

  const { data: baseData, error, isLoading, mutate } = useSWR<DCFResponse>(
    stockCode ? `${API_BASE}/dcf/${encodeURIComponent(stockCode)}` : null,
    fetcher,
    defaultSWRConfig
  )

  const calculateAdjustedDCF = useCallback(async (newParams: DCFParams) => {
    if (!stockCode) return null

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      const res = await fetch(`${API_BASE}/dcf/${encodeURIComponent(stockCode)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newParams),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    } catch (err) {
      console.error('DCF calculation error:', err)
      return null
    }
  }, [stockCode])

  const updateParams = useCallback(async (newParams: DCFParams) => {
    setParams(newParams)
    const result = await calculateAdjustedDCF(newParams)
    if (result) {
      setAdjustedData(result)
      mutate(result, false)
    }
  }, [calculateAdjustedDCF, mutate])

  useEffect(() => {
    if (baseData && !adjustedData) {
      setAdjustedData(baseData)
    }
  }, [baseData, adjustedData])

  return {
    dcfData: adjustedData || baseData,
    params,
    updateParams,
    isLoading,
    error
  }
}

export function usePEBand(stockCode: string) {
  const { data, error, isLoading } = useSWR<PEBandResponse>(
    stockCode ? `${API_BASE}/pe-band/${encodeURIComponent(stockCode)}` : null,
    fetcher,
    defaultSWRConfig
  )

  return {
    peBandData: data,
    isLoading,
    error
  }
}

export function useGrowth(stockCode: string) {
  const { data, error, isLoading } = useSWR<GrowthResponse>(
    stockCode ? `${API_BASE}/growth/${encodeURIComponent(stockCode)}` : null,
    fetcher,
    defaultSWRConfig
  )

  return {
    growthData: data,
    isLoading,
    error
  }
}

export function useRisk(stockCode: string) {
  const { data, error, isLoading } = useSWR<RiskResponse>(
    stockCode ? `${API_BASE}/risk/${encodeURIComponent(stockCode)}` : null,
    fetcher,
    defaultSWRConfig
  )

  return {
    riskData: data,
    isLoading,
    error
  }
}

// 估值指标 - 使用单独的代理路径
export function useValuation(stockCode: string) {
  const { data, error, isLoading } = useSWR<ValuationApiResponse>(
    stockCode ? `/api/stock/valuation/${encodeURIComponent(stockCode)}` : null,
    fetcher,
    defaultSWRConfig
  )

  return {
    valuationData: data,
    isLoading,
    error
  }
}

export function usePeers(stockCode: string) {
  const { data, error, isLoading } = useSWR<PeerComparisonResponse>(
    stockCode ? `/api/stock/peers/${encodeURIComponent(stockCode)}` : null,
    fetcher,
    defaultSWRConfig
  )

  return {
    peersData: data,
    isLoading,
    error
  }
}

export function useHistoricalSnapshot(stockCode: string, date?: string) {
  const { data, error, isLoading } = useSWR<HistoricalSnapshot>(
    stockCode && date
      ? `${API_BASE}/time-travel/${encodeURIComponent(stockCode)}?date=${date}`
      : null,
    fetcher,
    defaultSWRConfig
  )

  return {
    snapshotData: data,
    isLoading,
    error
  }
}

// ==================== 组合Hook ====================

export function useAllFinancialModules(stockCode: string) {
  const radar = useRadarScores(stockCode)
  const dupont = useDuPont(stockCode)
  const dcf = useDCF(stockCode)
  const peBand = usePEBand(stockCode)
  const growth = useGrowth(stockCode)
  const risk = useRisk(stockCode)
  const valuation = useValuation(stockCode)

  const isLoading = radar.isLoading || dupont.isLoading || dcf.isLoading ||
                    peBand.isLoading || growth.isLoading || risk.isLoading ||
                    valuation.isLoading

  const hasError = radar.error || dupont.error || dcf.error ||
                   peBand.error || growth.error || risk.error ||
                   valuation.error

  return {
    radar: radar.radarData,
    dupont: dupont.dupontData,
    dcf: dcf.dcfData,
    dcfParams: dcf.params,
    updateDCFParams: dcf.updateParams,
    peBand: peBand.peBandData,
    growth: growth.growthData,
    risk: risk.riskData,
    valuation: valuation.valuationData,
    isLoading,
    hasError
  }
}
