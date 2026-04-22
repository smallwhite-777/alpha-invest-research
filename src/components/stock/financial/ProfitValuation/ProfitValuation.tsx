'use client'

import type { ReactNode } from 'react'
import { AlertCircle, Calculator, TrendingDown, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { PEBandResponse, ValuationMetrics } from '@/types/financial'
import { BaseChart } from '../charts/BaseChart'
import { createPEBandChartOption } from '../charts/ChartUtils'

interface ProfitValuationProps {
  valuationData?: ValuationMetrics
  peBandData?: PEBandResponse
  isLoading?: boolean
  isDark?: boolean
}

export function ProfitValuation({
  valuationData,
  peBandData,
  isLoading = false,
  isDark = false,
}: ProfitValuationProps) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card p-5">
        <div className="animate-pulse">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-6 w-24 rounded bg-muted" />
            <div className="h-6 w-20 rounded bg-muted" />
          </div>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="rounded-lg bg-muted/30 p-3">
                <div className="mx-auto mb-2 h-4 w-12 rounded bg-muted" />
                <div className="mx-auto h-6 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
          <div className="h-64 rounded-lg bg-muted/30" />
        </div>
      </Card>
    )
  }

  const peTtm = valuationData?.pe_ttm ?? 0
  const pb = valuationData?.pb ?? 0
  const ps = valuationData?.ps ?? 0
  const peg = valuationData?.peg ?? 0
  const pePercentile = valuationData?.pe_percentile ?? 50
  const industryPe = valuationData?.industry_pe
  const industryPb = valuationData?.industry_pb
  const hasValuationData = peTtm > 0 || pb > 0 || ps > 0

  const peHistory = peBandData?.pe_history ?? []
  const pePercentiles = peBandData?.pe_percentiles ?? { p10: 20, p25: 25, p50: 30, p75: 35, p90: 40 }
  const currentPe = peBandData?.current_pe ?? 0
  const targetPrices = peBandData?.target_prices
  const grahamNumber = peBandData?.graham_number

  const peBandOption = peHistory.length > 0
    ? createPEBandChartOption(peHistory, pePercentiles, currentPe, isDark)
    : null

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 90) return 'text-red-500'
    if (percentile >= 75) return 'text-orange-500'
    if (percentile >= 50) return 'text-yellow-500'
    if (percentile >= 25) return 'text-blue-500'
    return 'text-green-500'
  }

  const getPercentileLabel = (percentile: number) => {
    if (percentile >= 90) return '高估'
    if (percentile >= 75) return '偏贵'
    if (percentile >= 50) return '中性'
    if (percentile >= 25) return '偏低'
    return '低估'
  }

  return (
    <Card className="border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">估值体系</h3>
        {pePercentile > 0 ? (
          <Badge variant="outline" className="flex items-center gap-1">
            PE分位:
            <span className={getPercentileColor(pePercentile)}>
              {pePercentile.toFixed(0)}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({getPercentileLabel(pePercentile)})
            </span>
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            数据加载中
          </Badge>
        )}
      </div>

      {!hasValuationData && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
          <div className="text-sm text-yellow-600 dark:text-yellow-400">
            估值数据正在加载，部分指标可能需要更长时间从数据源返回。
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          label="PE(TTM)"
          value={peTtm > 0 ? peTtm.toFixed(1) : '-'}
          subValue={industryPe && industryPe > 0 ? `行业: ${industryPe.toFixed(1)}` : undefined}
        />
        <MetricCard
          label="PB"
          value={pb > 0 ? pb.toFixed(2) : '-'}
          subValue={industryPb && industryPb > 0 ? `行业: ${industryPb.toFixed(2)}` : undefined}
        />
        <MetricCard label="PS" value={ps > 0 ? ps.toFixed(2) : '-'} />
        <MetricCard label="PEG" value={peg > 0 ? peg.toFixed(2) : '-'} />
      </div>

      <Tabs defaultValue="peband" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="peband">PE Band</TabsTrigger>
          <TabsTrigger value="target">目标价情景</TabsTrigger>
          <TabsTrigger value="graham">Graham 公式</TabsTrigger>
        </TabsList>

        <TabsContent value="peband">
          {peBandOption ? (
            <BaseChart option={peBandOption} height={300} isDark={isDark} />
          ) : (
            <Placeholder
              icon={<TrendingUp className="mb-2 h-8 w-8 opacity-50" />}
              title="PE Band 数据加载中..."
              description="该数据通常需要更长时间获取。"
            />
          )}
        </TabsContent>

        <TabsContent value="target">
          {targetPrices && (targetPrices.optimistic > 0 || targetPrices.neutral > 0) ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <ScenarioCard
                color="green"
                icon={<TrendingUp className="h-4 w-4 text-green-500" />}
                title="乐观情景"
                price={targetPrices.optimistic ?? 0}
                description={`上涨空间: ${(targetPrices.upside_potential?.optimistic ?? 0).toFixed(1)}%`}
                footer="P90 PE × EPS"
              />
              <ScenarioCard
                color="blue"
                title="中性情景"
                price={targetPrices.neutral ?? 0}
                description={`涨跌空间: ${(targetPrices.upside_potential?.neutral ?? 0).toFixed(1)}%`}
                footer="P50 PE × EPS"
              />
              <ScenarioCard
                color="red"
                icon={<TrendingDown className="h-4 w-4 text-red-500" />}
                title="悲观情景"
                price={targetPrices.pessimistic ?? 0}
                description={`下跌风险: ${Math.abs(targetPrices.upside_potential?.pessimistic ?? 0).toFixed(1)}%`}
                footer="P10 PE × EPS"
              />
            </div>
          ) : (
            <Placeholder
              icon={<Calculator className="mb-2 h-8 w-8 opacity-50" />}
              title="目标价数据计算中..."
              description="需要 PE 历史数据支持。"
            />
          )}
        </TabsContent>

        <TabsContent value="graham">
          {grahamNumber && grahamNumber > 0 ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 p-6 text-center">
                <div className="mb-2 text-sm text-muted-foreground">Graham 内在价值</div>
                <div className="text-3xl font-bold text-primary">¥{grahamNumber.toFixed(2)}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  = √(22.5 × EPS × BVPS)
                </div>
              </div>
              <div className="rounded-lg bg-muted/20 p-4 text-xs text-muted-foreground">
                <p className="mb-2 font-medium text-foreground">Graham 公式说明：</p>
                <p>• 22.5 是 Graham 认为合理的 PE × PB 乘数。</p>
                <p>• EPS = 每股收益，BVPS = 每股净资产。</p>
                <p>• 更适合稳定盈利企业，不适合高成长股。</p>
              </div>
            </div>
          ) : (
            <Placeholder
              icon={<Calculator className="mb-2 h-8 w-8 opacity-50" />}
              title="Graham 估值计算中..."
              description="需要 EPS 和 BVPS 数据。"
            />
          )}
        </TabsContent>
      </Tabs>
    </Card>
  )
}

function MetricCard({
  label,
  value,
  subValue,
}: {
  label: string
  value: string
  subValue?: string
}) {
  const isActive = value !== '-'

  return (
    <div className="rounded-lg bg-muted/30 p-3 text-center">
      <div className="mb-1 text-sm text-muted-foreground">{label}</div>
      <div className={cn('text-lg font-bold', isActive ? 'text-foreground' : 'text-muted-foreground')}>
        {value}
      </div>
      {subValue && <div className="text-xs text-muted-foreground">{subValue}</div>}
    </div>
  )
}

function ScenarioCard({
  color,
  title,
  price,
  description,
  footer,
  icon,
}: {
  color: 'green' | 'blue' | 'red'
  title: string
  price: number
  description: string
  footer: string
  icon?: ReactNode
}) {
  const toneClass = {
    green: 'border-green-500/20 bg-green-500/10 text-green-500',
    blue: 'border-blue-500/20 bg-blue-500/10 text-blue-500',
    red: 'border-red-500/20 bg-red-500/10 text-red-500',
  }[color]

  return (
    <div className={cn('rounded-lg border p-4 text-center', toneClass)}>
      <div className="mb-2 flex items-center justify-center gap-1 text-sm text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="text-2xl font-bold">¥{price.toFixed(2)}</div>
      <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      <div className="mt-1 text-xs text-muted-foreground">{footer}</div>
    </div>
  )
}

function Placeholder({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
      {icon}
      <p>{title}</p>
      <p className="mt-1 text-sm">{description}</p>
    </div>
  )
}
