'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { ClientErrorBoundary } from '@/components/ui/ClientErrorBoundary'

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => null,
})

interface SafeEChartProps {
  option: Record<string, unknown>
  height?: number | string
  width?: number | string
  className?: string
  chartKey?: string
  fallback?: React.ReactNode
  theme?: string
  onEvents?: Record<string, (params: unknown) => void>
  notMerge?: boolean
  lazyUpdate?: boolean
}

export function SafeEChart({
  option,
  height = '100%',
  width = '100%',
  className,
  chartKey,
  fallback,
  theme,
  onEvents,
  notMerge = true,
  lazyUpdate = true,
}: SafeEChartProps) {
  const style = useMemo(() => ({ height, width }), [height, width])

  return (
    <ClientErrorBoundary resetKey={chartKey} fallback={fallback}>
      <ReactECharts
        option={option}
        style={style}
        className={className}
        theme={theme}
        onEvents={onEvents}
        notMerge={notMerge}
        lazyUpdate={lazyUpdate}
        opts={{ renderer: 'canvas' }}
      />
    </ClientErrorBoundary>
  )
}
