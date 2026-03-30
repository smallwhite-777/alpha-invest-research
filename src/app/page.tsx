'use client'

import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import useSWR from 'swr'
import { cn } from '@/lib/utils'

// API fetcher
const fetcher = async (url: string) => {
  const PYTHON_BACKEND = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:5001'
  const res = await fetch(`${PYTHON_BACKEND}${url}`)
  if (!res.ok) throw new Error('Network error')
  return res.json()
}

const prismaFetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Network error')
  return res.json()
}

// Types
interface MacroIndicator {
  code: string
  name: string
  value: number
  change: number
  date?: string
}

interface Sector {
  name: string
  ticker: string
  change: number
  leading_stock?: string
  leading_change?: number
}

interface Insight {
  id: string
  title: string
  content: string
  category: string
  importance: number
  createdAt: string
  tags?: { name: string }[]
  sector?: string
}

interface MacroResponse {
  success: boolean
  indicators: MacroIndicator[]
  last_updated: string
}

interface SectorResponse {
  success: boolean
  sectors: Sector[]
  last_updated: string
}

interface InsightsResponse {
  items: Insight[]
  total: number
}

// ==================== MAIN PAGE ====================
export default function Dashboard() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === 'dark'

  // Fetch real data from APIs
  const { data: macroData, isLoading: macroLoading } = useSWR<MacroResponse>(
    '/api/macro/indicators',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 } // 10 min cache
  )

  const { data: sectorData, isLoading: sectorLoading } = useSWR<SectorResponse>(
    '/api/market/sectors',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 } // 5 min cache
  )

  const { data: insightsData, isLoading: insightsLoading } = useSWR<InsightsResponse>(
    '/api/intelligence?limit=5',
    prismaFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )

  if (!mounted) return null

  // Fallback data when API fails or loading
  const fallbackMacro: MacroIndicator[] = [
    { code: 'M2_YOY', name: 'M2 同比', value: 8.1, change: 0.2 },
    { code: 'CPI_YOY', name: 'CPI 同比', value: 0.7, change: -0.1 },
    { code: 'PMI_MFG', name: '制造业 PMI', value: 50.8, change: 0.5 },
    { code: 'PMI_SERVICE', name: '非制造业 PMI', value: 52.3, change: 0.3 },
    { code: '10Y_YIELD', name: '10年期国债', value: 2.35, change: -0.02 },
    { code: 'USD_CNY', name: '美元/人民币', value: 7.24, change: 0.01 },
  ]

  const fallbackSectors: Sector[] = [
    { name: '半导体', ticker: 'BK0890', change: 2.45 },
    { name: 'AI算力', ticker: 'BK0801', change: 3.10 },
    { name: '新能源', ticker: 'BK0493', change: -0.50 },
    { name: '白酒', ticker: 'BK0896', change: 1.25 },
  ]

  const indicators = macroData?.success ? macroData.indicators : fallbackMacro
  const sectors = sectorData?.success ? sectorData.sectors : fallbackSectors
  const insights = insightsData?.items || []

  // Generate mock chart data (keep this for now as correlation analysis needs historical data)
  const generateMockData = (base: number, volatility: number) => {
    return Array.from({ length: 12 }, (_, i) => ({
      date: `2025-${String(i + 1).padStart(2, '0')}`,
      value: base + (Math.random() - 0.5) * volatility * 2,
    }))
  }

  const chartLabels = [
    { labelX: 'M2 增速', labelY: '沪深300', corrLabel: '+0.65' },
    { labelX: '费城半导体 (SOX)', labelY: 'AI 算力龙头营收增速', corrLabel: '+0.88' },
    { labelX: 'LME 铜价', labelY: '中国制造业 PMI', corrLabel: '+0.52' },
  ]

  const textColor = isDark ? '#636366' : '#8e8e93'

  return (
    <div className="h-full p-4 flex flex-col overflow-hidden gap-4">
      {/* Row 1: Macro Indicators */}
      <div className="rounded-2xl border border-border bg-card p-5 card-elevated shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Macro Indicators
            </span>
            <span className="text-xs text-up flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-up rounded-full animate-pulse" />
              Live
            </span>
            {macroLoading && (
              <span className="text-xs text-muted-foreground">加载中...</span>
            )}
          </div>
          <Link href="/macro" className="text-sm text-muted-foreground hover:text-foreground transition">
            全部 →
          </Link>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {indicators.map((indicator, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-border hover:bg-accent/50 transition-all duration-200 cursor-pointer"
            >
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium truncate">
                {indicator.code}
              </div>
              <div className="text-lg font-semibold tabular-nums tracking-tight">
                {indicator.value.toFixed(2)}
              </div>
              <div className={cn(
                'text-sm font-medium tabular-nums mt-0.5',
                indicator.change >= 0 ? 'text-up' : 'text-down'
              )}>
                {indicator.change >= 0 ? '↑' : '↓'} {Math.abs(indicator.change).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 1.5: Quick Actions */}
      <div className="grid grid-cols-2 gap-4 shrink-0">
        <Link href="/news" className="group">
          <div className="rounded-2xl border border-border bg-card p-5 card-elevated hover:bg-accent/50 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground group-hover:text-link transition-colors">实时新闻</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">AlphaEar-News 市场热点追踪</p>
                </div>
              </div>
              <span className="text-muted-foreground group-hover:text-link transition-colors">→</span>
            </div>
          </div>
        </Link>
        <Link href="/stock" className="group">
          <div className="rounded-2xl border border-border bg-card p-5 card-elevated hover:bg-accent/50 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground group-hover:text-link transition-colors">股价数据</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">AlphaEar-Stock 实时行情查询</p>
                </div>
              </div>
              <span className="text-muted-foreground group-hover:text-link transition-colors">→</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Row 2: Charts + Insights */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left: Charts + Sectors */}
        <div className="col-span-12 lg:col-span-9 flex flex-col gap-4 min-h-0">
          {/* Time Series Charts */}
          <div className="rounded-2xl border border-border bg-card p-5 card-elevated">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Time Series Analysis & Correlation
              </span>
              <Link href="/macro" className="text-sm text-muted-foreground hover:text-foreground transition">
                高级分析 →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {chartLabels.map((label, idx) => {
                const dataX = generateMockData(100, 20)
                const dataY = generateMockData(100, 15)
                const dates = dataX.map(d => d.date)

                const option = {
                  grid: { left: 8, right: 8, top: 10, bottom: 24 },
                  tooltip: {
                    trigger: 'axis' as const,
                    backgroundColor: isDark ? 'rgba(18,18,20,0.94)' : 'rgba(255,255,255,0.94)',
                    borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                    borderWidth: 1,
                    padding: 10,
                    textStyle: { fontSize: 12, color: isDark ? '#f5f5f7' : '#1c1c1e' },
                  },
                  xAxis: {
                    type: 'category' as const,
                    data: dates,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                      color: textColor,
                      fontSize: 10,
                      interval: Math.max(Math.floor(dates.length / 3) - 1, 0),
                    },
                    splitLine: { show: false },
                  },
                  yAxis: {
                    type: 'value' as const,
                    show: false,
                    min: 70,
                    max: 130,
                  },
                  series: [
                    {
                      name: label.labelX,
                      type: 'line' as const,
                      data: dataX.map(d => d.value),
                      smooth: true,
                      symbol: 'none',
                      lineStyle: { color: '#3b82f6', width: 2 },
                      areaStyle: { color: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.10)' },
                    },
                    {
                      name: label.labelY,
                      type: 'line' as const,
                      data: dataY.map(d => d.value),
                      smooth: true,
                      symbol: 'none',
                      lineStyle: { color: '#ef4444', width: 2 },
                      areaStyle: { color: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.10)' },
                    },
                  ],
                }

                return (
                  <div key={idx} className="flex flex-col border border-border rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-medium text-blue-400 truncate">
                          {label.labelX}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">vs</span>
                        <span className="text-xs font-medium text-red-400 truncate">
                          {label.labelY}
                        </span>
                      </div>
                      <span className={cn(
                        'text-sm font-semibold tabular-nums shrink-0 ml-2',
                        label.corrLabel.startsWith('+') ? 'text-up' : 'text-down'
                      )}>
                        r={label.corrLabel}
                      </span>
                    </div>
                    <div style={{ height: 160 }}>
                      <ReactECharts
                        option={option}
                        style={{ height: '100%', width: '100%' }}
                        opts={{ renderer: 'canvas' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sector Performance */}
          <div className="rounded-2xl border border-border bg-card p-5 card-elevated shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Sector Performance
                </span>
                {sectorLoading && (
                  <span className="text-xs text-muted-foreground">加载中...</span>
                )}
              </div>
              <Link href="/stock" className="text-sm text-muted-foreground hover:text-foreground transition">
                全部 →
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {sectors.map(sector => {
                const isUp = sector.change > 0
                return (
                  <div
                    key={sector.ticker}
                    className="p-4 rounded-xl border border-border hover:bg-accent/50 transition-all duration-200"
                  >
                    <div className="text-sm font-medium truncate mb-1">{sector.name}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{sector.ticker}</span>
                      <span className={cn(
                        'text-base font-semibold tabular-nums',
                        isUp ? 'text-up' : 'text-down'
                      )}>
                        {isUp ? '+' : ''}{sector.change.toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full bg-accent rounded-full h-1 mt-2">
                      <div
                        className={cn('h-1 rounded-full transition-all', isUp ? 'bg-up' : 'bg-down')}
                        style={{ width: `${Math.min(Math.abs(sector.change) * 20, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Insights Feed */}
        <div className="col-span-12 lg:col-span-3 flex flex-col min-h-0">
          <div className="rounded-2xl border border-border bg-card p-5 h-full flex flex-col card-elevated">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Alpha Insights
                </span>
                <span className="text-xs px-2 py-0.5 rounded-lg bg-destructive/10 text-destructive font-semibold tabular-nums">
                  {insights.length || 0}
                </span>
                {insightsLoading && (
                  <span className="text-xs text-muted-foreground">加载中...</span>
                )}
              </div>
              <Link href="/intelligence" className="text-sm text-muted-foreground hover:text-foreground transition">
                全部 →
              </Link>
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {insights.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-sm">暂无情报数据</p>
                  <Link href="/intelligence/create" className="text-xs text-link hover:underline mt-2 block">
                    创建新情报
                  </Link>
                </div>
              ) : (
                insights.map((item) => {
                  const impColors: Record<number, string> = {
                    5: 'bg-red-500',
                    4: 'bg-orange-500',
                    3: 'bg-yellow-500',
                    2: 'bg-blue-500',
                    1: 'bg-zinc-500',
                  }
                  const impLevel = item.importance || 1
                  const dotColor = impColors[impLevel] || 'bg-zinc-500'
                  const catLabel = item.category.replace(/_/g, ' ')

                  const date = new Date(item.createdAt)
                  const formatDate = (d: Date) => {
                    const now = new Date()
                    const diff = now.getTime() - d.getTime()
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                    if (days === 0) return '今天'
                    if (days === 1) return '昨天'
                    return `${d.getMonth() + 1}月${d.getDate()}日`
                  }

                  return (
                    <Link
                      key={item.id}
                      href={`/intelligence/${item.id}`}
                      className="group block p-4 rounded-xl border border-border hover:bg-accent/50 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn('w-2 h-2 rounded-full shrink-0', dotColor)} />
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                          {catLabel}
                        </span>
                        {item.sector && (
                          <span className="text-xs text-muted-foreground/70">· {item.sector}</span>
                        )}
                      </div>
                      <h3 className="text-base font-medium mb-1.5 group-hover:opacity-80 transition leading-snug line-clamp-2 tracking-tight">
                        {item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {item.content?.replace(/[#*`]/g, '').slice(0, 150)}
                      </p>
                      <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                        <span>{formatDate(date)}</span>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex gap-1.5">
                            {item.tags.slice(0, 3).map((t, i) => (
                              <span key={i} className="text-xs text-muted-foreground/70">
                                {typeof t === 'string' ? t : t?.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}