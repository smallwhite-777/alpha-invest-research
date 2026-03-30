'use client'

import { BaseChart } from '../charts/BaseChart'
import { createRadarChartOption } from '../charts/ChartUtils'
import type { RadarScores } from '@/types/financial'

interface RadarChartProps {
  scores?: RadarScores
  industryAvg?: RadarScores
  compositeScore?: number
  isDark?: boolean
}

export function RadarChart({
  scores,
  industryAvg,
  compositeScore,
  isDark = false
}: RadarChartProps) {
  const option = createRadarChartOption(scores, industryAvg, isDark)

  return (
    <div className="relative">
      <BaseChart
        option={option}
        height={260}
        isDark={isDark}
      />
      {compositeScore !== undefined && (
        <div className="absolute top-2 right-2 text-xs text-muted-foreground">
          综合评分: <span className="font-bold text-primary">{compositeScore}</span>
        </div>
      )}
    </div>
  )
}