'use client'

import { BaseChart } from '../charts/BaseChart'
import { createTrendChartOption } from '../charts/ChartUtils'
import type { TenYearTrend } from '@/types/financial'

interface TrendChartsProps {
  trends?: TenYearTrend[]
  metrics?: ('revenue' | 'net_profit' | 'roe')[]
  isDark?: boolean
}

export function TrendCharts({
  trends,
  metrics = ['revenue', 'net_profit', 'roe'],
  isDark = false
}: TrendChartsProps) {
  // 安全处理趋势数据
  const safeTrends = trends ?? []
  const option = createTrendChartOption(safeTrends, metrics, isDark)

  return (
    <BaseChart
      option={option}
      height={260}
      isDark={isDark}
    />
  )
}