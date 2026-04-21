'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BaseChart } from '../charts/BaseChart'
import { createPEBandChartOption } from '../charts/ChartUtils'
import { AlertCircle, TrendingUp, TrendingDown, Calculator } from 'lucide-react'
import type { PEBandResponse, ValuationMetrics } from '@/types/financial'

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
  isDark = false
}: ProfitValuationProps) {

  // 加载骨架屏
  if (isLoading) {
    return (
      <Card className="p-5 bg-card border-border">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-muted rounded w-24"></div>
            <div className="h-6 bg-muted rounded w-20"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="p-3 rounded-lg bg-muted/30">
                <div className="h-4 bg-muted rounded w-12 mb-2 mx-auto"></div>
                <div className="h-6 bg-muted rounded w-16 mx-auto"></div>
              </div>
            ))}
          </div>
          <div className="h-64 bg-muted/30 rounded-lg"></div>
        </div>
      </Card>
    )
  }

  // 安全获取估值数据
  const peTtm = valuationData?.pe_ttm ?? 0
  const pb = valuationData?.pb ?? 0
  const ps = valuationData?.ps ?? 0
  const peg = valuationData?.peg ?? 0
  const pePercentile = valuationData?.pe_percentile ?? 50
  const industryPe = valuationData?.industry_pe
  const industryPb = valuationData?.industry_pb

  // 检查是否有有效数据
  const hasValuationData = peTtm > 0 || pb > 0 || ps > 0

  // 安全获取 PE Band 数据
  const peHistory = peBandData?.pe_history ?? []
  const pePercentiles = peBandData?.pe_percentiles ?? { p10: 20, p25: 25, p50: 30, p75: 35, p90: 40 }
  const currentPe = peBandData?.current_pe ?? 0
  const currentEps = peBandData?.current_eps ?? 0
  const targetPrices = peBandData?.target_prices
  const grahamNumber = peBandData?.graham_number

  // PE Band图表
  const peBandOption = peHistory.length > 0
    ? createPEBandChartOption(peHistory, pePercentiles, currentPe, isDark)
    : null

  // 格式化PE分位颜色
  const getPercentileColor = (percentile: number) => {
    if (percentile >= 90) return 'text-red-500' // 高估
    if (percentile >= 75) return 'text-orange-500'
    if (percentile >= 50) return 'text-yellow-500'
    if (percentile >= 25) return 'text-blue-500'
    return 'text-green-500' // 低估
  }

  // PE分位评估文字
  const getPercentileLabel = (percentile: number) => {
    if (percentile >= 90) return '高估'
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
            PE分位: <span className={getPercentileColor(pePercentile)}>
              {pePercentile.toFixed(0)}%
            </span>
            <span className="text-xs text-muted-foreground">({getPercentileLabel(pePercentile)})</span>
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            数据加载中
          </Badge>
        )}
      </div>

      {/* 无数据提示 */}
      {!hasValuationData && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-500">
            估值数据加载中，部分指标可能需要较长时间从数据源获取
          </div>
        </div>
      )}

      {/* 估值指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground mb-1">PE(TTM)</div>
          <div className={cn(
            'text-lg font-bold',
            peTtm > 0 ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {peTtm > 0 ? peTtm.toFixed(1) : '-'}
          </div>
          {industryPe !== undefined && industryPe > 0 && (
            <div className="text-xs text-muted-foreground">
              行业: {industryPe.toFixed(1)}
            </div>
          )}
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground mb-1">PB</div>
          <div className={cn(
            'text-lg font-bold',
            pb > 0 ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {pb > 0 ? pb.toFixed(2) : '-'}
          </div>
          {industryPb !== undefined && industryPb > 0 && (
            <div className="text-xs text-muted-foreground">
              行业: {industryPb.toFixed(2)}
            </div>
          )}
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground mb-1">PS</div>
          <div className={cn(
            'text-lg font-bold',
            ps > 0 ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {ps > 0 ? ps.toFixed(2) : '-'}
          </div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground mb-1">PEG</div>
          <div className={cn(
            'text-lg font-bold',
            peg > 0 ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {peg > 0 ? peg.toFixed(2) : '-'}
          </div>
        </div>
      </div>

      {/* PE Band图和目标价 */}
      <Tabs defaultValue="peband" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="peband">PE Band</TabsTrigger>
          <TabsTrigger value="target">目标价情景</TabsTrigger>
          <TabsTrigger value="graham">Graham公式</TabsTrigger>
        </TabsList>

        <TabsContent value="peband">
          {peBandOption ? (
            <BaseChart
              option={peBandOption}
              height={300}
              isDark={isDark}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
              <p>PE Band数据加载中...</p>
              <p className="text-sm mt-1">该数据需要较长时间获取</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="target">
          {targetPrices && (targetPrices.optimistic > 0 || targetPrices.neutral > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 乐观 */}
              <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  乐观情景
                </div>
                <div className="text-2xl font-bold text-green-500">
                  ¥{(targetPrices.optimistic ?? 0).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  上涨空间: <span className="text-green-500">
                    {(targetPrices.upside_potential?.optimistic ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">P90 PE × EPS</div>
              </div>

              {/* 中性 */}
              <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="text-sm text-muted-foreground mb-2">中性情景</div>
                <div className="text-2xl font-bold text-blue-500">
                  ¥{(targetPrices.neutral ?? 0).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  涨跌空间: <span className="text-blue-500">
                    {(targetPrices.upside_potential?.neutral ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">P50 PE × EPS</div>
              </div>

              {/* 悲观 */}
              <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  悲观情景
                </div>
                <div className="text-2xl font-bold text-red-500">
                  ¥{(targetPrices.pessimistic ?? 0).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  下跌风险: <span className="text-red-500">
                    {Math.abs(targetPrices.upside_potential?.pessimistic ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">P10 PE × EPS</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Calculator className="w-8 h-8 mb-2 opacity-50" />
              <p>目标价数据计算中...</p>
              <p className="text-sm mt-1">需要PE历史数据支持</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="graham">
          {grahamNumber && grahamNumber > 0 ? (
            <div className="space-y-4">
              <div className="text-center p-6 rounded-lg bg-muted/30">
                <div className="text-sm text-muted-foreground mb-2">Graham内在价值</div>
                <div className="text-3xl font-bold text-primary">
                  ¥{grahamNumber.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  = √(22.5 × EPS × BVPS)
                </div>
              </div>
              <div className="text-xs text-muted-foreground p-4 rounded-lg bg-muted/20">
                <p className="mb-2 font-medium text-foreground">Graham公式说明:</p>
                <p>• 22.5 是Graham认为合理的PE×PB乘数</p>
                <p>• EPS = 每股收益, BVPS = 每股净资产</p>
                <p>• 适用于稳定盈利的企业，不适用于高成长股</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Calculator className="w-8 h-8 mb-2 opacity-50" />
              <p>Graham估值计算中...</p>
              <p className="text-sm mt-1">需要EPS和BVPS数据</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  )
}

// Helper function
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}