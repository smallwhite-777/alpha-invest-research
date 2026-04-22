'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { StockBasicInfo, RadarResponse, TenYearTrend } from '@/types/financial'
import { RadarChart } from './RadarChart'
import { TrendCharts } from './TrendCharts'
import { CompositeScore } from './CompositeScore'

interface CoreOverviewCardProps {
  stockCode: string
  basicInfo?: StockBasicInfo
  radarData?: RadarResponse
  tenYearTrend?: TenYearTrend[]
  isDark?: boolean
  isLoading?: boolean
}

export function CoreOverviewCard({
  stockCode,
  basicInfo,
  radarData,
  tenYearTrend,
  isDark = false,
  isLoading = false,
}: CoreOverviewCardProps) {
  if (isLoading) {
    return (
      <Card className="p-5 bg-card border-border">
        <div className="flex items-center justify-center h-40">
          <div className="animate-pulse text-muted-foreground">加载中...</div>
        </div>
      </Card>
    )
  }

  const safeBasicInfo = {
    stock_code: basicInfo?.stock_code ?? stockCode,
    stock_name: basicInfo?.stock_name ?? '',
    industry: basicInfo?.industry ?? '',
    sector: basicInfo?.sector ?? '',
    market_cap: basicInfo?.market_cap ?? 0,
    listing_date: basicInfo?.listing_date ?? '',
    exchange: basicInfo?.exchange ?? 'SH',
  }

  const safeTrend = tenYearTrend ?? []

  return (
    <Card className="p-5 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">核心概览</h3>
          <Badge variant="outline" className="text-xs">
            {safeBasicInfo.industry || '未知行业'}
          </Badge>
        </div>
        {radarData?.composite_score !== undefined && (
          <CompositeScore score={radarData.composite_score} />
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground mb-1">市值</div>
          <div className="text-lg font-semibold text-foreground">
            {safeBasicInfo.market_cap > 0 ? `${safeBasicInfo.market_cap.toFixed(0)}亿` : '-'}
          </div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground mb-1">交易所</div>
          <div className="text-lg font-semibold text-foreground">
            {safeBasicInfo.exchange === 'SH'
              ? '上交所'
              : safeBasicInfo.exchange === 'SZ'
                ? '深交所'
                : '港交所'}
          </div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground mb-1">所属行业</div>
          <div className="text-lg font-semibold text-foreground truncate">
            {safeBasicInfo.industry || '-'}
          </div>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground mb-1">股票代码</div>
          <div className="text-lg font-semibold text-foreground">
            {safeBasicInfo.stock_code}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-h-[280px]">
          {radarData ? (
            <RadarChart
              scores={radarData.scores}
              industryAvg={radarData.industry_avg_scores}
              compositeScore={radarData.composite_score}
              isDark={isDark}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              暂无雷达评分数据
            </div>
          )}
        </div>

        <div className="min-h-[280px]">
          {safeTrend.length > 0 ? (
            <TrendCharts trends={safeTrend} isDark={isDark} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              暂无历史趋势数据
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
