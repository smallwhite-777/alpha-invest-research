'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import type { MacroIndicator } from '@/types/macro'
import { ClientErrorBoundary } from '@/components/ui/ClientErrorBoundary'

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => null,
})

interface MacroSeriesGroup {
  indicatorCode: string
  data: Array<{ date: string; value: number }>
}

interface Sector {
  name: string
  ticker: string
  change: number
}

interface Insight {
  id: string
  title: string
  category: string
  importance: number
  createdAt: string
}

interface MacroCardItem {
  code: string
  label: string
}

const PYTHON_BACKEND = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:5003'

const HOME_MACRO_ITEMS: MacroCardItem[] = [
  { code: 'CN_M2_YOY', label: '中国 M2 同比' },
  { code: 'PMI_CHN', label: '中国制造业 PMI' },
  { code: 'CN_CPI_NT_YOY', label: '中国 CPI 同比' },
  { code: 'CN_PPI_YOY', label: '中国 PPI 同比' },
  { code: 'US_DFF_M', label: '美国联邦基金利率' },
  { code: 'US_DGS10_M', label: '美国 10 年国债收益率' },
]

const HOME_CHART_PAIRS = [
  { codeX: 'CN_M2_YOY', codeY: 'PMI_CHN', title: '中国流动性 vs 制造业景气' },
  { codeX: 'CN_PPI_YOY', codeY: 'US_DCOILBRENTEU_M', title: '中国 PPI vs 布伦特原油' },
  { codeX: 'US_DFF_M', codeY: 'US_DGS10_M', title: '美联储政策利率 vs 美债长端利率' },
]

const jsonFetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const pythonFetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(`${PYTHON_BACKEND}${url}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function pearsonCorrelation(valuesX: number[], valuesY: number[]): number {
  const n = valuesX.length
  if (n < 2 || n !== valuesY.length) return 0

  const sumX = valuesX.reduce((acc, value) => acc + value, 0)
  const sumY = valuesY.reduce((acc, value) => acc + value, 0)
  const sumXY = valuesX.reduce((acc, value, index) => acc + value * valuesY[index], 0)
  const sumX2 = valuesX.reduce((acc, value) => acc + value * value, 0)
  const sumY2 = valuesY.reduce((acc, value) => acc + value * value, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  return denominator === 0 ? 0 : numerator / denominator
}

function normalizeValues(values: number[]) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  return values.map((value) => ((value - min) / range) * 100)
}

function getLatestChange(points: Array<{ date: string; value: number }>) {
  const latest = points.at(-1)?.value
  const previous = points.at(-2)?.value
  if (latest === undefined || previous === undefined) return 0
  return latest - previous
}

function formatMacroValue(value: number, unit: string) {
  if (!Number.isFinite(value)) return '-'
  if (Math.abs(value) >= 1000 && unit !== '%') return value.toFixed(0)
  return value.toFixed(2)
}

function alignSeries(
  seriesX: Array<{ date: string; value: number }>,
  seriesY: Array<{ date: string; value: number }>
) {
  const toMonthKey = (date: string) => date.slice(0, 7)
  const monthlyX = new Map<string, { date: string; value: number }>()
  const monthlyY = new Map<string, { date: string; value: number }>()

  for (const item of seriesX) {
    monthlyX.set(toMonthKey(item.date), item)
  }

  for (const item of seriesY) {
    monthlyY.set(toMonthKey(item.date), item)
  }

  const points = Array.from(monthlyX.entries())
    .filter(([month]) => monthlyY.has(month))
    .map(([month, itemX]) => {
      const itemY = monthlyY.get(month)!
      return {
        date: itemX.date > itemY.date ? itemX.date : itemY.date,
        x: itemX.value,
        y: itemY.value,
      }
    })
    .sort((left, right) => left.date.localeCompare(right.date))

  return points.slice(-36)
}

export default function Dashboard() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const currentTime = useMemo(() => Date.now(), [])

  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'
  const indicatorCodes = useMemo(
    () =>
      Array.from(
        new Set([
          ...HOME_MACRO_ITEMS.map((item) => item.code),
          ...HOME_CHART_PAIRS.flatMap((pair) => [pair.codeX, pair.codeY]),
        ])
      ).join(','),
    []
  )

  const { data: indicatorList = [], isLoading: macroLoading } = useSWR<MacroIndicator[]>(
    '/api/macro/indicators',
    jsonFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )
  const { data: macroGroups = [] } = useSWR<MacroSeriesGroup[]>(
    `/api/macro/data?codes=${indicatorCodes}&limit=240`,
    jsonFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )
  const { data: sectorData, isLoading: sectorLoading } = useSWR<{ success: boolean; sectors: Sector[] }>(
    '/api/market/sectors',
    pythonFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )
  const { data: insightsData, isLoading: insightsLoading } = useSWR<{ items: Insight[] }>(
    '/api/intelligence?limit=6',
    jsonFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )

  const groupMap = useMemo(
    () => new Map(macroGroups.map((group) => [group.indicatorCode, group.data])),
    [macroGroups]
  )

  const macroCards = HOME_MACRO_ITEMS.map((item) => {
    const indicator = indicatorList.find((entry) => entry.code === item.code)
    const points = groupMap.get(item.code) || []
    const latest = points.at(-1)

    return {
      code: item.code,
      label: indicator?.name || item.label,
      unit: indicator?.unit || '',
      value: latest?.value,
      change: getLatestChange(points),
    }
  })

  if (!mounted) return null

  const sectors = sectorData?.success ? sectorData.sectors : []
  const insights = insightsData?.items || []
  const fgColor = isDark ? '#8a8d82' : '#74796d'
  const tooltipBg = isDark ? 'rgba(28,28,26,0.96)' : 'rgba(255,255,255,0.96)'
  const tooltipFg = isDark ? '#e4e2dd' : '#1b1c19'

  return (
    <div className="h-full overflow-hidden">
      <div className="grid h-full grid-cols-2 grid-rows-2 gap-px bg-surface-high">
        <section className="bg-surface overflow-y-auto p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-editorial text-base text-foreground">宏观指标</h2>
              <span className="flex items-center gap-1 text-xs text-up">
                <span className="h-1.5 w-1.5 animate-pulse bg-up" />
                本地宏观数据
              </span>
              {macroLoading ? <span className="text-xs text-muted-foreground">加载中...</span> : null}
            </div>
            <Link href="/macro" className="text-xs text-muted-foreground transition hover:text-foreground">
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-px bg-surface-high">
            {macroCards.map((item) => (
              <div key={item.code} className="cursor-pointer bg-surface p-4 transition-colors hover:bg-surface-low">
                <div className="mb-2 text-xs font-medium text-muted-foreground">{item.label}</div>
                <div className="text-xl font-semibold tracking-tight tabular-nums">
                  {item.value === undefined ? '-' : formatMacroValue(item.value, item.unit)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{item.unit}</div>
                <div className={cn('mt-1 text-sm font-medium tabular-nums', item.change >= 0 ? 'text-up' : 'text-down')}>
                  {item.change >= 0 ? '↑' : '↓'} {Math.abs(item.change).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-surface overflow-y-auto p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-editorial text-base text-foreground">情报动态</h2>
              <span className="bg-surface-high px-1.5 py-0.5 text-xs text-muted-foreground tabular-nums">{insights.length}</span>
              {insightsLoading ? <span className="text-xs text-muted-foreground">加载中...</span> : null}
            </div>
            <Link href="/intelligence" className="text-xs text-muted-foreground transition hover:text-foreground">
              全部 →
            </Link>
          </div>
          <div className="space-y-0">
            {insights.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-sm">暂无情报数据</p>
                <Link href="/intelligence/create" className="mt-2 block text-xs text-secondary hover:underline">
                  创建新情报
                </Link>
              </div>
            ) : (
              insights.map((item, index) => {
                const date = new Date(item.createdAt)
                const days = Math.floor((currentTime - date.getTime()) / 86400000)
                const dateLabel = days === 0 ? '今天' : days === 1 ? '昨天' : `${date.getMonth() + 1}月${date.getDate()}日`
                const importanceColor: Record<number, string> = {
                  5: 'bg-down',
                  4: 'bg-warning',
                  3: 'bg-chart-3',
                  2: 'bg-chart-2',
                  1: 'bg-muted-foreground',
                }

                return (
                  <Link
                    key={item.id}
                    href={`/intelligence/${item.id}`}
                    className={cn('group block px-4 py-3 transition-colors hover:bg-surface-high', index % 2 === 1 && 'bg-surface-low')}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <div className={cn('h-1.5 w-1.5 shrink-0', importanceColor[item.importance || 1] || 'bg-muted-foreground')} />
                      <span className="text-xs font-medium text-muted-foreground">{item.category.replace(/_/g, ' ')}</span>
                      <span className="ml-auto text-xs text-muted-foreground/50">{dateLabel}</span>
                    </div>
                    <h3 className="line-clamp-1 text-sm font-medium leading-snug transition group-hover:opacity-80">{item.title}</h3>
                  </Link>
                )
              })
            )}
          </div>
        </section>

        <section className="bg-surface overflow-y-auto p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-editorial text-base text-foreground">时序相关性</h2>
            <Link href="/macro" className="text-xs text-muted-foreground transition hover:text-foreground">
              高级分析 →
            </Link>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            说明：按月对齐后，各序列单独归一化到 0-100 仅用于比较趋势；相关系数 r 基于原始值计算。
          </p>
          <div className="grid grid-cols-3 gap-3">
            {HOME_CHART_PAIRS.map((pair) => {
              const indicatorX = indicatorList.find((item) => item.code === pair.codeX)
              const indicatorY = indicatorList.find((item) => item.code === pair.codeY)
              const aligned = alignSeries(groupMap.get(pair.codeX) || [], groupMap.get(pair.codeY) || [])
              const valuesX = aligned.map((item) => item.x)
              const valuesY = aligned.map((item) => item.y)
              const dates = aligned.map((item) => item.date.slice(0, 7))
              const correlation = aligned.length >= 3 ? pearsonCorrelation(valuesX, valuesY) : 0

              const option = {
                grid: { left: 4, right: 4, top: 8, bottom: 20 },
                tooltip: {
                  trigger: 'axis' as const,
                  backgroundColor: tooltipBg,
                  borderColor: 'transparent',
                  borderWidth: 0,
                  padding: 10,
                  textStyle: { fontSize: 10, color: tooltipFg },
                },
                xAxis: {
                  type: 'category' as const,
                  data: dates,
                  axisLine: { show: false },
                  axisTick: { show: false },
                  axisLabel: {
                    color: fgColor,
                    fontSize: 9,
                    interval: Math.max(Math.floor(dates.length / 3) - 1, 0),
                  },
                },
                yAxis: { type: 'value' as const, show: false },
                series: [
                  {
                    name: indicatorX?.name || pair.codeX,
                    type: 'line' as const,
                    data: valuesX.length ? normalizeValues(valuesX) : [],
                    smooth: false,
                    symbol: 'none',
                    lineStyle: { color: isDark ? '#6fa888' : '#001629', width: 1.5 },
                    areaStyle: { color: isDark ? 'rgba(111,168,136,0.08)' : 'rgba(0,22,41,0.06)' },
                  },
                  {
                    name: indicatorY?.name || pair.codeY,
                    type: 'line' as const,
                    data: valuesY.length ? normalizeValues(valuesY) : [],
                    smooth: false,
                    symbol: 'none',
                    lineStyle: { color: isDark ? '#c65d65' : '#58040f', width: 1.5 },
                    areaStyle: { color: isDark ? 'rgba(198,93,101,0.08)' : 'rgba(88,4,15,0.06)' },
                  },
                ],
              }

              return (
                <div key={pair.title} className="bg-surface-low p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="min-w-0 text-xs">
                      <div className="mb-0.5 truncate font-medium text-foreground">{pair.title}</div>
                      <div className="truncate text-muted-foreground">
                        {(indicatorX?.name || pair.codeX)} / {(indicatorY?.name || pair.codeY)}
                      </div>
                    </div>
                    <span className={cn('shrink-0 text-sm font-semibold tabular-nums', correlation >= 0 ? 'text-up' : 'text-down')}>
                      r={correlation >= 0 ? '+' : ''}
                      {correlation.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: 130 }}>
                    <ClientErrorBoundary>
                      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
                    </ClientErrorBoundary>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="bg-surface overflow-y-auto p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-editorial text-base text-foreground">板块表现</h2>
              {sectorLoading ? <span className="text-xs text-muted-foreground">加载中...</span> : null}
            </div>
            <Link href="/stock" className="text-xs text-muted-foreground transition hover:text-foreground">
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-px bg-surface-high">
            {sectors.map((sector) => {
              const isUp = sector.change > 0
              return (
                <div key={sector.ticker} className="cursor-pointer bg-surface p-4 transition-colors hover:bg-surface-low">
                  <div className="mb-1 text-sm font-medium">{sector.name}</div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">{sector.ticker}</span>
                    <span className={cn('text-lg font-semibold tabular-nums', isUp ? 'text-up' : 'text-down')}>
                      {isUp ? '+' : ''}
                      {sector.change.toFixed(2)}%
                    </span>
                  </div>
                  <div className="mt-3 h-0.5 w-full bg-surface-high">
                    <div
                      className={cn('h-0.5 transition-all', isUp ? 'bg-up' : 'bg-down')}
                      style={{ width: `${Math.min(Math.abs(sector.change) * 20, 100)}%` }}
                    />
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
