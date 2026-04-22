'use client'

import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useTheme } from 'next-themes'
import { ArrowLeft, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SafeEChart } from '@/components/ui/SafeEChart'
import { FinancialAnalysis } from '@/components/stock/financial/FinancialAnalysis'
import { StockAIChat } from '@/components/stock/StockAIChat'
import { registerThemes, getChartColors } from '@/lib/chart-theme'
import { useAllFinancialModules } from '@/hooks/useFinancialData'
import type { ValuationApiResponse } from '@/types/financial'

interface PageProps {
  params: Promise<{ symbol: string }>
}

interface PriceApiData {
  dates: string[]
  open: number[]
  close: number[]
  high: number[]
  low: number[]
  volume: number[]
  change_pct?: number[]
}

interface PriceApiResponse {
  success?: boolean
  data?: PriceApiData
}

interface SearchApiResponse {
  results?: Array<{ name?: string }>
}

const REQUEST_TIMEOUT_MS = 15000
const swrOptions = {
  revalidateOnFocus: false,
  revalidateIfStale: false,
  shouldRetryOnError: false,
  errorRetryCount: 1,
  dedupingInterval: 30000,
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json() as Promise<T>
  } finally {
    clearTimeout(timeoutId)
  }
}

registerThemes()

export default function StockDetailPage({ params }: PageProps) {
  const { symbol } = use(params)
  const decodedSymbol = decodeURIComponent(symbol)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('3M')

  const { data: priceResponse, isLoading, error, mutate: refreshPrice } = useSWR<PriceApiResponse>(
    `/api/stock/price/${encodeURIComponent(decodedSymbol)}`,
    fetcher,
    swrOptions,
  )

  const { data: searchData } = useSWR<SearchApiResponse>(
    `/api/stock/search?q=${encodeURIComponent(decodedSymbol)}&limit=1`,
    fetcher,
    swrOptions,
  )

  const {
    radar,
    dupont,
    dcf,
    dcfParams,
    updateDCFParams,
    peBand,
    growth,
    risk,
    valuation,
    isLoading: financialLoading,
  } = useAllFinancialModules(decodedSymbol)

  const pageContext = useMemo(() => {
    const valuationData = valuation as ValuationApiResponse | undefined
    const metrics = valuationData?.metrics
    const stockInfo = valuationData?.stock_info
    const compositeScore = radar?.composite_score
    const scoreBreakdown = radar?.score_breakdown
    const latestDupont = dupont?.history?.slice(-1)[0]
    const riskLevel = risk?.fraud_detection?.risk_level
    const fraudScore = risk?.fraud_detection?.m_score
    const warnings = risk?.warnings?.map((warning) => warning.detail)
    const healthScore = risk?.health_score
    const revenueGrowth = growth?.cagr?.revenue_3yr
    const dcfValue = dcf?.intrinsic_value
    const pePercentile = peBand?.pe_percentiles?.p50
    const pbPercentile = peBand?.target_prices?.upside_potential?.neutral

    return {
      pageType: 'stock-detail' as const,
      financialSummary: {
        marketCap: metrics?.market_cap,
        pe: metrics?.pe_ttm,
        pb: metrics?.pb,
        roe: latestDupont?.roe,
        netProfitMargin: latestDupont?.net_margin ?? scoreBreakdown?.profitability?.net_margin,
        revenueGrowth,
        debtRatio: scoreBreakdown?.financial_health?.debt_ratio,
        compositeScore,
        latestYear: latestDupont?.year,
      },
      riskIndicators: {
        riskLevel,
        fraudScore,
        warnings,
        healthScore,
      },
      valuation: {
        dcfValue,
        pePercentile,
        pbPercentile,
        industryPe: metrics?.industry_avg_pe,
        fairValue: undefined,
      },
      timeRange,
      additionalInfo: {
        industry: stockInfo?.industry,
        sector: stockInfo?.sector,
        hasData: !financialLoading && Boolean(radar || dupont),
      },
    }
  }, [dcf, dupont, financialLoading, growth, peBand, radar, risk, timeRange, valuation])

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 bg-surface-low" />
            <div className="h-96 bg-surface-low" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !priceResponse?.success || !priceResponse.data) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl py-12 text-center">
          <p className="text-destructive">加载失败，股票代码 “{decodedSymbol}” 可能不存在。</p>
          <Link href="/stock">
            <Button variant="outline" className="mt-4 !rounded-none">
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回搜索
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const priceInfo = priceResponse.data
  const stockName = searchData?.results?.[0]?.name || decodedSymbol
  const latestPrice = priceInfo.close?.slice(-1)[0]
  const prevPrice = priceInfo.close?.slice(-2)[0]
  const priceChange = latestPrice && prevPrice ? latestPrice - prevPrice : null
  const priceChangePct = latestPrice && prevPrice ? ((latestPrice - prevPrice) / prevPrice) * 100 : null
  const isUp = priceChangePct !== null && priceChangePct >= 0

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/stock">
              <Button variant="ghost" size="sm" className="text-muted-foreground !rounded-none">
                <ArrowLeft className="mr-1 h-4 w-4" />
                返回
              </Button>
            </Link>
            <div>
              <h1 className="font-editorial text-xl tracking-tight text-foreground">
                {stockName}
                <span className="ml-2 font-mono text-sm font-sans text-link">{decodedSymbol}</span>
              </h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refreshPrice()} className="!rounded-none">
            <RefreshCw className="mr-1 h-4 w-4" />
            刷新
          </Button>
        </div>

        <div className="mb-6 bg-surface-low p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-3xl font-semibold">¥{latestPrice?.toFixed(2) || '-'}</span>
                {priceChangePct !== null && (
                  <Badge className={`!rounded-none ${isUp ? 'bg-up/20 text-up' : 'bg-down/20 text-down'}`}>
                    {isUp ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                    {isUp ? '+' : ''}
                    {priceChange?.toFixed(2)} ({isUp ? '+' : ''}
                    {priceChangePct.toFixed(2)}%)
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">最新交易日: {priceInfo.dates?.slice(-1)[0] || '-'}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">当日区间</div>
              <div className="font-mono text-sm">
                {priceInfo.low?.slice(-1)[0]?.toFixed(2)} - {priceInfo.high?.slice(-1)[0]?.toFixed(2)}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">成交量</div>
              <div className="font-mono text-sm">
                {priceInfo.volume?.slice(-1)[0] ? `${(priceInfo.volume.slice(-1)[0] / 10000).toFixed(0)}万手` : '-'}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 bg-surface-low p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-editorial text-sm tracking-tight text-muted-foreground">股价走势</h3>
            <div className="flex gap-px">
              {(['1M', '3M', '6M', '1Y'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-3 text-xs !rounded-none"
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
          <PriceChart data={priceInfo} timeRange={timeRange} isDark={isDark} />
        </div>

        <div className="mb-6 bg-surface-low p-5">
          <h3 className="mb-4 font-editorial text-sm tracking-tight text-muted-foreground">区间统计</h3>
          <StatisticsCards data={priceInfo} timeRange={timeRange} />
        </div>

        <div className="mt-8">
          <FinancialAnalysis
            stockCode={decodedSymbol}
            stockName={stockName}
            isDark={isDark}
            modulesData={{
              radar,
              dupont,
              dcf,
              dcfParams,
              updateDCFParams,
              peBand,
              growth,
              risk,
              valuation,
              isLoading: financialLoading,
            }}
          />
        </div>
      </div>

      <StockAIChat
        stockCode={decodedSymbol}
        stockName={stockName}
        priceData={{
          latestPrice,
          priceChange,
          priceChangePct,
          dates: priceInfo.dates,
          closes: priceInfo.close,
        }}
        pageContext={pageContext.additionalInfo?.hasData ? pageContext : undefined}
      />
    </div>
  )
}

function PriceChart({
  data,
  timeRange,
  isDark,
}: {
  data: PriceApiData
  timeRange: '1M' | '3M' | '6M' | '1Y'
  isDark: boolean
}) {
  if (!data.dates?.length) {
    return <div className="flex h-80 items-center justify-center text-muted-foreground">暂无数据</div>
  }

  const colors = getChartColors(isDark)
  const rangeDays = { '1M': 22, '3M': 66, '6M': 132, '1Y': 252 }[timeRange]
  const sliceStart = Math.max(0, data.dates.length - rangeDays)

  const series = data.dates
    .slice(sliceStart)
    .map((date, index) => ({
      date,
      close: data.close[sliceStart + index],
      volume: data.volume[sliceStart + index],
    }))
    .filter((item) => Boolean(item.date) && Number.isFinite(item.close))

  if (series.length < 2) {
    return <div className="flex h-80 items-center justify-center text-muted-foreground">样本不足，暂不显示图表</div>
  }

  const dates = series.map((item) => item.date)
  const closes = series.map((item) => item.close)
  const minPrice = Math.min(...closes)
  const maxPrice = Math.max(...closes)

  const option = {
    grid: { left: 8, right: 60, top: 10, bottom: 40 },
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: isDark ? 'rgba(18,18,20,0.94)' : 'rgba(255,255,255,0.94)',
      borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
      borderWidth: 1,
      borderRadius: 0,
      padding: 10,
      textStyle: { fontSize: 12, color: isDark ? '#f5f5f7' : '#1c1c1e' },
      formatter: (params: Array<{ axisValue: string; value: number }>) => {
        const point = params[0]
        return `
          <div style="font-weight: 500">${point.axisValue}</div>
          <div style="margin-top: 4px">收盘: <span style="font-family: monospace">¥${point.value.toFixed(2)}</span></div>
        `
      },
    },
    xAxis: {
      type: 'category' as const,
      data: dates,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: colors.muted,
        fontSize: 10,
        interval: Math.floor(dates.length / 4),
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      position: 'right' as const,
      min: minPrice * 0.98,
      max: maxPrice * 1.02,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: colors.muted,
        fontSize: 10,
        formatter: (value: number) => value.toFixed(0),
      },
      splitLine: {
        lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
      },
    },
    series: [
      {
        name: '收盘价',
        type: 'line' as const,
        data: closes,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#3b82f6', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59,130,246,0.3)' },
              { offset: 1, color: 'rgba(59,130,246,0.01)' },
            ],
          },
        },
      },
    ],
  }

  return (
    <div style={{ height: 320 }}>
      <SafeEChart
        chartKey={`stock-price-${timeRange}-${dates.at(-1) || 'empty'}`}
        option={option as Record<string, unknown>}
        height="100%"
        width="100%"
        fallback={<div className="flex h-full items-center justify-center text-sm text-muted-foreground">股价图表渲染失败</div>}
      />
    </div>
  )
}

function StatisticsCards({
  data,
  timeRange,
}: {
  data: Pick<PriceApiData, 'close' | 'high' | 'low' | 'volume'>
  timeRange: '1M' | '3M' | '6M' | '1Y'
}) {
  if (!data.close?.length) return null

  const rangeDays = { '1M': 22, '3M': 66, '6M': 132, '1Y': 252 }[timeRange]
  const sliceStart = Math.max(0, data.close.length - rangeDays)
  const closes = data.close.slice(sliceStart)
  const highs = data.high.slice(sliceStart)
  const lows = data.low.slice(sliceStart)
  const volumes = data.volume.slice(sliceStart)

  const startPrice = closes[0]
  const endPrice = closes[closes.length - 1]
  const totalChange = ((endPrice - startPrice) / startPrice) * 100
  const maxPrice = Math.max(...highs)
  const minPrice = Math.min(...lows)
  const avgVolume = volumes.reduce((sum, value) => sum + value, 0) / volumes.length

  const stats = [
    { label: '区间涨跌幅', value: `${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)}%`, color: totalChange >= 0 ? 'text-up' : 'text-down' },
    { label: '最高价', value: `¥${maxPrice.toFixed(2)}` },
    { label: '最低价', value: `¥${minPrice.toFixed(2)}` },
    { label: '平均成交量', value: `${(avgVolume / 10000).toFixed(0)}万手` },
  ]

  return (
    <div className="grid grid-cols-2 gap-px bg-surface-high md:grid-cols-4">
      {stats.map((stat, index) => (
        <div key={stat.label} className={`p-4 text-center ${index % 2 === 0 ? 'bg-surface-low' : 'bg-surface-float'}`}>
          <div className="mb-1 text-xs text-muted-foreground">{stat.label}</div>
          <div className={`font-mono font-medium ${stat.color || ''}`}>{stat.value}</div>
        </div>
      ))}
    </div>
  )
}
