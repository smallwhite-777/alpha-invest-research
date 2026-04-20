'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BaseChart } from '../charts/BaseChart'
import { createPEBandChartOption } from '../charts/ChartUtils'
import { AlertCircle, TrendingUp, TrendingDown, Calculator } from 'lucide-react'
import { formatPercentValue, formatPriceCny } from '@/lib/financial-format'
import type { PEBandResponse, ValuationMetrics } from '@/types/financial'

interface ProfitValuationProps {
  valuationData?: ValuationMetrics
  peBandData?: PEBandResponse
  isLoading?: boolean
  isDark?: boolean
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function ProfitValuation({
  valuationData,
  peBandData,
  isLoading = false,
  isDark = false,
}: ProfitValuationProps) {
  if (isLoading) {
    return (
      <Card className="p-5 bg-card border-border">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-muted rounded w-24" />
            <div className="h-6 bg-muted rounded w-24" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30">
                <div className="h-4 bg-muted rounded w-12 mb-2 mx-auto" />
                <div className="h-6 bg-muted rounded w-16 mx-auto" />
              </div>
            ))}
          </div>
          <div className="h-64 bg-muted/30 rounded-lg" />
        </div>
      </Card>
    )
  }

  const peTtm = valuationData?.pe_ttm ?? 0
  const pb = valuationData?.pb ?? 0
  const ps = valuationData?.ps ?? 0
  const peg = valuationData?.peg ?? 0
  const pePercentile = valuationData?.pe_percentile ?? 0
  const valuationCompat = (valuationData ?? {}) as ValuationMetrics & {
    industry_avg_pe?: number
    industry_avg_pb?: number
  }
  const industryPe = valuationCompat.industry_pe ?? valuationCompat.industry_avg_pe ?? 0
  const industryPb = valuationCompat.industry_pb ?? valuationCompat.industry_avg_pb ?? 0
  const hasValuationData = peTtm > 0 || pb > 0 || ps > 0

  const peHistory = peBandData?.pe_history ?? []
  const pePercentiles = peBandData?.pe_percentiles ?? { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 }
  const currentPe = peBandData?.current_pe ?? 0
  const currentEps = peBandData?.current_eps ?? 0
  const targetPrices = peBandData?.target_prices
  const grahamNumber = peBandData?.graham_number ?? 0

  const peBandOption =
    peHistory.length > 0 ? createPEBandChartOption(peHistory, pePercentiles, currentPe, isDark) : null

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 90) return 'text-red-500'
    if (percentile >= 75) return 'text-orange-500'
    if (percentile >= 50) return 'text-yellow-500'
    if (percentile >= 25) return 'text-blue-500'
    return 'text-green-500'
  }

  const getPercentileLabel = (percentile: number) => {
    if (percentile >= 90) return '明显高估'
    if (percentile >= 75) return '偏贵'
    if (percentile >= 50) return '中性'
    if (percentile >= 25) return '偏低'
    return '低估'
  }

  return (
    <Card className="p-5 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">估值体系</h3>
        {pePercentile > 0 ? (
          <Badge variant="outline" className="flex items-center gap-1">
            PE 分位
            <span className={getPercentileColor(pePercentile)}>{pePercentile.toFixed(0)}%</span>
            <span className="text-xs text-muted-foreground">({getPercentileLabel(pePercentile)})</span>
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            估值数据加载中
          </Badge>
        )}
      </div>

      {!hasValuationData ? (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-600 dark:text-yellow-400">
            估值指标正在加载，历史估值与目标价会在数据返回后自动更新。
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="PE(TTM)" value={peTtm > 0 ? peTtm.toFixed(1) : '-'} subValue={industryPe > 0 ? `行业 ${industryPe.toFixed(1)}` : undefined} />
        <MetricCard label="PB" value={pb > 0 ? pb.toFixed(2) : '-'} subValue={industryPb > 0 ? `行业 ${industryPb.toFixed(2)}` : undefined} />
        <MetricCard label="PS" value={ps > 0 ? ps.toFixed(2) : '-'} />
        <MetricCard label="PEG" value={peg > 0 ? peg.toFixed(2) : '-'} />
      </div>

      <Tabs defaultValue="peband" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="peband">PE Band</TabsTrigger>
          <TabsTrigger value="target">目标价情景</TabsTrigger>
          <TabsTrigger value="graham">Graham 估值</TabsTrigger>
        </TabsList>

        <TabsContent value="peband">
          {peBandOption ? (
            <BaseChart option={peBandOption} height={300} isDark={isDark} />
          ) : (
            <EmptyState
              icon={<TrendingUp className="w-8 h-8 mb-2 opacity-50" />}
              title="PE Band 数据加载中"
              description="需要历史价格与每股收益共同计算。"
            />
          )}
        </TabsContent>

        <TabsContent value="target">
          {targetPrices && (targetPrices.optimistic > 0 || targetPrices.neutral > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ScenarioCard
                tone="green"
                icon={<TrendingUp className="w-4 h-4 text-green-500" />}
                title="乐观情景"
                price={targetPrices.optimistic}
                description={`上涨空间 ${formatPercentValue(targetPrices.upside_potential?.optimistic ?? 0)}`}
                footnote="P90 PE × EPS"
              />
              <ScenarioCard
                tone="blue"
                title="中性情景"
                price={targetPrices.neutral}
                description={`相对空间 ${formatPercentValue(targetPrices.upside_potential?.neutral ?? 0)}`}
                footnote="P50 PE × EPS"
              />
              <ScenarioCard
                tone="red"
                icon={<TrendingDown className="w-4 h-4 text-red-500" />}
                title="保守情景"
                price={targetPrices.pessimistic}
                description={`下行空间 ${formatPercentValue(Math.abs(targetPrices.upside_potential?.pessimistic ?? 0))}`}
                footnote="P10 PE × EPS"
              />
            </div>
          ) : (
            <EmptyState
              icon={<Calculator className="w-8 h-8 mb-2 opacity-50" />}
              title="目标价数据计算中"
              description="需要历史估值分位与 EPS 数据支撑。"
            />
          )}
        </TabsContent>

        <TabsContent value="graham">
          {grahamNumber > 0 ? (
            <div className="space-y-4">
              <div className="text-center p-6 rounded-lg bg-muted/30">
                <div className="text-sm text-muted-foreground mb-2">Graham 内在价值</div>
                <div className="text-3xl font-bold text-primary">{formatPriceCny(grahamNumber)}</div>
                <div className="text-sm text-muted-foreground mt-2">
                  基于 EPS {currentEps > 0 ? currentEps.toFixed(2) : '-'} 与当前 PE {currentPe > 0 ? currentPe.toFixed(2) : '-'}
                </div>
              </div>
              <div className="text-xs text-muted-foreground p-4 rounded-lg bg-muted/20 space-y-1">
                <p className="mb-2 font-medium text-foreground">Graham 公式说明</p>
                <p>22.5 代表经典价值投资框架中的合理 PE × PB 上限。</p>
                <p>计算公式为 √(22.5 × EPS × BVPS)。</p>
                <p>更适合盈利相对稳定的成熟企业，不适合高波动高成长公司单独使用。</p>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Calculator className="w-8 h-8 mb-2 opacity-50" />}
              title="Graham 估值计算中"
              description="需要 EPS 与每股净资产数据。"
            />
          )}
        </TabsContent>
      </Tabs>
    </Card>
  )
}

function MetricCard({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/30">
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className={cn('text-lg font-bold', value !== '-' ? 'text-foreground' : 'text-muted-foreground')}>
        {value}
      </div>
      {subValue ? <div className="text-xs text-muted-foreground">{subValue}</div> : null}
    </div>
  )
}

function ScenarioCard({
  tone,
  icon,
  title,
  price,
  description,
  footnote,
}: {
  tone: 'green' | 'blue' | 'red'
  icon?: React.ReactNode
  title: string
  price: number
  description: string
  footnote: string
}) {
  const toneClass =
    tone === 'green'
      ? 'bg-green-500/10 border-green-500/20 text-green-500'
      : tone === 'red'
        ? 'bg-red-500/10 border-red-500/20 text-red-500'
        : 'bg-blue-500/10 border-blue-500/20 text-blue-500'

  return (
    <div className={`text-center p-4 rounded-lg border ${toneClass}`}>
      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-2">
        {icon}
        {title}
      </div>
      <div className="text-2xl font-bold">{formatPriceCny(price)}</div>
      <div className="text-sm text-muted-foreground mt-1">{description}</div>
      <div className="text-xs text-muted-foreground mt-1">{footnote}</div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
      {icon}
      <p>{title}</p>
      <p className="text-sm mt-1">{description}</p>
    </div>
  )
}
