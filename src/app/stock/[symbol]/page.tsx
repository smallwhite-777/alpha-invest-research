'use client'

import { use, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useTheme } from 'next-themes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { registerThemes, getChartColors } from '@/lib/chart-theme'
import { StockAIChat } from '@/components/stock/StockAIChat'
import { FinancialAnalysis } from '@/components/stock/financial/FinancialAnalysis'
import { useAllFinancialModules } from '@/hooks/useFinancialData'

interface PageProps {
  params: Promise<{ symbol: string }>
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

registerThemes()

export default function StockDetailPage({ params }: PageProps) {
  const { symbol } = use(params)
  const decodedSymbol = decodeURIComponent(symbol)

  // Fetch price data
  const { data: priceData, isLoading, error, mutate: refreshPrice } = useSWR(
    `/api/stock/price/${encodeURIComponent(decodedSymbol)}`,
    fetcher
  )

  // Search to get stock name
  const { data: searchData } = useSWR(
    `/api/stock/search?q=${encodeURIComponent(decodedSymbol)}&limit=1`,
    fetcher
  )

  // 获取财务数据用于AI上下文
  const {
    radar,
    dupont,
    dcf,
    peBand,
    growth,
    risk,
    valuation,
    isLoading: financialLoading
  } = useAllFinancialModules(decodedSymbol)

  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('3M')

  useEffect(() => setMounted(true), [])

  // 构建AI页面上下文
  const pageContext = useMemo(() => {
    // 从valuation获取市值和PE/PB
    const metrics = valuation?.metrics
    const stockInfo = (valuation as any)?.stock_info

    // 从radar获取综合评分和详细指标
    const compositeScore = radar?.composite_score
    const scoreBreakdown = radar?.score_breakdown

    // 从dupont历史获取最新年份的ROE等
    const latestDupont = dupont?.history?.slice(-1)[0]

    // 从risk获取风险等级
    const riskLevel = risk?.fraud_detection?.risk_level
    const fraudScore = risk?.fraud_detection?.m_score
    const warnings = risk?.warnings?.map(w => w.detail)
    const healthScore = risk?.health_score

    // 从growth获取增长率
    const revenueGrowth = growth?.cagr?.revenue_3yr

    // 从dcf获取估值
    const dcfValue = dcf?.intrinsic_value

    // 从peBand获取分位数
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
        revenueGrowth: revenueGrowth,
        debtRatio: scoreBreakdown?.financial_health?.debt_ratio,
        compositeScore: compositeScore,
        latestYear: latestDupont?.year
      },
      riskIndicators: {
        riskLevel: riskLevel,
        fraudScore: fraudScore,
        warnings: warnings,
        healthScore: healthScore
      },
      valuation: {
        dcfValue: dcfValue,
        pePercentile: pePercentile,
        pbPercentile: pbPercentile,
        industryPe: metrics?.industry_pe,
        fairValue: undefined
      },
      timeRange: timeRange,
      additionalInfo: {
        industry: stockInfo?.industry,
        sector: stockInfo?.sector,
        hasData: !financialLoading && (radar || dupont)
      }
    }
  }, [radar, dupont, dcf, peBand, growth, risk, valuation, financialLoading, timeRange])

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-surface-low w-1/3" />
            <div className="h-96 bg-surface-low" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !priceData?.success) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl text-center py-12">
          <p className="text-destructive">加载失败，股票代码 &ldquo;{decodedSymbol}&rdquo; 可能不存在</p>
          <Link href="/stock">
            <Button variant="outline" className="mt-4 !rounded-none">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回搜索
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const priceInfo = priceData.data
  const stockName = searchData?.results?.[0]?.name || decodedSymbol

  // Get latest price info
  const latestPrice = priceInfo?.close?.slice(-1)[0]
  const prevPrice = priceInfo?.close?.slice(-2)[0]
  const priceChange = latestPrice && prevPrice ? latestPrice - prevPrice : null
  const priceChangePct = latestPrice && prevPrice ? ((latestPrice - prevPrice) / prevPrice) * 100 : null

  const isUp = priceChangePct !== null && priceChangePct >= 0

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/stock">
              <Button variant="ghost" size="sm" className="text-muted-foreground !rounded-none">
                <ArrowLeft className="h-4 w-4 mr-1" />
                返回
              </Button>
            </Link>
            <div>
              <h1 className="font-editorial text-xl tracking-tight text-foreground">
                {stockName}
                <span className="text-sm text-link ml-2 font-mono font-sans">{decodedSymbol}</span>
              </h1>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshPrice()}
            className="!rounded-none"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
        </div>

        {/* Price Info Card */}
        <div className="bg-surface-low p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-semibold font-mono">
                  ¥{latestPrice?.toFixed(2) || '-'}
                </span>
                {priceChangePct !== null && (
                  <Badge className={`!rounded-none ${isUp ? 'bg-up/20 text-up' : 'bg-down/20 text-down'}`}>
                    {isUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {isUp ? '+' : ''}{priceChange?.toFixed(2)} ({isUp ? '+' : ''}{priceChangePct.toFixed(2)}%)
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                最新交易日: {priceInfo?.dates?.slice(-1)[0] || '-'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">今日区间</div>
              <div className="font-mono text-sm">
                {priceInfo?.low?.slice(-1)[0]?.toFixed(2)} - {priceInfo?.high?.slice(-1)[0]?.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">成交量</div>
              <div className="font-mono text-sm">
                {priceInfo?.volume?.slice(-1)[0] ? (priceInfo.volume.slice(-1)[0] / 10000).toFixed(0) + '万' : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Price Chart */}
        <div className="bg-surface-low p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-editorial text-sm tracking-tight text-muted-foreground">
              股价走势
            </h3>
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
          <PriceChart
            data={priceInfo}
            timeRange={timeRange}
            isDark={mounted && resolvedTheme === 'dark'}
          />
        </div>

        {/* Statistics */}
        <div className="bg-surface-low p-5 mb-6">
          <h3 className="font-editorial text-sm tracking-tight text-muted-foreground mb-4">
            区间统计
          </h3>
          <StatisticsCards data={priceInfo} timeRange={timeRange} />
        </div>

        {/* Financial Analysis Module */}
        <div className="mt-8">
          <FinancialAnalysis
            stockCode={decodedSymbol}
            stockName={stockName}
            isDark={mounted && resolvedTheme === 'dark'}
          />
        </div>
      </div>

      {/* AI Chat Assistant */}
      <StockAIChat
        stockCode={decodedSymbol}
        stockName={stockName}
        priceData={{
          latestPrice,
          priceChange,
          priceChangePct,
          dates: priceInfo?.dates,
          closes: priceInfo?.close
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
  data?: {
    dates: string[]
    open: number[]
    close: number[]
    high: number[]
    low: number[]
    volume: number[]
    change_pct?: number[]
  }
  timeRange: '1M' | '3M' | '6M' | '1Y'
  isDark: boolean
}) {
  if (!data?.dates?.length) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        暂无数据
      </div>
    )
  }

  const colors = getChartColors(isDark)

  // Calculate slice based on time range
  const rangeDays = { '1M': 22, '3M': 66, '6M': 132, '1Y': 252 }[timeRange]
  const sliceStart = Math.max(0, data.dates.length - rangeDays)

  const dates = data.dates.slice(sliceStart)
  const closes = data.close.slice(sliceStart)
  const volumes = data.volume.slice(sliceStart)

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
      formatter: (params: any) => {
        const p = params[0]
        return `
          <div style="font-weight: 500">${p.axisValue}</div>
          <div style="margin-top: 4px">收盘: <span style="font-family: monospace">¥${p.value.toFixed(2)}</span></div>
        `
      }
    },
    xAxis: {
      type: 'category' as const,
      data: dates,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: colors.muted,
        fontSize: 10,
        interval: Math.floor(dates.length / 4)
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
        formatter: (v: number) => v.toFixed(0)
      },
      splitLine: {
        lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
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
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59,130,246,0.3)' },
              { offset: 1, color: 'rgba(59,130,246,0.01)' }
            ]
          }
        },
      },
    ],
  }

  return (
    <div style={{ height: 320 }}>
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  )
}

function StatisticsCards({
  data,
  timeRange
}: {
  data?: {
    close: number[]
    high: number[]
    low: number[]
    volume: number[]
  }
  timeRange: '1M' | '3M' | '6M' | '1Y'
}) {
  if (!data?.close?.length) return null

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
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length

  const stats = [
    { label: '区间涨跌幅', value: `${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)}%`, color: totalChange >= 0 ? 'text-up' : 'text-down' },
    { label: '最高价', value: `¥${maxPrice.toFixed(2)}` },
    { label: '最低价', value: `¥${minPrice.toFixed(2)}` },
    { label: '平均成交量', value: `${(avgVolume / 10000).toFixed(0)}万` },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-surface-high">
      {stats.map((stat, idx) => (
        <div key={stat.label} className={`text-center p-4 ${idx % 2 === 0 ? 'bg-surface-low' : 'bg-surface-float'}`}>
          <div className="text-xs text-muted-foreground mb-1">{stat.label}</div>
          <div className={`font-mono font-medium ${stat.color || ''}`}>{stat.value}</div>
        </div>
      ))}
    </div>
  )
}
