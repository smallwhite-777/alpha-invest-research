'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate } from '@/lib/format'
import { getChartColors, getThemeName, registerThemes } from '@/lib/chart-theme'
import type { MacroIndicator } from '@/types/macro'

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => null,
})

const fetcher = async (url: string) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}

const GROUPS = [
  {
    key: 'china',
    title: '\u4e2d\u56fd',
    description: '\u589e\u957f\u3001\u751f\u4ea7\u4e0e\u5185\u9700\u7684\u6838\u5fc3\u8ddf\u8e2a\u3002',
    codes: ['PMI_CHN', 'GDP_CHN_YOY', 'IP_CHN_YOY', 'RS_CHN_YOY'],
  },
  {
    key: 'usa',
    title: '\u7f8e\u56fd',
    description: '\u5229\u7387\u3001\u4ef7\u683c\u548c\u8d44\u4ea7\u8d1f\u503a\u8868\u7684\u4e3b\u7ebf\u89c2\u5bdf\u3002',
    codes: ['US_DFF_M', 'US_DGS10_M', 'US_DGS2_M', 'US_PCECTPI_M', 'US_M2SL_M', 'US_WALCL_M'],
  },
  {
    key: 'liquidity',
    title: '\u6d41\u52a8\u6027',
    description: '\u8d27\u5e01\u589e\u901f\u4e0e\u592e\u884c\u6295\u653e\u73af\u5883\u3002',
    codes: ['CN_M2_YOY', 'CN_M1_YOY', 'US_M2SL_M', 'US_WALCL_M'],
  },
  {
    key: 'inflation',
    title: '\u901a\u80c0',
    description: '\u4e2d\u7f8e\u4ef7\u683c\u6c34\u5e73\u548c\u4e0a\u6e38\u6210\u672c\u538b\u529b\u3002',
    codes: ['CN_CPI_NT_YOY', 'CN_PPI_YOY', 'US_PCECTPI_M'],
  },
  {
    key: 'rates',
    title: '\u5229\u7387',
    description: '\u77ed\u7aef\u653f\u7b56\u5229\u7387\u4e0e\u957f\u7aef\u6536\u76ca\u7387\u66f2\u7ebf\u3002',
    codes: ['REPO7D_CHN', 'TREASURY10Y_CHN', 'US_DFF_M', 'US_DGS10_M', 'US_DGS2_M'],
  },
  {
    key: 'commodity',
    title: '\u5927\u5b97',
    description: '\u539f\u6cb9\u4e0e\u7f8e\u5143\u5b9a\u4ef7\u73af\u5883\u3002',
    codes: ['US_DCOILBRENTEU_M', 'US_DTWEXBGS_M'],
  },
] as const

const DEFAULT_X = 'CN_M2_YOY'
const DEFAULT_Y = 'US_M2SL_M'
const DEFAULT_LEFT = 'PMI_CHN'
const DEFAULT_RIGHT = 'US_DGS10_M'

type MacroPoint = {
  date: string
  value: number
}

type MacroSeries = {
  indicatorCode: string
  data: MacroPoint[]
}

type CorrelationPoint = {
  date: string
  x: number
  y: number
}

type CorrelationResult = {
  correlation: number
  sampleSize: number
  dataPoints: CorrelationPoint[]
  regression: {
    slope: number
    intercept: number
    r2: number
  }
}

type ScatterDatum = {
  value: [number, number]
  date: string
}

if (typeof window !== 'undefined') {
  try {
    registerThemes()
  } catch (error) {
    console.error('Chart theme registration error:', error)
  }
}

function formatValue(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--'
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: Math.abs(value) < 100 ? Math.min(digits, 2) : 0,
  }).format(value)
}

function buildSeriesMap(seriesList: MacroSeries[] | undefined) {
  const map: Record<string, MacroPoint[]> = {}
  for (const item of seriesList ?? []) {
    map[item.indicatorCode] = Array.isArray(item.data) ? item.data : []
  }
  return map
}

function getToneClass(title: string) {
  switch (title) {
    case '\u4e2d\u56fd':
      return 'border-sky-500/20 bg-sky-500/10 text-sky-700'
    case '\u7f8e\u56fd':
      return 'border-rose-500/20 bg-rose-500/10 text-rose-700'
    case '\u6d41\u52a8\u6027':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
    case '\u901a\u80c0':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-700'
    case '\u5229\u7387':
      return 'border-indigo-500/20 bg-indigo-500/10 text-indigo-700'
    default:
      return 'border-stone-500/20 bg-stone-500/10 text-stone-700'
  }
}

export default function MacroPage() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [codeX, setCodeX] = useState(DEFAULT_X)
  const [codeY, setCodeY] = useState(DEFAULT_Y)
  const [lag, setLag] = useState('0')
  const [leftCode, setLeftCode] = useState(DEFAULT_LEFT)
  const [rightCode, setRightCode] = useState(DEFAULT_RIGHT)
  const [correlationResult, setCorrelationResult] = useState<CorrelationResult | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: indicators, error: indicatorsError } = useSWR<MacroIndicator[]>('/api/macro/indicators', fetcher)

  const overviewCodes = Array.from(new Set(GROUPS.flatMap((group) => group.codes))).join(',')
  const { data: overviewSeries, error: overviewError } = useSWR<MacroSeries[]>(
    overviewCodes ? `/api/macro/data?codes=${overviewCodes}&limit=60` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const comparisonCodes = leftCode && rightCode ? `${leftCode},${rightCode}` : ''
  const { data: comparisonSeries } = useSWR<MacroSeries[]>(
    comparisonCodes ? `/api/macro/data?codes=${comparisonCodes}&limit=60` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const indicatorMap = useMemo(() => {
    const map = new Map<string, MacroIndicator>()
    for (const indicator of indicators ?? []) {
      map.set(indicator.code, indicator)
    }
    return map
  }, [indicators])

  const dataMap = useMemo(() => buildSeriesMap(overviewSeries), [overviewSeries])
  const comparisonMap = useMemo(() => buildSeriesMap(comparisonSeries), [comparisonSeries])

  useEffect(() => {
    async function loadCorrelation() {
      if (!codeX || !codeY) return

      try {
        const response = await fetch('/api/macro/correlation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codeX, codeY, lag: Number.parseInt(lag, 10) }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const payload = (await response.json()) as CorrelationResult
        setCorrelationResult(payload)
      } catch (error) {
        console.error('Correlation request failed:', error)
        setCorrelationResult(null)
      }
    }

    loadCorrelation()
  }, [codeX, codeY, lag])

  const latestDate = useMemo(() => {
    const dates = Object.values(dataMap)
      .map((series) => series[series.length - 1]?.date)
      .filter((value): value is string => Boolean(value))
    return dates.length ? dates.sort().at(-1) ?? null : null
  }, [dataMap])

  const loading = !indicators && !indicatorsError
  const colors = getChartColors(resolvedTheme === 'dark')

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-border bg-card/80 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Badge variant="outline" className="w-fit border-border text-xs tracking-[0.2em] text-muted-foreground">
                MACRO TERMINAL
              </Badge>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{'\u5b8f\u89c2\u770b\u677f'}</h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  {'\u9875\u9762\u76f4\u63a5\u8bfb\u53d6\u672c\u5730 macro-data/data \u4e2d\u7684\u4e2d\u7f8e\u5b8f\u89c2\u65f6\u95f4\u5e8f\u5217\uff0c\u4e0d\u518d\u4f7f\u7528\u65e7\u7684\u786c\u7f16\u7801\u6587\u6848\u4e0e\u5360\u4f4d\u6570\u636e\u3002'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {GROUPS.map((group) => (
                <div key={group.key} className="rounded-2xl border border-border bg-background/60 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{group.title}</div>
                  <div className="mt-2 text-lg font-semibold text-foreground">{group.codes.length}</div>
                  <div className="text-xs text-muted-foreground">{'\u6838\u5fc3\u6307\u6807'}</div>
                </div>
              ))}
            </div>
          </div>

          {latestDate ? (
            <div className="mt-4 text-xs text-muted-foreground">
              {'\u6700\u65b0\u6837\u672c\u65e5\u671f\uff1a'}
              {formatDate(latestDate)}
            </div>
          ) : null}
        </section>

        {indicatorsError || overviewError ? (
          <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {'\u5b8f\u89c2\u6570\u636e\u8bfb\u53d6\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u672c\u5730\u6570\u636e\u76ee\u5f55\u548c /api/macro/* \u63a5\u53e3\u3002'}
          </Card>
        ) : null}

        {loading ? (
          <Card className="p-6 text-sm text-muted-foreground">{'\u6b63\u5728\u8bfb\u53d6\u672c\u5730\u5b8f\u89c2\u6570\u636e...'}</Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-5">
            <TabsList className="grid w-full grid-cols-3 bg-card">
              <TabsTrigger value="overview">{'\u6307\u6807\u603b\u89c8'}</TabsTrigger>
              <TabsTrigger value="correlation">{'\u65f6\u5e8f\u76f8\u5173\u6027'}</TabsTrigger>
              <TabsTrigger value="comparison">{'\u53cc\u8f74\u5bf9\u6bd4'}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {GROUPS.map((group) => {
                const groupIndicators = group.codes
                  .map((code) => indicatorMap.get(code))
                  .filter((indicator): indicator is MacroIndicator => Boolean(indicator))

                return (
                  <section key={group.key} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-lg font-semibold text-foreground">{group.title}</h2>
                          <Badge variant="outline" className={getToneClass(group.title)}>
                            {groupIndicators.length} {'\u9879'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {groupIndicators.map((indicator) => (
                        <IndicatorCard
                          key={`${group.key}-${indicator.code}`}
                          indicator={indicator}
                          series={dataMap[indicator.code] ?? []}
                          isDark={resolvedTheme === 'dark'}
                        />
                      ))}
                    </div>
                  </section>
                )
              })}
            </TabsContent>

            <TabsContent value="correlation" className="space-y-4">
              <Card className="p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <IndicatorPicker
                    label={'X \u8f74\u6307\u6807'}
                    value={codeX}
                    onChange={setCodeX}
                    indicators={indicators ?? []}
                  />
                  <IndicatorPicker
                    label={'Y \u8f74\u6307\u6807'}
                    value={codeY}
                    onChange={setCodeY}
                    indicators={indicators ?? []}
                  />
                  <div>
                    <label className="mb-2 block text-sm text-muted-foreground">{'\u6ede\u540e\u671f\uff08\u6708\uff09'}</label>
                    <Select value={lag} onValueChange={setLag}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['0', '1', '3', '6', '12'].map((value) => (
                          <SelectItem key={value} value={value}>
                            {value === '0' ? '\u540c\u671f' : `${value} \u4e2a\u6708`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {correlationResult ? (
                <Card className="space-y-5 p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <StatCard label={'\u76f8\u5173\u7cfb\u6570'} value={formatValue(correlationResult.correlation, 3)} />
                    <StatCard label="R²" value={formatValue(correlationResult.regression?.r2, 3)} />
                    <StatCard label={'\u6837\u672c\u6570'} value={String(correlationResult.sampleSize ?? '--')} />
                  </div>
                  {mounted ? (
                    <ScatterChart
                      result={correlationResult}
                      indicatorX={indicatorMap.get(codeX)}
                      indicatorY={indicatorMap.get(codeY)}
                      colors={colors}
                      isDark={resolvedTheme === 'dark'}
                    />
                  ) : null}
                </Card>
              ) : (
                <Card className="p-6 text-sm text-muted-foreground">
                  {'\u5f53\u524d\u7ec4\u5408\u6682\u65e0\u8db3\u591f\u91cd\u53e0\u6837\u672c\uff0c\u6682\u65f6\u65e0\u6cd5\u8ba1\u7b97\u76f8\u5173\u6027\u3002'}
                </Card>
              )}
            </TabsContent>

            <TabsContent value="comparison" className="space-y-4">
              <Card className="p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <IndicatorPicker
                    label={'\u5de6\u8f74\u6307\u6807'}
                    value={leftCode}
                    onChange={setLeftCode}
                    indicators={indicators ?? []}
                  />
                  <IndicatorPicker
                    label={'\u53f3\u8f74\u6307\u6807'}
                    value={rightCode}
                    onChange={setRightCode}
                    indicators={indicators ?? []}
                  />
                </div>
              </Card>

              {mounted ? (
                <Card className="p-4">
                  <ComparisonChart
                    leftIndicator={indicatorMap.get(leftCode)}
                    rightIndicator={indicatorMap.get(rightCode)}
                    leftSeries={comparisonMap[leftCode] ?? []}
                    rightSeries={comparisonMap[rightCode] ?? []}
                    colors={colors}
                    isDark={resolvedTheme === 'dark'}
                  />
                </Card>
              ) : null}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}

function IndicatorPicker({
  label,
  value,
  onChange,
  indicators,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  indicators: MacroIndicator[]
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={'\u9009\u62e9\u6307\u6807'} />
        </SelectTrigger>
        <SelectContent>
          {indicators.map((indicator) => (
            <SelectItem key={indicator.code} value={indicator.code}>
              {indicator.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  )
}

function IndicatorCard({
  indicator,
  series,
  isDark,
}: {
  indicator: MacroIndicator
  series: MacroPoint[]
  isDark: boolean
}) {
  const latest = series[series.length - 1]
  const previous = series[series.length - 2]
  const change = latest && previous ? latest.value - previous.value : null

  return (
    <Card className="rounded-3xl border border-border bg-card/85 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{indicator.code}</div>
          <h3 className="mt-2 text-base font-semibold text-foreground">{indicator.name}</h3>
        </div>
        <Badge variant="outline" className="border-border text-xs text-muted-foreground">
          {indicator.unit}
        </Badge>
      </div>

      {latest ? (
        <>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <div className="text-3xl font-semibold text-foreground">{formatValue(latest.value)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{formatDate(latest.date)}</div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${change !== null && change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {change === null ? '--' : `${change >= 0 ? '+' : ''}${formatValue(change)}`}
              </div>
              <div className="text-xs text-muted-foreground">{'\u8f83\u524d\u503c'}</div>
            </div>
          </div>
          <MiniChart data={series} isDark={isDark} />
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          {'\u6570\u636e\u6e90\u5df2\u63a5\u5165\uff0c\u4f46\u8be5\u6307\u6807\u5f53\u524d\u6ca1\u6709\u53ef\u7528\u6837\u672c\u3002'}
        </div>
      )}
    </Card>
  )
}

function MiniChart({
  data,
  isDark,
}: {
  data: MacroPoint[]
  isDark: boolean
}) {
  if (data.length < 2) return null

  const values = data.map((item) => item.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return null

  const option = {
    grid: { left: 0, right: 0, top: 10, bottom: 0 },
    xAxis: {
      type: 'category',
      show: false,
      data: data.map((item) => item.date),
    },
    yAxis: {
      type: 'value',
      show: false,
      min,
      max,
    },
    series: [
      {
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#0f766e', width: 2 },
        areaStyle: { color: 'rgba(15, 118, 110, 0.12)' },
      },
    ],
  }

  return (
    <div className="mt-4 h-20">
      <ReactECharts option={option} theme={getThemeName(isDark)} style={{ height: '100%' }} />
    </div>
  )
}

function ScatterChart({
  result,
  indicatorX,
  indicatorY,
  colors,
  isDark,
}: {
  result: CorrelationResult
  indicatorX?: MacroIndicator
  indicatorY?: MacroIndicator
  colors: ReturnType<typeof getChartColors>
  isDark: boolean
}) {
  const points = result.dataPoints
  const xValues = points.map((point) => point.x)
  const xMin = Math.min(...xValues)
  const xMax = Math.max(...xValues)

  const option = {
    title: {
      text: `${indicatorX?.name ?? 'X'} vs ${indicatorY?.name ?? 'Y'}`,
      textStyle: { color: colors.fg, fontSize: 14 },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: { seriesName: string; data: ScatterDatum }) => {
        if (params.seriesName !== '\u6837\u672c\u70b9') return ''
        const [x, y] = params.data.value
        return `${params.data.date}<br/>${indicatorX?.name}: ${formatValue(x)}<br/>${indicatorY?.name}: ${formatValue(y)}`
      },
    },
    grid: { left: '8%', right: '8%', top: '14%', bottom: '12%' },
    xAxis: {
      type: 'value',
      name: indicatorX?.name ?? 'X',
      nameLocation: 'middle',
      nameGap: 28,
      axisLabel: { color: colors.muted },
      splitLine: { lineStyle: { color: colors.splitLine } },
    },
    yAxis: {
      type: 'value',
      name: indicatorY?.name ?? 'Y',
      nameLocation: 'middle',
      nameGap: 38,
      axisLabel: { color: colors.muted },
      splitLine: { lineStyle: { color: colors.splitLine } },
    },
    series: [
      {
        name: '\u6837\u672c\u70b9',
        type: 'scatter',
        data: points.map((point) => ({
          value: [point.x, point.y] as [number, number],
          date: point.date,
        })),
        symbolSize: 8,
        itemStyle: { color: '#2563eb' },
      },
      {
        name: '\u56de\u5f52\u7ebf',
        type: 'line',
        data: [
          [xMin, result.regression.slope * xMin + result.regression.intercept],
          [xMax, result.regression.slope * xMax + result.regression.intercept],
        ],
        symbol: 'none',
        lineStyle: { color: '#dc2626', width: 2, type: 'dashed' },
      },
    ],
  }

  return <ReactECharts option={option} theme={getThemeName(isDark)} style={{ height: 420 }} />
}

function ComparisonChart({
  leftIndicator,
  rightIndicator,
  leftSeries,
  rightSeries,
  colors,
  isDark,
}: {
  leftIndicator?: MacroIndicator
  rightIndicator?: MacroIndicator
  leftSeries: MacroPoint[]
  rightSeries: MacroPoint[]
  colors: ReturnType<typeof getChartColors>
  isDark: boolean
}) {
  const rightMap = new Map(rightSeries.map((item) => [item.date, item.value]))
  const aligned = leftSeries
    .filter((item) => rightMap.has(item.date))
    .map((item) => ({
      date: item.date,
      left: item.value,
      right: rightMap.get(item.date) ?? null,
    }))
    .filter((item): item is { date: string; left: number; right: number } => item.right !== null)

  if (!aligned.length) {
    return <div className="p-6 text-sm text-muted-foreground">{'\u5f53\u524d\u4e24\u7ec4\u6307\u6807\u6682\u65e0\u91cd\u53e0\u6837\u672c\u3002'}</div>
  }

  const option = {
    tooltip: { trigger: 'axis' },
    legend: {
      data: [leftIndicator?.name, rightIndicator?.name],
      textStyle: { color: colors.muted },
    },
    grid: { left: '4%', right: '4%', bottom: '6%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: aligned.map((item) => item.date),
      axisLabel: { color: colors.muted },
    },
    yAxis: [
      {
        type: 'value',
        name: leftIndicator?.unit,
        axisLabel: { color: colors.muted },
        splitLine: { lineStyle: { color: colors.splitLine } },
      },
      {
        type: 'value',
        name: rightIndicator?.unit,
        axisLabel: { color: colors.muted },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: leftIndicator?.name,
        type: 'line',
        data: aligned.map((item) => item.left),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#0f766e', width: 2 },
      },
      {
        name: rightIndicator?.name,
        type: 'line',
        yAxisIndex: 1,
        data: aligned.map((item) => item.right),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#7c3aed', width: 2 },
      },
    ],
  }

  return <ReactECharts option={option} theme={getThemeName(isDark)} style={{ height: 420 }} />
}
