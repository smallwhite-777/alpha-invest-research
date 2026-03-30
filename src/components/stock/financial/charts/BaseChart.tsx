'use client'

import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'
import { registerThemes, getThemeName, CHART_COLORS } from '@/lib/chart-theme'

// 确保主题已注册
registerThemes()

interface BaseChartProps {
  option: object
  height?: number | string
  width?: number | string
  isDark?: boolean
  className?: string
  onEvents?: Record<string, (params: any) => void>
  notMerge?: boolean
  lazyUpdate?: boolean
}

/**
 * ECharts基础封装组件
 * 自动处理主题切换、尺寸响应等
 */
export function BaseChart({
  option,
  height = 300,
  width = '100%',
  isDark = false,
  className = '',
  onEvents,
  notMerge = false,
  lazyUpdate = false
}: BaseChartProps) {
  const themeName = useMemo(() => getThemeName(isDark), [isDark])

  // 基础配置合并
  const mergedOption = useMemo(() => {
    return {
      ...option,
      // 添加通用配置
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '10%',
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)',
        borderColor: isDark ? '#1f1f22' : '#e5e5e5',
        textStyle: {
          color: isDark ? '#f5f5f7' : '#1c1c1e'
        }
      }
    }
  }, [option, isDark])

  return (
    <div className={`chart-container ${className}`} style={{ height, width }}>
      <ReactECharts
        option={mergedOption}
        theme={themeName}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        onEvents={onEvents}
        notMerge={notMerge}
        lazyUpdate={lazyUpdate}
      />
    </div>
  )
}

/**
 * 获取图表颜色
 */
export function getChartColors(isDark: boolean) {
  return {
    primary: CHART_COLORS.primary,     // #00d4aa
    secondary: CHART_COLORS.secondary, // #3b82f6
    tertiary: CHART_COLORS.tertiary,   // #f97316
    danger: CHART_COLORS.danger,       // #ef4444
    purple: CHART_COLORS.purple,       // #8b5cf6
    cyan: CHART_COLORS.cyan,           // #06b6d4
    text: isDark ? '#f5f5f7' : '#1c1c1e',
    textSecondary: isDark ? '#a1a1a6' : '#6b7280',
    background: isDark ? '#0a0a0c' : '#ffffff',
    grid: isDark ? '#1f1f22' : '#d1d1d6'
  }
}

/**
 * 生成渐变色
 */
export function createGradientColor(
  color: string,
  direction: 'vertical' | 'horizontal' = 'vertical',
  opacityStart: number = 0.3,
  opacityEnd: number = 0.01
) {
  const x = direction === 'vertical' ? 0 : 0
  const x2 = direction === 'vertical' ? 0 : 1
  const y = direction === 'vertical' ? 0 : 0
  const y2 = direction === 'vertical' ? 1 : 0

  // 将颜色转换为rgba格式
  const toRgba = (c: string | undefined | null, alpha: number): string => {
    // 如果颜色为空，返回默认颜色
    if (!c) return `rgba(0, 212, 170, ${alpha})`
    // 如果已经是rgba格式，直接返回
    if (c.startsWith('rgba')) return c
    // 如果是rgb格式，转换为rgba
    if (c.startsWith('rgb')) {
      return c.replace('rgb', 'rgba').replace(')', `, ${alpha})`)
    }
    // 如果是hex格式，转换为rgba
    if (c.startsWith('#')) {
      const hex = c.slice(1)
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
    // 默认返回带透明度的颜色
    return `rgba(0, 212, 170, ${alpha})`
  }

  return {
    type: 'linear',
    x,
    y,
    x2,
    y2,
    colorStops: [
      { offset: 0, color: toRgba(color, opacityStart) },
      { offset: 1, color: toRgba(color, opacityEnd) }
    ]
  }
}

/**
 * 格式化大数字显示
 */
export function formatLargeNumber(value: number): string {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}万亿`
  }
  if (value >= 100) {
    return `${(value).toFixed(0)}亿`
  }
  return `${value.toFixed(2)}亿`
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}