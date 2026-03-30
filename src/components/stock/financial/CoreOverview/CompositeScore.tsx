'use client'

import { cn } from '@/lib/utils'

interface CompositeScoreProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function CompositeScore({
  score,
  size = 'md',
  showLabel = true
}: CompositeScoreProps) {
  // 根据评分确定颜色和标签
  const getScoreConfig = (s: number) => {
    if (s >= 80) return { color: 'text-green-500', bg: 'bg-green-500/10', label: '优秀' }
    if (s >= 60) return { color: 'text-blue-500', bg: 'bg-blue-500/10', label: '良好' }
    if (s >= 40) return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: '中等' }
    if (s >= 20) return { color: 'text-orange-500', bg: 'bg-orange-500/10', label: '较差' }
    return { color: 'text-red-500', bg: 'bg-red-500/10', label: '危险' }
  }

  const config = getScoreConfig(score)

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl'
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold',
          sizeClasses[size],
          config.bg
        )}
      >
        <span className={config.color}>{score}</span>
      </div>
      {showLabel && (
        <span className={cn('text-xs font-medium', config.color)}>
          {config.label}
        </span>
      )}
    </div>
  )
}

/**
 * 评分详情卡片
 */
interface ScoreDetailProps {
  label: string
  score: number
  maxScore?: number
}

export function ScoreDetail({
  label,
  score,
  maxScore = 100
}: ScoreDetailProps) {
  const percentage = (score / maxScore) * 100

  const getColorClass = (p: number) => {
    if (p >= 80) return 'bg-green-500'
    if (p >= 60) return 'bg-blue-500'
    if (p >= 40) return 'bg-yellow-500'
    if (p >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-sm font-medium text-foreground">{score}</span>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full', getColorClass(percentage))}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}