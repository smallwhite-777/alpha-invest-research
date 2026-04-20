'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import ReactECharts from 'echarts-for-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import type { MacroIndicator } from '@/types/macro'

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
  sector?: string
  tags?: { name?: string; tag?: { name?: string } }[]
}

const HOME_MACRO_CODES = [
  'CN_M2_YOY',
  'PMI_CHN',
  'CN_CPI_NT_YOY',
  'CN_PPI_YOY',
  'US_DFF_M',
  'US_DGS10_M',
]

const HOME_CHART_PAIRS = [
  { codeX: 'CN_M2_YOY', codeY: 'US_M2SL_M', title: '中美流动性' },
  { codeX: 'PMI_CHN', codeY: 'US_DGS10_M', title: '景气度 vs 美债利率' },
  { codeX: 'CN_PPI_YOY', codeY: 'US_DCOILBRENTEU_M', title: '工业价格 vs 原油' },
]

const MARKET_API = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:5003'

const jsonFetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const pythonFetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(`${MARKET_API}${url}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function normalizeValues(values: number[]) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  return values.map((value) => ((value - min) / range) * 100)
}

function pearsonCorrelation(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length)
  if (n < 2) return 0
  const xs = x.slice(-n)
  const ys = y.slice(-n)
  const sumX = xs.reduce((acc, value) => acc + value, 0)
  const sumY = ys.reduce((acc, value) => acc + value, 0)
  const sumXY = xs.reduce((acc, value, index) => acc + value * ys[index], 0)
  const sumX2 = xs.reduce((acc, value) => acc + value * value, 0)
  const sumY2 = ys.reduce((acc, value) => acc + value * value, 0)
  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  return denominator === 0 ? 0 : numerator / denominator
}

function latestChange(points: Array<{ date: string; value: number }>) {
  const latest = points.at(-1)?.value
  const previous = points.at(-2)?.value
  if (latest === undefined || previous === undefined || previous === 0) {
    return 0
  }
  return ((latest - previous) / Math.abs(previous)) * 100
}

function getTagName(tag: Insight['tags'][number]) {
  return tag?.name || tag?.tag?.name || ''
}

export default function Dashboard() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const { data: indicators = [] } = useSWR<MacroIndicator[]>('/api/macro/indicators', jsonFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  })

  const indicatorCodes = useMemo(
    () => Array.from(new Set([...HOME_MACRO_CODES, ...HOME_CHART_PAIRS.flatMap((pair) => [pair.codeX, pair.codeY])])).join(','),
    []
  )

  const { data: macroGroups = [] } = useSWR<MacroSeriesGroup[]>(
    `/api/macro/data?codes=${indicatorCodes}&limit=72`,
    jsonFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )

  const { data: sectorData } = useSWR<{ success: boolean; sectors: Sector[] }>(
    '/api/market/sectors',
    pythonFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )

  const { data: insightsData } = useSWR<{ items: Insight[] }>(
    '/api/intelligence?limit=6',
    jsonFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )

  const groupMap = useMemo(
    () => new Map(macroGroups.map((group) => [group.indicatorCode, group.data])),
    [macroGroups]
  )

  const topIndicators = HOME_MACRO_CODES
    .map((code) => {
      const indicator = indicators.find((item) => item.code === code)
      const points = groupMap.get(code) || []
      const latest = points.at(-1)
      return indicator && latest
        ? { indicator, latest, change: latestChange(points) }
        : null
    })
    .filter(Boolean) as Array<{ indicator: MacroIndicator; latest: { date: string; value: number }; change: number }>

  const sectors = sectorData?.success ? sectorData.sectors : []
  const insights = insightsData?.items || []

  return (
    <div className="h-full p-4 flex flex-col overflow-hidden gap-4">
      <section className="rounded-2xl border border-border bg-card p-5 card-elevated shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Macro Indicators
            </span>
            <span className="text-xs text-up flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-up rounded-full animate-pulse" />
              Local Data
            </span>
          </div>
          <Link href="/macro" className="text-sm text-muted-foreground hover:text-foreground transition">
            全部 →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {topIndicators.map(({ indicator, latest, change }) => (
            <div key={indicator.code} className="p-4 rounded-xl border border-border hover:bg-accent/50 transition-all duration-200">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-medium truncate">
                {indicator.code}
              </div>
              <div className="text-sm text-foreground/90 truncate mb-2">{indicator.name}</div>
              <div className="text-lg font-semibold tabular-nums tracking-tight">
                {latest.value.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{indicator.unit}</div>
              <div className={cn('text-sm font-medium tabular-nums mt-1', change >= 0 ? 'text-up' : 'text-down')}>
                {change >= 0 ? '+' : ''}
                {change.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 shrink-0">
        <QuickLink
          href="/news"
          title="实时新闻"
          description="实时热点与市场快讯"
          iconColor="text-blue-500"
          bgColor="bg-blue-500/10"
          path="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
        />
        <QuickLink
          href="/stock"
          title="个股看板"
          description="股票价格、估值与财务分析"
          iconColor="text-green-500"
          bgColor="bg-green-500/10"
          path="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-12 lg:col-span-9 flex flex-col gap-4 min-h-0">
          <section className="rounded-2xl border border-border bg-card p-5 card-elevated">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Time Series Analysis & Correlation
              </span>
              <Link href="/macro" className="text-sm text-muted-foreground hover:text-foreground transition">
                宏观看板 →
              </Link>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {HOME_CHART_PAIRS.map((pair) => (
                <HomeChartPanel
                  key={`${pair.codeX}-${pair.codeY}`}
                  pair={pair}
                  indicators={indicators}
                  groupMap={groupMap}
                  isDark={isDark}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 card-elevated">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Sector Performance
              </span>
              <Link href="/stock" className="text-sm text-muted-foreground hover:text-foreground transition">
                个股看板 →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sectors.slice(0, 8).map((sector) => (
                <div key={sector.ticker} className="rounded-xl border border-border p-4 hover:bg-accent/40 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">{sector.name}</span>
                    <span className={cn('text-sm font-semibold', sector.change >= 0 ? 'text-up' : 'text-down')}>
                      {sector.change >= 0 ? '+' : ''}
                      {sector.change.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{sector.ticker}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="col-span-12 lg:col-span-3 min-h-0">
          <section className="rounded-2xl border border-border bg-card p-5 card-elevated h-full overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Intelligence Feed
              </span>
              <Link href="/intelligence" className="text-sm text-muted-foreground hover:text-foreground transition">
                更多 →
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {insights.map((item) => (
                <Link
                  key={item.id}
                  href={`/intelligence/${item.id}`}
                  className="block rounded-xl border border-border p-3 hover:bg-accent/40 transition-colors"
                >
                  <div className="text-sm font-medium text-foreground line-clamp-2">{item.title}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(item.tags || []).slice(0, 2).map((tag, index) => {
                      const name = getTagName(tag)
                      return name ? (
                        <span key={`${item.id}-${index}`} className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {name}
                        </span>
                      ) : null
                    })}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function HomeChartPanel({
  pair,
  indicators,
  groupMap,
  isDark,
}: {
  pair: { codeX: string; codeY: string; title: string }
  indicators: MacroIndicator[]
  groupMap: Map<string, Array<{ date: string; value: number }>>
  isDark: boolean
}) {
  const indicatorX = indicators.find((item) => item.code === pair.codeX)
  const indicatorY = indicators.find((item) => item.code === pair.codeY)
  const seriesX = (groupMap.get(pair.codeX) || []).slice(-36)
  const seriesY = (groupMap.get(pair.codeY) || []).slice(-36)

  const length = Math.min(seriesX.length, seriesY.length)
  const xValues = seriesX.slice(-length).map((item) => item.value)
  const yValues = seriesY.slice(-length).map((item) => item.value)
  const dates = seriesX.slice(-length).map((item) => item.date.slice(0, 7))
  const correlation = length >= 3 ? pearsonCorrelation(xValues, yValues) : 0

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
      axisLabel: { color: isDark ? '#636366' : '#8e8e93', fontSize: 10 },
    },
    yAxis: { type: 'value' as const, show: false },
    series: [
      {
        name: indicatorX?.name || pair.codeX,
        type: 'line' as const,
        data: normalizeValues(xValues),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#3b82f6', width: 2 },
      },
      {
        name: indicatorY?.name || pair.codeY,
        type: 'line' as const,
        data: normalizeValues(yValues),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#ef4444', width: 2 },
      },
    ],
  }

  return (
    <div className="flex flex-col border border-border rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{pair.title}</div>
          <div className="text-xs text-muted-foreground truncate">
            {(indicatorX?.name || pair.codeX)} vs {(indicatorY?.name || pair.codeY)}
          </div>
        </div>
        <div className={cn('text-sm font-semibold tabular-nums ml-2', correlation >= 0 ? 'text-up' : 'text-down')}>
          r={correlation >= 0 ? '+' : ''}
          {correlation.toFixed(2)}
        </div>
      </div>
      <div style={{ height: 180 }}>
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
      </div>
    </div>
  )
}

function QuickLink({
  href,
  title,
  description,
  iconColor,
  bgColor,
  path,
}: {
  href: string
  title: string
  description: string
  iconColor: string
  bgColor: string
  path: string
}) {
  return (
    <Link href={href} className="group">
      <div className="rounded-2xl border border-border bg-card p-5 card-elevated hover:bg-accent/50 transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center`}>
              <svg className={`w-5 h-5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground group-hover:text-link transition-colors">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          <span className="text-muted-foreground group-hover:text-link transition-colors">→</span>
        </div>
      </div>
    </Link>
  )
}
