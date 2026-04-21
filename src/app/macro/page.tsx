'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { MacroIndicator } from '@/types/macro'

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => null,
})

type MacroGroup = {
  indicatorCode: string
  data: Array<{ date: string; value: number }>
}

const SECTION_GROUPS = [
  { key: 'china', title: '中国', codes: ['CN_M2_YOY', 'PMI_CHN', 'CN_CPI_NT_YOY', 'CN_PPI_YOY', 'GDP_CHN_YOY', 'RS_CHN_YOY'] },
  { key: 'us', title: '美国', codes: ['US_DFF_M', 'US_DGS10_M', 'US_DGS2_M', 'US_M2SL_M', 'US_PCECTPI_M', 'US_DTWEXBGS_M'] },
  { key: 'liquidity', title: '流动性', codes: ['CN_M2_YOY', 'CN_M1_YOY', 'REPO7D_CHN', 'US_DFF_M', 'US_WALCL_M'] },
  { key: 'inflation', title: '通胀', codes: ['CN_CPI_NT_YOY', 'CN_PPI_YOY', 'US_PCECTPI_M', 'US_DCOILBRENTEU_M'] },
  { key: 'rates', title: '利率', codes: ['REPO7D_CHN', 'TREASURY10Y_CHN', 'US_DFF_M', 'US_DGS10_M', 'US_DGS2_M'] },
  { key: 'commodities', title: '大宗', codes: ['US_DCOILBRENTEU_M', 'CN_PPI_YOY', 'PMI_CHN'] },
]

const CORRELATION_DEFAULTS = {
  codeX: 'CN_M2_YOY',
  codeY: 'US_M2SL_M',
  lag: '0',
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString('zh-CN')
  } catch {
    return date
  }
}

function normalizeValues(values: number[]) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  return values.map((value) => ((value - min) / range) * 100)
}

function buildDataMap(groups: MacroGroup[]) {
  return new Map(groups.map((group) => [group.indicatorCode, group.data]))
}

export default function MacroPage() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [codeX, setCodeX] = useState(CORRELATION_DEFAULTS.codeX)
  const [codeY, setCodeY] = useState(CORRELATION_DEFAULTS.codeY)
  const [lag, setLag] = useState(CORRELATION_DEFAULTS.lag)
  const [compareLeft, setCompareLeft] = useState('CN_M2_YOY')
  const [compareRight, setCompareRight] = useState('US_DGS10_M')
  const [correlationResult, setCorrelationResult] = useState<any>(null)
  const [correlationLoading, setCorrelationLoading] = useState(false)

  useEffect(() => setMounted(true), [])

  const allCodes = useMemo(
    () => Array.from(new Set(SECTION_GROUPS.flatMap((group) => group.codes))).join(','),
    []
  )

  const { data: indicators = [], error: indicatorsError } = useSWR<MacroIndicator[]>(
    '/api/macro/indicators',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )

  const { data: macroGroups = [] } = useSWR<MacroGroup[]>(
    `/api/macro/data?codes=${allCodes}&limit=120`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )

  const dataMap = useMemo(() => buildDataMap(macroGroups), [macroGroups])
  const isDark = resolvedTheme === 'dark'

  const compareCodes = useMemo(() => `${compareLeft},${compareRight}`, [compareLeft, compareRight])
  const { data: comparisonGroups = [] } = useSWR<MacroGroup[]>(
    `/api/macro/data?codes=${compareCodes}&limit=120`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )

  const runCorrelation = async () => {
    if (!codeX || !codeY) return

    setCorrelationLoading(true)
    try {
      const response = await fetch('/api/macro/correlation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeX, codeY, lag: Number(lag) }),
      })
      const data = await response.json()
      setCorrelationResult(data)
    } catch (error) {
      console.error('Correlation request failed:', error)
    } finally {
      setCorrelationLoading(false)
    }
  }

  useEffect(() => {
    runCorrelation()
  }, [])

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-editorial text-xl font-semibold text-foreground">宏观看板</h1>
            <p className="mt-1 text-sm text-muted-foreground">基于本地 macro-data 的中美宏观指标与相关性分析</p>
          </div>
        </div>

        {indicatorsError ? <div className="mb-4 text-down">加载宏观指标失败，请稍后重试。</div> : null}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="rounded-none bg-surface-low">
            <TabsTrigger value="overview" className="rounded-none data-[state=active]:bg-surface-high">指标总览</TabsTrigger>
            <TabsTrigger value="correlation" className="rounded-none data-[state=active]:bg-surface-high">相关性分析</TabsTrigger>
            <TabsTrigger value="comparison" className="rounded-none data-[state=active]:bg-surface-high">双轴对比</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {SECTION_GROUPS.map((section) => (
              <section key={section.key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-editorial text-base text-foreground">{section.title}</h2>
                  <span className="text-xs text-muted-foreground">{section.codes.length} 项</span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {section.codes.map((code) => (
                    <IndicatorCard
                      key={`${section.key}-${code}`}
                      indicator={indicators.find((item) => item.code === code)}
                      data={dataMap.get(code) || []}
                    />
                  ))}
                </div>
              </section>
            ))}
          </TabsContent>

          <TabsContent value="correlation" className="space-y-4">
            <div className="bg-surface-low p-4">
              <h3 className="mb-4 font-editorial text-sm font-medium text-foreground">参数选择</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Select value={codeX} onValueChange={(value) => value && setCodeX(value)}>
                  <SelectTrigger className="rounded-none bg-surface text-foreground">
                    <SelectValue placeholder="选择 X 轴指标" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-surface-float">
                    {indicators.map((indicator) => (
                      <SelectItem key={indicator.code} value={indicator.code} className="rounded-none text-foreground">
                        {indicator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={codeY} onValueChange={(value) => value && setCodeY(value)}>
                  <SelectTrigger className="rounded-none bg-surface text-foreground">
                    <SelectValue placeholder="选择 Y 轴指标" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-surface-float">
                    {indicators.map((indicator) => (
                      <SelectItem key={indicator.code} value={indicator.code} className="rounded-none text-foreground">
                        {indicator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={lag} onValueChange={(value) => value && setLag(value)}>
                  <SelectTrigger className="rounded-none bg-surface text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-surface-float">
                    {[0, 1, 3, 6, 12].map((value) => (
                      <SelectItem key={value} value={String(value)} className="rounded-none text-foreground">
                        {value === 0 ? '同期' : `${value} 个月滞后`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button onClick={runCorrelation} disabled={correlationLoading} className="rounded-none bg-link text-white hover:bg-link/90">
                  {correlationLoading ? '计算中...' : '计算相关性'}
                </Button>
              </div>
            </div>

            {correlationResult ? (
              <CorrelationPanel
                result={correlationResult}
                indicators={indicators}
                codeX={codeX}
                codeY={codeY}
                isDark={isDark}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <div className="bg-surface-low p-4">
              <h3 className="mb-4 font-editorial text-sm font-medium text-foreground">双轴对比</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Select value={compareLeft} onValueChange={(value) => value && setCompareLeft(value)}>
                  <SelectTrigger className="rounded-none bg-surface text-foreground">
                    <SelectValue placeholder="选择左轴指标" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-surface-float">
                    {indicators.map((indicator) => (
                      <SelectItem key={indicator.code} value={indicator.code} className="rounded-none text-foreground">
                        {indicator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={compareRight} onValueChange={(value) => value && setCompareRight(value)}>
                  <SelectTrigger className="rounded-none bg-surface text-foreground">
                    <SelectValue placeholder="选择右轴指标" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-surface-float">
                    {indicators.map((indicator) => (
                      <SelectItem key={indicator.code} value={indicator.code} className="rounded-none text-foreground">
                        {indicator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center text-sm text-muted-foreground">
                  使用同一时间轴展示两条真实宏观序列
                </div>
              </div>
            </div>

            <ComparisonPanel
              groups={comparisonGroups}
              indicators={indicators}
              leftCode={compareLeft}
              rightCode={compareRight}
              isDark={isDark}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function IndicatorCard({
  indicator,
  data,
}: {
  indicator?: MacroIndicator
  data: Array<{ date: string; value: number }>
}) {
  const latest = data.at(-1)
  const previous = data.at(-2)
  const change = latest && previous ? latest.value - previous.value : null

  return (
    <div className="bg-surface-low p-4 transition-colors hover:bg-surface-high">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">{indicator?.name || indicator?.code || '未知指标'}</h3>
        </div>
        <Badge variant="outline" className="rounded-none text-xs text-muted-foreground">
          {indicator?.unit || '-'}
        </Badge>
      </div>

      {latest ? (
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground">{latest.value.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground">{indicator?.unit}</span>
          </div>
          <div className="text-xs text-muted-foreground">更新时间：{formatDate(latest.date)}</div>
          <div className={`text-sm font-medium tabular-nums ${change !== null && change >= 0 ? 'text-up' : 'text-down'}`}>
            变动 {change !== null ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}` : '-'}
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">暂无数据</div>
      )}

      <MiniChart data={data} />
    </div>
  )
}

function MiniChart({ data }: { data: Array<{ date: string; value: number }> }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted || data.length < 2) return null

  const isDark = resolvedTheme === 'dark'
  const values = data.map((item) => item.value).filter((value) => Number.isFinite(value))
  if (values.length < 2) return null

  const option = {
    grid: { left: 0, right: 0, top: 5, bottom: 5 },
    xAxis: { type: 'category' as const, show: false, data: data.map((item) => item.date) },
    yAxis: { type: 'value' as const, show: false },
    series: [
      {
        type: 'line' as const,
        data: values,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: isDark ? '#6fa888' : '#001629', width: 2 },
        areaStyle: { color: isDark ? 'rgba(111,168,136,0.08)' : 'rgba(0,22,41,0.06)' },
      },
    ],
  }

  return (
    <div className="mt-3 h-16">
      <ReactECharts option={option} style={{ height: '100%' }} opts={{ renderer: 'canvas' }} />
    </div>
  )
}

function CorrelationPanel({
  result,
  indicators,
  codeX,
  codeY,
  isDark,
}: {
  result: any
  indicators: MacroIndicator[]
  codeX: string
  codeY: string
  isDark: boolean
}) {
  const indicatorX = indicators.find((item) => item.code === codeX)
  const indicatorY = indicators.find((item) => item.code === codeY)
  const points = result?.dataPoints || []

  const option = {
    grid: { left: 30, right: 20, top: 20, bottom: 35 },
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: isDark ? 'rgba(28,28,26,0.96)' : 'rgba(255,255,255,0.96)',
      borderColor: 'transparent',
      textStyle: { color: isDark ? '#e4e2dd' : '#1b1c19' },
    },
    xAxis: {
      type: 'value' as const,
      name: indicatorX?.name || codeX,
      nameTextStyle: { color: isDark ? '#8a8d82' : '#74796d' },
      axisLabel: { color: isDark ? '#8a8d82' : '#74796d' },
    },
    yAxis: {
      type: 'value' as const,
      name: indicatorY?.name || codeY,
      nameTextStyle: { color: isDark ? '#8a8d82' : '#74796d' },
      axisLabel: { color: isDark ? '#8a8d82' : '#74796d' },
    },
    series: [
      {
        type: 'scatter' as const,
        data: points.map((item: { x: number; y: number; date: string }) => [item.x, item.y, item.date]),
        symbolSize: 10,
        itemStyle: { color: '#3b82f6' },
      },
    ],
  }

  return (
    <div className="bg-surface-low p-4">
      <h3 className="mb-4 font-editorial text-sm font-medium text-foreground">分析结果</h3>
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">相关系数 (r)</p>
          <p className="text-xl font-semibold text-foreground">{Number(result.correlation || 0).toFixed(3)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">决定系数 (R²)</p>
          <p className="text-xl font-semibold text-foreground">{Number(result.regression?.r2 || 0).toFixed(3)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">样本数</p>
          <p className="text-xl font-semibold text-foreground">{result.sampleSize || 0}</p>
        </div>
      </div>
      <div className="h-[360px]">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
      </div>
    </div>
  )
}

function ComparisonPanel({
  groups,
  indicators,
  leftCode,
  rightCode,
  isDark,
}: {
  groups: MacroGroup[]
  indicators: MacroIndicator[]
  leftCode: string
  rightCode: string
  isDark: boolean
}) {
  const leftSeries = groups.find((group) => group.indicatorCode === leftCode)?.data || []
  const rightSeries = groups.find((group) => group.indicatorCode === rightCode)?.data || []
  const rightMap = new Map(rightSeries.map((item) => [item.date, item.value]))
  const aligned = leftSeries
    .filter((item) => rightMap.has(item.date))
    .map((item) => ({ date: item.date, left: item.value, right: rightMap.get(item.date)! }))
    .slice(-60)

  const leftIndicator = indicators.find((item) => item.code === leftCode)
  const rightIndicator = indicators.find((item) => item.code === rightCode)

  const option = {
    grid: { left: 35, right: 35, top: 20, bottom: 30 },
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: isDark ? 'rgba(28,28,26,0.96)' : 'rgba(255,255,255,0.96)',
      borderColor: 'transparent',
      textStyle: { color: isDark ? '#e4e2dd' : '#1b1c19' },
    },
    legend: {
      top: 0,
      textStyle: { color: isDark ? '#8a8d82' : '#74796d' },
    },
    xAxis: {
      type: 'category' as const,
      data: aligned.map((item) => item.date.slice(0, 7)),
      axisLabel: { color: isDark ? '#8a8d82' : '#74796d' },
    },
    yAxis: [
      {
        type: 'value' as const,
        name: leftIndicator?.unit || '',
        axisLabel: { color: isDark ? '#8a8d82' : '#74796d' },
      },
      {
        type: 'value' as const,
        name: rightIndicator?.unit || '',
        axisLabel: { color: isDark ? '#8a8d82' : '#74796d' },
      },
    ],
    series: [
      {
        name: leftIndicator?.name || leftCode,
        type: 'line' as const,
        data: aligned.map((item) => item.left),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#3b82f6', width: 2 },
      },
      {
        name: rightIndicator?.name || rightCode,
        type: 'line' as const,
        yAxisIndex: 1,
        data: aligned.map((item) => item.right),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#ef4444', width: 2 },
      },
    ],
  }

  return (
    <div className="bg-surface-low p-4">
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">左轴指标</p>
          <p className="text-sm font-medium text-foreground">{leftIndicator?.name || leftCode}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">右轴指标</p>
          <p className="text-sm font-medium text-foreground">{rightIndicator?.name || rightCode}</p>
        </div>
      </div>
      <div className="h-[380px]">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
      </div>
    </div>
  )
}
