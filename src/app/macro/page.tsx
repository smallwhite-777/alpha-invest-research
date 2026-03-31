'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { useTheme } from 'next-themes'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { MACRO_CATEGORIES } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import dynamic from 'next/dynamic'
import { registerThemes, getThemeName, getChartColors } from '@/lib/chart-theme'
import type { MacroIndicator } from '@/types/macro'

// 动态导入 ECharts 组件，禁用 SSR
const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => null
})

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch (e) {
    console.error('Fetch error:', e)
    return null
  }
}

// 在客户端注册主题
if (typeof window !== 'undefined') {
  try {
    registerThemes()
  } catch (e) {
    console.error('Chart theme error:', e)
  }
}

export default function MacroPage() {
  const [category, setCategory] = useState<string>('')
  const { data: indicators, error: indicatorsError } = useSWR(
    `/api/macro/indicators${category ? `?category=${category}` : ''}`,
    fetcher
  )

  // 限制一次获取的指标数量，避免请求过长
  const limitedIndicators = indicators?.slice(0, 12) || []
  const indicatorCodes = limitedIndicators.map((i: MacroIndicator) => i.code).join(',')
  const { data: allMacroData, error: dataError } = useSWR(
    indicatorCodes ? `/api/macro/data?codes=${indicatorCodes}&limit=12` : null,
    fetcher,
    { revalidateOnFocus: false, errorRetryCount: 1 }
  )

  // 创建数据映射，增加安全检查
  const dataMap: Record<string, any[]> = {}
  if (Array.isArray(allMacroData)) {
    allMacroData.forEach((item: any) => {
      if (item?.indicatorCode && Array.isArray(item.data)) {
        dataMap[item.indicatorCode] = item.data
      }
    })
  }

  // 加载状态
  const isLoading = !indicators && !indicatorsError

  return (
    <div className="h-full overflow-y-auto p-6">
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">宏观看板</h1>
          <p className="text-sm text-muted-foreground mt-1">宏观指标监测与相关性分析</p>
        </div>
      </div>

      {indicatorsError && (
        <div className="text-red-500 mb-4">加载指标失败，请刷新页面重试</div>
      )}

      {isLoading ? (
        <div className="text-muted-foreground">加载中...</div>
      ) : (
        <Tabs defaultValue="indicators" className="space-y-4">
          <TabsList className="bg-card border-border">
            <TabsTrigger value="indicators" className="data-[state=active]:bg-accent">指标概览</TabsTrigger>
            <TabsTrigger value="correlation" className="data-[state=active]:bg-accent">相关性分析</TabsTrigger>
            <TabsTrigger value="comparison" className="data-[state=active]:bg-accent">双轴对比</TabsTrigger>
          </TabsList>

          <TabsContent value="indicators" className="space-y-4">
            <div className="flex gap-4 mb-4">
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger className="w-[180px] bg-card border-border text-foreground">
                  <SelectValue placeholder="全部分类" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all" className="text-foreground">全部分类</SelectItem>
                  {MACRO_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value} className="text-foreground">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {limitedIndicators?.map((indicator: MacroIndicator) => (
                <IndicatorCard key={indicator.id} indicator={indicator} dataMap={dataMap} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="correlation" className="space-y-4">
            <CorrelationAnalysis indicators={limitedIndicators || []} />
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <DualAxisComparison indicators={limitedIndicators || []} />
          </TabsContent>
        </Tabs>
      )}
    </div>
    </div>
  )
}

function IndicatorCard({ indicator, dataMap }: { indicator: MacroIndicator; dataMap: Record<string, any[]> }) {
  const data = dataMap[indicator.code] || []
  const latestValue = data[data.length - 1]?.value
  const latestDate = data[data.length - 1]?.date

  const categoryLabel = MACRO_CATEGORIES.find(c => c.value === indicator.category)?.label

  return (
    <Card className="p-4 bg-card border-border hover:border-ring/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-medium text-foreground">{indicator.name}</h3>
          <p className="text-xs text-muted-foreground/60">{indicator.code}</p>
        </div>
        <Badge variant="outline" className="text-xs border-border text-muted-foreground">
          {categoryLabel || indicator.category}
        </Badge>
      </div>

      {latestValue !== undefined && latestValue !== null ? (
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground">
              {typeof latestValue === 'number' ? latestValue.toFixed(2) : latestValue}
            </span>
            <span className="text-xs text-muted-foreground">{indicator.unit}</span>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {latestDate && formatDate(latestDate)}
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <span className="text-sm text-muted-foreground">暂无数据</span>
        </div>
      )}

      <MiniChart data={data} />
    </Card>
  )
}

function MiniChart({ data }: { data: any[] }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted || error || !data?.length || data.length < 2) return null

  try {
    const isDark = resolvedTheme === 'dark'
    const values = data.map((d: { value: number }) => d.value).filter(v => typeof v === 'number')

    if (values.length < 2) return null

    const min = Math.min(...values)
    const max = Math.max(...values)

    if (min === max) return null

    const option = {
      grid: { left: 0, right: 0, top: 5, bottom: 5 },
      xAxis: { type: 'category', show: false, data: data.map((d: { date: string }) => d.date) },
      yAxis: { type: 'value', show: false, min, max },
      series: [
        {
          type: 'line',
          data: values,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#3b82f6', width: 2 },
          areaStyle: { color: 'rgba(59, 130, 246, 0.1)' },
        },
      ],
    }

    return (
      <div className="h-16 mt-3">
        <ReactECharts
          option={option}
          theme={getThemeName(isDark)}
          style={{ height: '100%' }}
          onEvents={{
            error: () => setError(true)
          }}
        />
      </div>
    )
  } catch (e) {
    return null
  }
}

function CorrelationAnalysis({ indicators }: { indicators: MacroIndicator[] }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [codeX, setCodeX] = useState('')
  const [codeY, setCodeY] = useState('')
  const [lag, setLag] = useState('0')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const isDark = resolvedTheme === 'dark'
  const colors = getChartColors(isDark)

  const calculateCorrelation = async () => {
    if (!codeX || !codeY) return

    setLoading(true)
    try {
      const response = await fetch('/api/macro/correlation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeX, codeY, lag: parseInt(lag) }),
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-card border-border">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">X轴指标</label>
            <Select value={codeX} onValueChange={(v) => v && setCodeX(v)}>
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="选择指标" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {indicators.map(i => (
                  <SelectItem key={i.code} value={i.code} className="text-foreground">
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Y轴指标</label>
            <Select value={codeY} onValueChange={(v) => v && setCodeY(v)}>
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="选择指标" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {indicators.map(i => (
                  <SelectItem key={i.code} value={i.code} className="text-foreground">
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">滞后期（月）</label>
            <Select value={lag} onValueChange={(v) => v && setLag(v)}>
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {[0, 1, 3, 6, 12].map(l => (
                  <SelectItem key={l} value={l.toString()} className="text-foreground">
                    {l === 0 ? '同期' : `${l}个月`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={calculateCorrelation}
              disabled={loading || !codeX || !codeY}
              className="bg-link text-white hover:bg-link/90"
            >
              {loading ? '计算中...' : '计算相关性'}
            </Button>
          </div>
        </div>
      </Card>

      {result && mounted && (
        <Card className="p-4 bg-card border-border">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">相关系数 (r)</p>
              <p className="text-xl font-semibold text-foreground">
                {result.correlation.toFixed(3)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">R²</p>
              <p className="text-xl font-semibold text-foreground">
                {result.regression.r2.toFixed(3)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">样本数</p>
              <p className="text-xl font-semibold text-foreground">
                {result.sampleSize}
              </p>
            </div>
          </div>

          <ScatterChart result={result} codeX={codeX} codeY={codeY} indicators={indicators} isDark={isDark} colors={colors} />
        </Card>
      )}
    </div>
  )
}

function ScatterChart({ result, codeX, codeY, indicators, isDark, colors }: {
  result: any
  codeX: string
  codeY: string
  indicators: MacroIndicator[]
  isDark: boolean
  colors: ReturnType<typeof getChartColors>
}) {
  const indicatorX = indicators.find(i => i.code === codeX)
  const indicatorY = indicators.find(i => i.code === codeY)

  const { slope, intercept } = result.regression

  const xValues = result.dataPoints.map((p: any) => p.x)
  const xMin = Math.min(...xValues)
  const xMax = Math.max(...xValues)

  const option = {
    title: {
      text: `${indicatorX?.name || codeX} vs ${indicatorY?.name || codeY}`,
      textStyle: { color: colors.fg, fontSize: 14 },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.seriesName === '数据点') {
          return `${params.data.date}<br/>${indicatorX?.name}: ${params.data.x.toFixed(2)}<br/>${indicatorY?.name}: ${params.data.y.toFixed(2)}`
        }
        return ''
      },
    },
    grid: { left: '10%', right: '10%', bottom: '10%', top: '15%' },
    xAxis: {
      type: 'value',
      name: indicatorX?.name || codeX,
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: { color: colors.muted },
      splitLine: { lineStyle: { color: colors.splitLine } },
    },
    yAxis: {
      type: 'value',
      name: indicatorY?.name || codeY,
      nameLocation: 'middle',
      nameGap: 40,
      axisLabel: { color: colors.muted },
      splitLine: { lineStyle: { color: colors.splitLine } },
    },
    series: [
      {
        name: '数据点',
        type: 'scatter',
        data: result.dataPoints,
        symbolSize: 8,
        itemStyle: { color: '#3b82f6' },
      },
      {
        name: '回归线',
        type: 'line',
        data: [
          { x: xMin, y: slope * xMin + intercept },
          { x: xMax, y: slope * xMax + intercept },
        ],
        symbol: 'none',
        lineStyle: { color: '#ff4757', type: 'dashed', width: 2 },
      },
    ],
  }

  return <ReactECharts option={option} theme={getThemeName(isDark)} style={{ height: 400 }} />
}

function DualAxisComparison({ indicators }: { indicators: MacroIndicator[] }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [code1, setCode1] = useState('')
  const [code2, setCode2] = useState('')
  const { data } = useSWR(
    code1 && code2 ? `/api/macro/data?codes=${code1},${code2}&limit=60` : null,
    fetcher
  )

  const isDark = resolvedTheme === 'dark'
  const colors = getChartColors(isDark)

  const indicator1 = indicators.find(i => i.code === code1)
  const indicator2 = indicators.find(i => i.code === code2)

  const chartData = data?.map((series: any) => series.data).filter(Boolean)

  const option = {
    tooltip: { trigger: 'axis' },
    legend: {
      data: [indicator1?.name, indicator2?.name],
      textStyle: { color: colors.muted },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: chartData?.[0]?.map((d: any) => d.date) || [],
      axisLabel: { color: colors.muted },
    },
    yAxis: [
      {
        type: 'value',
        name: indicator1?.unit,
        position: 'left',
        axisLabel: { color: colors.muted },
        splitLine: { lineStyle: { color: colors.splitLine } },
      },
      {
        type: 'value',
        name: indicator2?.unit,
        position: 'right',
        axisLabel: { color: colors.muted },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: indicator1?.name,
        type: 'line',
        data: chartData?.[0]?.map((d: any) => d.value) || [],
        itemStyle: { color: '#3b82f6' },
        smooth: true,
      },
      {
        name: indicator2?.name,
        type: 'line',
        yAxisIndex: 1,
        data: chartData?.[1]?.map((d: any) => d.value) || [],
        itemStyle: { color: '#00d4aa' },
        smooth: true,
      },
    ],
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-card border-border">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">左轴指标</label>
            <Select value={code1} onValueChange={(v) => v && setCode1(v)}>
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="选择指标" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {indicators.map(i => (
                  <SelectItem key={i.code} value={i.code} className="text-foreground">
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">右轴指标</label>
            <Select value={code2} onValueChange={(v) => v && setCode2(v)}>
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="选择指标" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {indicators.map(i => (
                  <SelectItem key={i.code} value={i.code} className="text-foreground">
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {code1 && code2 && mounted && (
        <Card className="p-4 bg-card border-border">
          <ReactECharts option={option} theme={getThemeName(isDark)} style={{ height: 400 }} />
        </Card>
      )}
    </div>
  )
}
