'use client'

import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import useSWR from 'swr'
import { cn } from '@/lib/utils'

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

interface MacroIndicator { code: string; name: string; value: number; change: number; date?: string }
interface Sector { name: string; ticker: string; change: number; leading_stock?: string; leading_change?: number }
interface Insight { id: string; title: string; content: string; category: string; importance: number; createdAt: string; tags?: { name: string }[]; sector?: string }
interface MacroResponse { success: boolean; indicators: MacroIndicator[]; last_updated: string }
interface SectorResponse { success: boolean; sectors: Sector[]; last_updated: string }
interface InsightsResponse { items: Insight[]; total: number }

export default function Dashboard() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = resolvedTheme === 'dark'

  const { data: macroData, isLoading: macroLoading } = useSWR<MacroResponse>('/api/macro/indicators', fetcher, { revalidateOnFocus: false, dedupingInterval: 600000 })
  const { data: sectorData, isLoading: sectorLoading } = useSWR<SectorResponse>('/api/market/sectors', fetcher, { revalidateOnFocus: false, dedupingInterval: 300000 })
  const { data: insightsData, isLoading: insightsLoading } = useSWR<InsightsResponse>('/api/intelligence?limit=6', prismaFetcher, { revalidateOnFocus: false, dedupingInterval: 300000 })

  if (!mounted) return null

  const fallbackMacro: MacroIndicator[] = [
    { code: 'M2_YOY', name: 'M2 同比', value: 8.1, change: 0.2 },
    { code: 'CPI_YOY', name: 'CPI 同比', value: 0.7, change: -0.1 },
    { code: 'PMI_MFG', name: '制造业 PMI', value: 50.8, change: 0.5 },
    { code: 'PMI_SVC', name: '非制造业 PMI', value: 52.3, change: 0.3 },
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

  const generateMockData = (base: number, volatility: number) =>
    Array.from({ length: 12 }, (_, i) => ({ date: `2025-${String(i + 1).padStart(2, '0')}`, value: base + (Math.random() - 0.5) * volatility * 2 }))

  const chartLabels = [
    { labelX: 'M2 增速', labelY: '沪深300', corrLabel: '+0.65' },
    { labelX: '费城半导体', labelY: 'AI 算力营收', corrLabel: '+0.88' },
    { labelX: 'LME 铜价', labelY: '制造业 PMI', corrLabel: '+0.52' },
  ]

  const fgColor = isDark ? '#8a8d82' : '#74796d'
  const tooltipBg = isDark ? 'rgba(28,28,26,0.96)' : 'rgba(255,255,255,0.96)'
  const tooltipFg = isDark ? '#e4e2dd' : '#1b1c19'
  const lineA = isDark ? '#6fa888' : '#001629'
  const lineB = isDark ? '#c65d65' : '#58040f'
  const areaA = isDark ? 'rgba(111,168,136,0.08)' : 'rgba(0,22,41,0.06)'
  const areaB = isDark ? 'rgba(198,93,101,0.08)' : 'rgba(88,4,15,0.06)'

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full grid grid-rows-2 grid-cols-2 gap-px bg-surface-high">

        {/* ========= 左上：宏观指标 ========= */}
        <section className="bg-surface overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-editorial text-base text-foreground">宏观指标</h2>
              <span className="text-xs text-up flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-up animate-pulse" />
                实时
              </span>
              {macroLoading && <span className="text-xs text-muted-foreground">加载中...</span>}
            </div>
            <Link href="/macro" className="text-xs text-muted-foreground hover:text-foreground transition">
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-px bg-surface-high">
            {indicators.map((indicator, idx) => (
              <div key={idx} className="bg-surface p-4 hover:bg-surface-low transition-colors cursor-pointer">
                <div className="text-xs text-muted-foreground mb-2 font-medium">{indicator.name}</div>
                <div className="text-xl font-semibold tabular-nums tracking-tight">{indicator.value.toFixed(2)}</div>
                <div className={cn('text-sm font-medium tabular-nums mt-1', indicator.change >= 0 ? 'text-up' : 'text-down')}>
                  {indicator.change >= 0 ? '↑' : '↓'} {Math.abs(indicator.change).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========= 右上：情报动态 ========= */}
        <section className="bg-surface overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-editorial text-base text-foreground">情报动态</h2>
              <span className="text-xs px-1.5 py-0.5 bg-surface-high text-muted-foreground tabular-nums">{insights.length}</span>
              {insightsLoading && <span className="text-xs text-muted-foreground">加载中...</span>}
            </div>
            <Link href="/intelligence" className="text-xs text-muted-foreground hover:text-foreground transition">
              全部 →
            </Link>
          </div>
          <div className="space-y-0">
            {insights.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">暂无情报数据</p>
                <Link href="/intelligence/create" className="text-xs text-secondary hover:underline mt-2 block">创建新情报</Link>
              </div>
            ) : (
              insights.map((item, idx) => {
                const impColors: Record<number, string> = { 5: 'bg-down', 4: 'bg-warning', 3: 'bg-chart-3', 2: 'bg-chart-2', 1: 'bg-muted-foreground' }
                const dotColor = impColors[item.importance || 1] || 'bg-muted-foreground'
                const catLabel = item.category.replace(/_/g, ' ')
                const date = new Date(item.createdAt)
                const days = Math.floor((Date.now() - date.getTime()) / 86400000)
                const dateStr = days === 0 ? '今天' : days === 1 ? '昨天' : `${date.getMonth() + 1}月${date.getDate()}日`

                return (
                  <Link key={item.id} href={`/intelligence/${item.id}`}
                    className={cn('group block px-4 py-3 hover:bg-surface-high transition-colors', idx % 2 === 1 && 'bg-surface-low')}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('w-1.5 h-1.5 shrink-0', dotColor)} />
                      <span className="text-xs text-muted-foreground font-medium">{catLabel}</span>
                      <span className="text-xs text-muted-foreground/50 ml-auto">{dateStr}</span>
                    </div>
                    <h3 className="text-sm font-medium leading-snug line-clamp-1 group-hover:opacity-80 transition">{item.title}</h3>
                  </Link>
                )
              })
            )}
          </div>
        </section>

        {/* ========= 左下：时序相关性分析 ========= */}
        <section className="bg-surface overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-editorial text-base text-foreground">时序相关性</h2>
            <Link href="/macro" className="text-xs text-muted-foreground hover:text-foreground transition">
              高级分析 →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {chartLabels.map((label, idx) => {
              const dataX = generateMockData(100, 20)
              const dataY = generateMockData(100, 15)
              const dates = dataX.map(d => d.date)
              const option = {
                grid: { left: 4, right: 4, top: 8, bottom: 20 },
                tooltip: {
                  trigger: 'axis' as const, backgroundColor: tooltipBg, borderColor: 'transparent', borderWidth: 0,
                  padding: 10, textStyle: { fontSize: 10, color: tooltipFg }, extraCssText: 'box-shadow: 0 0 40px rgba(27,28,25,0.06);',
                },
                xAxis: {
                  type: 'category' as const, data: dates, axisLine: { show: false }, axisTick: { show: false },
                  axisLabel: { color: fgColor, fontSize: 9, interval: Math.max(Math.floor(dates.length / 3) - 1, 0) }, splitLine: { show: false },
                },
                yAxis: { type: 'value' as const, show: false, min: 70, max: 130 },
                series: [
                  { name: label.labelX, type: 'line' as const, data: dataX.map(d => d.value), smooth: false, symbol: 'none', lineStyle: { color: lineA, width: 1.5 }, areaStyle: { color: areaA } },
                  { name: label.labelY, type: 'line' as const, data: dataY.map(d => d.value), smooth: false, symbol: 'none', lineStyle: { color: lineB, width: 1.5 }, areaStyle: { color: areaB } },
                ],
              }
              return (
                <div key={idx} className="bg-surface-low p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col gap-0.5 min-w-0 text-xs">
                      <div className="flex items-center gap-1"><span className="w-2 h-0.5 shrink-0" style={{ background: lineA }} /><span className="truncate">{label.labelX}</span></div>
                      <div className="flex items-center gap-1"><span className="w-2 h-0.5 shrink-0" style={{ background: lineB }} /><span className="truncate">{label.labelY}</span></div>
                    </div>
                    <span className={cn('text-sm font-semibold tabular-nums shrink-0', label.corrLabel.startsWith('+') ? 'text-up' : 'text-down')}>
                      r={label.corrLabel}
                    </span>
                  </div>
                  <div style={{ height: 130 }}>
                    <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ========= 右下：板块表现 ========= */}
        <section className="bg-surface overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-editorial text-base text-foreground">板块表现</h2>
              {sectorLoading && <span className="text-xs text-muted-foreground">加载中...</span>}
            </div>
            <Link href="/stock" className="text-xs text-muted-foreground hover:text-foreground transition">
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-px bg-surface-high">
            {sectors.map((sector, idx) => {
              const isUp = sector.change > 0
              return (
                <div key={sector.ticker} className="bg-surface p-4 hover:bg-surface-low transition-colors cursor-pointer">
                  <div className="text-sm font-medium mb-1">{sector.name}</div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">{sector.ticker}</span>
                    <span className={cn('text-lg font-semibold tabular-nums', isUp ? 'text-up' : 'text-down')}>
                      {isUp ? '+' : ''}{sector.change.toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-high h-0.5 mt-3">
                    <div className={cn('h-0.5 transition-all', isUp ? 'bg-up' : 'bg-down')} style={{ width: `${Math.min(Math.abs(sector.change) * 20, 100)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

      </div>
    </div>
  )
}
