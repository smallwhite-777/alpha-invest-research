'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useTheme } from 'next-themes'
import { ArrowLeft, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { registerThemes, getChartColors } from '@/lib/chart-theme'
import { StockAIChat } from '@/components/stock/StockAIChat'
import { formatAmountYi } from '@/lib/financial-format'
import { FinancialAnalysis } from '@/components/stock/financial/FinancialAnalysis'
import { useAllFinancialModules } from '@/hooks/useFinancialData'

interface PageProps {
  params: Promise<{ symbol: string }>
}

interface SearchResultItem {
  code?: string
  name?: string
}

interface SearchResponse {
  results?: SearchResultItem[]
}

interface RawPriceSeries {
  dates?: unknown[]
  open?: unknown[]
  close?: unknown[]
  high?: unknown[]
  low?: unknown[]
  volume?: unknown[]
  change_pct?: unknown[]
}

interface PriceSeries {
  dates: string[]
  open: number[]
  close: number[]
  high: number[]
  low: number[]
  volume: number[]
  change_pct: number[]
}

interface PriceResponse {
  success?: boolean
  data?: RawPriceSeries
}

interface ValuationMetrics {
  market_cap?: number
  pe_ttm?: number
  pb?: number
  industry_pe?: number
}

interface ValuationStockInfo {
  industry?: string
  sector?: string
}

interface ValuationModule {
  metrics?: ValuationMetrics
  stock_info?: ValuationStockInfo
}

interface RadarModule {
  composite_score?: number
  score_breakdown?: {
    profitability?: {
      net_margin?: number
    }
    financial_health?: {
      debt_ratio?: number
    }
  }
}

interface DupontHistoryItem {
  year?: string
  roe?: number
  net_margin?: number
}

interface DupontModule {
  history?: DupontHistoryItem[]
}

interface DcfModule {
  intrinsic_value?: number
}

interface PeBandModule {
  pe_percentiles?: {
    p50?: number
  }
  target_prices?: {
    upside_potential?: {
      neutral?: number
    }
  }
}

interface GrowthModule {
  cagr?: {
    revenue_3yr?: number
  }
}

interface RiskModule {
  fraud_detection?: {
    risk_level?: string
    m_score?: number
  }
  warnings?: Array<{ detail?: string }>
  health_score?: number
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  return response.json()
}

function normalizeTicker(symbol: string) {
  const cleaned = symbol.trim().toUpperCase()
  const digitsOnly = cleaned.replace(/\.(SH|SZ|HK|US)$/i, '').replace(/[^0-9A-Z]/g, '')
  return /^[0-9]{5,6}$/.test(digitsOnly) ? digitsOnly : cleaned
}

function getRangeStartDate(range: '1M' | '3M' | '6M' | '1Y') {
  const days = { '1M': 31, '3M': 93, '6M': 186, '1Y': 366 }[range]
  const start = new Date()
  start.setDate(start.getDate() - days)
  return start.toISOString().slice(0, 10)
}

function toNumberArray(values: unknown[] | undefined) {
  if (!Array.isArray(values)) return []

  return values
    .map((value) => {
      const numeric = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(numeric) ? numeric : null
    })
    .filter((value): value is number => value !== null)
}

function normalizePriceData(data: RawPriceSeries | undefined): PriceSeries {
  if (!data || !Array.isArray(data.dates)) {
    return {
      dates: [],
      open: [],
      close: [],
      high: [],
      low: [],
      volume: [],
      change_pct: [],
    }
  }

  const dates = data.dates.map((value) => String(value))
  const open = toNumberArray(data.open)
  const close = toNumberArray(data.close)
  const high = toNumberArray(data.high)
  const low = toNumberArray(data.low)
  const volume = toNumberArray(data.volume)
  const changePct = toNumberArray(data.change_pct)

  const safeLength = Math.min(
    dates.length,
    open.length || dates.length,
    close.length || dates.length,
    high.length || dates.length,
    low.length || dates.length,
    volume.length || dates.length
  )

  return {
    dates: dates.slice(0, safeLength),
    open: open.slice(0, safeLength),
    close: close.slice(0, safeLength),
    high: high.slice(0, safeLength),
    low: low.slice(0, safeLength),
    volume: volume.slice(0, safeLength),
    change_pct: changePct.slice(0, safeLength),
  }
}

registerThemes()

export default function StockDetailPage({ params }: PageProps) {
  const { symbol } = use(params)
  const decodedSymbol = decodeURIComponent(symbol)
  const normalizedTicker = useMemo(() => normalizeTicker(decodedSymbol), [decodedSymbol])
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('3M')
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMounted(true)
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  const priceApiUrl = useMemo(() => {
    const query = new URLSearchParams({ start_date: getRangeStartDate(timeRange) })
    return `/api/stock/price/${encodeURIComponent(normalizedTicker)}?${query.toString()}`
  }, [normalizedTicker, timeRange])

  const { data: priceData, isLoading, error, mutate: refreshPrice } = useSWR<PriceResponse>(
    priceApiUrl,
    fetcher
  )

  const { data: searchData } = useSWR<SearchResponse>(
    `/api/stock/search?q=${encodeURIComponent(normalizedTicker)}&limit=1`,
    fetcher
  )

  const {
    radar,
    dupont,
    dcf,
    peBand,
    growth,
    risk,
    valuation,
    isLoading: financialLoading,
  } = useAllFinancialModules(decodedSymbol) as {
    radar?: RadarModule
    dupont?: DupontModule
    dcf?: DcfModule
    peBand?: PeBandModule
    growth?: GrowthModule
    risk?: RiskModule
    valuation?: ValuationModule
    isLoading: boolean
  }

  const priceInfo = useMemo(() => normalizePriceData(priceData?.data), [priceData?.data])

  const pageContext = useMemo(() => {
    const metrics = valuation?.metrics
    const stockInfo = valuation?.stock_info
    const compositeScore = radar?.composite_score
    const scoreBreakdown = radar?.score_breakdown
    const latestDupont = dupont?.history?.slice(-1)[0]
    const riskLevel = risk?.fraud_detection?.risk_level
    const fraudScore = risk?.fraud_detection?.m_score
    const warnings = risk?.warnings
      ?.map((warning) => warning.detail)
      .filter((warning): warning is string => Boolean(warning))
    const healthScore = risk?.health_score
    const revenueGrowth = growth?.cagr?.revenue_3yr
    const dcfValue = dcf?.intrinsic_value
    const pePercentile = peBand?.pe_percentiles?.p50
    const pbPercentile = peBand?.target_prices?.upside_potential?.neutral

    return {
      pageType: 'stock-detail' as const,
      financialSummary: {
        marketCap: metrics?.market_cap ? formatAmountYi(metrics.market_cap) : undefined,
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
        industryPe: metrics?.industry_pe,
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
            <div className="h-8 w-1/3 rounded bg-card" />
            <div className="h-96 rounded bg-card" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !priceData?.success) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl py-12 text-center">
          <p className="text-destructive">
            加载失败，股票代码 &quot;{decodedSymbol}&quot; 可能不存在
          </p>
          <Link href="/stock">
            <Button variant="outline" className="mt-4 border-border">
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回搜索
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const stockName = searchData?.results?.[0]?.name || decodedSymbol
  const latestPrice = priceInfo.close.slice(-1)[0]
  const prevPrice = priceInfo.close.slice(-2)[0]
  const latestOpen = priceInfo.open.slice(-1)[0]
  const latestHigh = priceInfo.high.slice(-1)[0]
  const latestLow = priceInfo.low.slice(-1)[0]
  const latestVolume = priceInfo.volume.slice(-1)[0]
  const priceChange =
    latestPrice !== undefined && prevPrice !== undefined ? latestPrice - prevPrice : null
  const priceChangePct =
    latestPrice !== undefined && prevPrice !== undefined && prevPrice !== 0
      ? ((latestPrice - prevPrice) / prevPrice) * 100
      : null
  const isUp = priceChangePct !== null && priceChangePct >= 0

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/stock">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ArrowLeft className="mr-1 h-4 w-4" />
                返回
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {stockName}
                <span className="ml-2 text-sm text-link">{decodedSymbol}</span>
              </h1>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => refreshPrice()} className="border-border">
            <RefreshCw className="mr-1 h-4 w-4" />
            刷新
          </Button>
        </div>

        <Card className="mb-6 border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-3xl font-semibold">
                  {latestPrice?.toFixed(2) || '-'}
                </span>
                {priceChangePct !== null && (
                  <Badge className={isUp ? 'bg-up/20 text-up' : 'bg-down/20 text-down'}>
                    {isUp ? (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    )}
                    {isUp ? '+' : ''}
                    {priceChange?.toFixed(2)} ({isUp ? '+' : ''}
                    {priceChangePct.toFixed(2)}%)
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                最新交易日：{priceInfo.dates.slice(-1)[0] || '-'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-right md:grid-cols-3">
              <Stat label="开盘" value={latestOpen?.toFixed(2) || '-'} />
              <Stat label="最高" value={latestHigh?.toFixed(2) || '-'} />
              <Stat label="最低" value={latestLow?.toFixed(2) || '-'} />
              <Stat label="昨收" value={prevPrice?.toFixed(2) || '-'} />
              <Stat
                label="成交量"
                value={latestVolume ? `${(latestVolume / 10000).toFixed(2)} 万` : '-'}
                className="md:col-span-2"
              />
            </div>
          </div>
        </Card>

        <Card className="mb-6 border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">股价走势</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                当前展示 {priceInfo.dates.length} 个交易日数据
              </p>
            </div>
            <div className="flex gap-1">
              {(['1M', '3M', '6M', '1Y'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
          <PriceChart data={priceInfo} timeRange={timeRange} isDark={mounted && resolvedTheme === 'dark'} />
        </Card>

        <Card className="mb-6 border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">区间统计</h3>
          <StatisticsCards data={priceInfo} />
        </Card>

        <div className="mt-8">
          <FinancialAnalysis
            stockCode={decodedSymbol}
            stockName={stockName}
            isDark={mounted && resolvedTheme === 'dark'}
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
        pageContext={pageContext.additionalInfo.hasData ? pageContext : undefined}
      />
    </div>
  )
}

function Stat({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  )
}

function PriceChart({
  data,
  timeRange,
  isDark,
}: {
  data: PriceSeries
  timeRange: '1M' | '3M' | '6M' | '1Y'
  isDark: boolean
}) {
  if (!data.dates.length) {
    return <div className="flex h-80 items-center justify-center text-muted-foreground">暂无数据</div>
  }

  const colors = getChartColors(isDark)
  const rangeDays = { '1M': 22, '3M': 66, '6M': 132, '1Y': 252 }[timeRange]
  const sliceStart = Math.max(0, data.dates.length - rangeDays)
  const dates = data.dates.slice(sliceStart)
  const closes = data.close.slice(sliceStart)
  const minPrice = Math.min(...closes)
  const maxPrice = Math.max(...closes)

  const option = {
    grid: { left: 8, right: 60, top: 10, bottom: 40 },
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: isDark ? 'rgba(18,18,20,0.94)' : 'rgba(255,255,255,0.94)',
      borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
      borderWidth: 1,
      padding: 10,
      textStyle: { fontSize: 12, color: isDark ? '#f5f5f7' : '#1c1c1e' },
      formatter: (params: Array<{ axisValue: string; value: number }>) => {
        const point = params[0]
        return `
          <div style="font-weight: 500">${point.axisValue}</div>
          <div style="margin-top: 4px">收盘: <span style="font-family: monospace">${point.value.toFixed(2)}</span></div>
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
        interval: Math.max(0, Math.floor(dates.length / 4)),
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
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
    </div>
  )
}

function StatisticsCards({ data }: { data: Pick<PriceSeries, 'close' | 'high' | 'low' | 'volume'> }) {
  if (!data.close.length) return null

  const startPrice = data.close[0]
  const endPrice = data.close[data.close.length - 1]
  const totalChange = ((endPrice - startPrice) / startPrice) * 100
  const maxPrice = Math.max(...data.high)
  const minPrice = Math.min(...data.low)
  const avgVolume = data.volume.reduce((sum, value) => sum + value, 0) / data.volume.length

  const stats = [
    {
      label: '区间涨跌幅',
      value: `${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)}%`,
      color: totalChange >= 0 ? 'text-up' : 'text-down',
    },
    { label: '最高价', value: `${maxPrice.toFixed(2)}` },
    { label: '最低价', value: `${minPrice.toFixed(2)}` },
    { label: '平均成交量', value: `${(avgVolume / 10000).toFixed(0)} 万` },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          <div className="mb-1 text-xs text-muted-foreground">{stat.label}</div>
          <div className={`font-mono font-medium ${stat.color || ''}`}>{stat.value}</div>
        </div>
      ))}
    </div>
  )
}
