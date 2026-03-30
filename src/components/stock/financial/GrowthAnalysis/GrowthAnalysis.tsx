'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'
import type { GrowthResponse, QuarterlyGrowth, GrowthHistoryItem } from '@/types/financial'

interface GrowthAnalysisProps {
  data?: GrowthResponse
  isLoading?: boolean
  isDark?: boolean
}

export function GrowthAnalysis({
  data,
  isLoading = false,
  isDark = false
}: GrowthAnalysisProps) {

  // 加载骨架屏
  if (isLoading) {
    return (
      <Card className="p-5 bg-card border-border">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-muted rounded w-24"></div>
            <div className="h-6 bg-muted rounded w-16"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {[1,2,3].map(i => (
              <div key={i} className="p-4 rounded-lg bg-muted/30">
                <div className="h-4 bg-muted rounded w-20 mb-3"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="h-40 bg-muted/30 rounded-lg"></div>
        </div>
      </Card>
    )
  }

  // 无数据状态
  if (!data) {
    return (
      <Card className="p-5 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">成长性分析</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
          <p>成长性数据加载中...</p>
          <p className="text-sm mt-1">正在从本地财报数据库获取数据</p>
        </div>
      </Card>
    )
  }

  // 安全获取数据
  const cagr = data.cagr ?? {}
  const quarterlyGrowth = data.quarterly_growth ?? []
  const sustainabilityScore = data.sustainability_score ?? 50
  const growthQuality = data.growth_quality ?? '未知'
  const history = data.history ?? []

  // 检查是否有有效数据
  const hasCagrData = Object.values(cagr).some(v => v !== undefined && v !== null)
  const hasQuarterlyData = quarterlyGrowth.length > 0

  // 根据CAGR确定增长质量颜色
  const getQualityConfig = (quality: string) => {
    switch (quality) {
      case '高速增长': return { color: 'text-green-500 bg-green-500/10', icon: <TrendingUp className="w-4 h-4" /> }
      case '稳定增长': return { color: 'text-blue-500 bg-blue-500/10', icon: <TrendingUp className="w-4 h-4" /> }
      case '缓慢增长': return { color: 'text-yellow-500 bg-yellow-500/10', icon: <Minus className="w-4 h-4" /> }
      case '负增长': return { color: 'text-red-500 bg-red-500/10', icon: <TrendingDown className="w-4 h-4" /> }
      default: return { color: 'text-muted-foreground bg-muted/30', icon: <Minus className="w-4 h-4" /> }
    }
  }

  const qualityConfig = getQualityConfig(growthQuality)

  // 格式化CAGR值
  const formatCagr = (value: number | undefined | null) => {
    if (value === undefined || value === null) {
      return <span className="text-muted-foreground">-</span>
    }
    const colorClass = value >= 20 ? 'text-green-500' :
                       value >= 10 ? 'text-blue-500' :
                       value >= 0 ? 'text-yellow-500' : 'text-red-500'
    return (
      <span className={`font-medium ${colorClass}`}>
        {value >= 0 ? '+' : ''}{value.toFixed(1)}%
      </span>
    )
  }

  // 格式化增长率（带颜色）
  const formatGrowth = (value: number | undefined | null, showSign = true) => {
    if (value === undefined || value === null) {
      return <span className="text-muted-foreground">-</span>
    }
    const colorClass = value >= 0 ? 'text-green-500' : 'text-red-500'
    return (
      <span className={`font-medium ${colorClass}`}>
        {showSign && value >= 0 ? '+' : ''}{value.toFixed(1)}%
      </span>
    )
  }

  return (
    <Card className="p-5 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">成长性分析</h3>
        <Badge className={`flex items-center gap-1 ${qualityConfig.color}`}>
          {qualityConfig.icon}
          {growthQuality}
        </Badge>
      </div>

      {/* 无数据提示 */}
      {!hasCagrData && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-500">
            CAGR数据需要至少3年历史数据才能计算
          </div>
        </div>
      )}

      {/* CAGR数据 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {/* 营收CAGR */}
        <div className="p-4 rounded-lg bg-muted/30">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">营收CAGR</h4>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">3年</span>
              {formatCagr(cagr.revenue_3yr)}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">5年</span>
              {formatCagr(cagr.revenue_5yr)}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">10年</span>
              {formatCagr(cagr.revenue_10yr)}
            </div>
          </div>
        </div>

        {/* 净利润CAGR */}
        <div className="p-4 rounded-lg bg-muted/30">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">净利润CAGR</h4>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">3年</span>
              {formatCagr(cagr.profit_3yr)}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">5年</span>
              {formatCagr(cagr.profit_5yr)}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">10年</span>
              {formatCagr(cagr.profit_10yr)}
            </div>
          </div>
        </div>

        {/* EPS CAGR */}
        <div className="p-4 rounded-lg bg-muted/30">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">EPS CAGR</h4>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">3年</span>
              {formatCagr(cagr.eps_3yr)}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">5年</span>
              {formatCagr(cagr.eps_5yr)}
            </div>
          </div>
        </div>
      </div>

      {/* 成长可持续性评分 */}
      <div className="mb-6 p-4 rounded-lg bg-muted/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">成长可持续性评分</span>
          <span className={`text-lg font-bold ${
            sustainabilityScore >= 80 ? 'text-green-500' :
            sustainabilityScore >= 60 ? 'text-blue-500' :
            sustainabilityScore >= 40 ? 'text-yellow-500' : 'text-red-500'
          }`}>
            {sustainabilityScore}
          </span>
        </div>
        <div className="h-3 rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              sustainabilityScore >= 80 ? 'bg-green-500' :
              sustainabilityScore >= 60 ? 'bg-blue-500' :
              sustainabilityScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, sustainabilityScore))}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>低(0-40)</span>
          <span>中(40-60)</span>
          <span>良(60-80)</span>
          <span>优(80-100)</span>
        </div>
      </div>

      {/* 年度历史数据 */}
      {history.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">年度增长趋势</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2 text-left text-muted-foreground">年份</th>
                  <th className="p-2 text-right text-muted-foreground">营收(亿)</th>
                  <th className="p-2 text-right text-muted-foreground">净利润(亿)</th>
                  <th className="p-2 text-right text-muted-foreground">营收增长</th>
                  <th className="p-2 text-right text-muted-foreground">利润增长</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(-10).reverse().map((h, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-2 text-muted-foreground">{h.year ?? '-'}</td>
                    <td className="p-2 text-right text-foreground">
                      {h.revenue ? h.revenue.toFixed(1) : '-'}
                    </td>
                    <td className="p-2 text-right text-foreground">
                      {h.net_profit ? h.net_profit.toFixed(1) : '-'}
                    </td>
                    <td className="p-2 text-right">
                      {formatGrowth(h.revenue_growth, false)}
                    </td>
                    <td className="p-2 text-right">
                      {formatGrowth(h.profit_growth, false)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 季度增长数据表格 */}
      {hasQuarterlyData ? (
        <div className="overflow-x-auto">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">季度增长</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2 text-left text-muted-foreground">季度</th>
                <th className="p-2 text-center text-muted-foreground">营收同比</th>
                <th className="p-2 text-center text-muted-foreground">营收环比</th>
                <th className="p-2 text-center text-muted-foreground">利润同比</th>
                <th className="p-2 text-center text-muted-foreground">利润环比</th>
              </tr>
            </thead>
            <tbody>
              {quarterlyGrowth.slice(0, 8).map((q, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="p-2 text-muted-foreground">{q.quarter ?? '-'}</td>
                  <td className="p-2 text-center">
                    {formatGrowth(q.revenue_yoy, false)}
                  </td>
                  <td className="p-2 text-center">
                    {formatGrowth(q.revenue_qoq, false)}
                  </td>
                  <td className="p-2 text-center">
                    {formatGrowth(q.profit_yoy, false)}
                  </td>
                  <td className="p-2 text-center">
                    {formatGrowth(q.profit_qoq, false)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center p-4 rounded-lg bg-muted/30 text-muted-foreground">
          <AlertCircle className="w-5 h-5 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无季度增长数据</p>
          <p className="text-xs mt-1">需要至少2年季报数据才能计算同比增长</p>
        </div>
      )}
    </Card>
  )
}