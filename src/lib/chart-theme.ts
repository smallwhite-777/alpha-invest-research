import * as echarts from 'echarts'

const CHART_COLOR_ARRAY = [
  '#00d4aa', // green
  '#3b82f6', // blue
  '#f59e0b', // orange
  '#a855f7', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
]

const CHART_COLORS = {
  primary: '#00d4aa',
  secondary: '#3b82f6',
  tertiary: '#f59e0b',
  danger: '#ef4444',
  purple: '#a855f7',
  cyan: '#06b6d4',
  pink: '#ec4899',
  lime: '#84cc16',
}

function makeTheme(isDark: boolean): Record<string, any> {
  const fg = isDark ? '#f5f5f7' : '#1c1c1e'
  const muted = isDark ? '#636366' : '#8e8e93'
  const border = isDark ? '#1f1f22' : '#d1d1d6'
  const splitColor = isDark ? '#1c1c1e' : '#f2f2f7'
  const tooltipBg = isDark ? 'rgba(18,18,20,0.94)' : 'rgba(255,255,255,0.94)'
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'

  return {
    color: CHART_COLOR_ARRAY,
    backgroundColor: 'transparent',
    textStyle: {
      color: fg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    title: {
      textStyle: { color: fg, fontSize: 14, fontWeight: 600 },
      subtextStyle: { color: muted, fontSize: 12 },
    },
    legend: {
      textStyle: { color: muted, fontSize: 12 },
      pageTextStyle: { color: muted },
    },
    tooltip: {
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      textStyle: { color: fg, fontSize: 12 },
      extraCssText: `box-shadow: 0 4px 20px rgba(0,0,0,${isDark ? '0.4' : '0.1'}); border-radius: 8px;`,
    },
    axisPointer: {
      lineStyle: { color: muted, type: 'dashed' },
      crossStyle: { color: muted },
    },
    xAxis: {
      axisLine: { lineStyle: { color: border } },
      axisTick: { lineStyle: { color: border } },
      axisLabel: { color: muted, fontSize: 11 },
      splitLine: { lineStyle: { color: splitColor, type: 'dashed' } },
    },
    yAxis: {
      axisLine: { lineStyle: { color: border } },
      axisTick: { lineStyle: { color: border } },
      axisLabel: { color: muted, fontSize: 11 },
      splitLine: { lineStyle: { color: splitColor, type: 'dashed' } },
    },
    grid: { borderColor: border },
    categoryAxis: {
      axisLine: { lineStyle: { color: border } },
      axisTick: { lineStyle: { color: border } },
      axisLabel: { color: muted },
      splitLine: { lineStyle: { color: splitColor, type: 'dashed' } },
    },
    valueAxis: {
      axisLine: { lineStyle: { color: border } },
      axisTick: { lineStyle: { color: border } },
      axisLabel: { color: muted },
      splitLine: { lineStyle: { color: splitColor, type: 'dashed' } },
    },
    dataZoom: [
      {
        type: 'inside',
        textStyle: { color: muted },
        borderColor: border,
        handleColor: '#3b82f6',
        moveHandleSize: 12,
        fillerColor: 'rgba(59, 130, 246, 0.1)',
        dataBackground: {
          lineStyle: { color: border },
          areaStyle: { color: 'rgba(59, 130, 246, 0.05)' },
        },
      },
      {
        type: 'slider',
        textStyle: { color: muted },
        borderColor: border,
        handleColor: '#3b82f6',
        fillerColor: 'rgba(59, 130, 246, 0.1)',
        dataBackground: {
          lineStyle: { color: border },
          areaStyle: { color: 'rgba(59, 130, 246, 0.05)' },
        },
      },
    ],
    candlestick: {
      itemStyle: {
        color: '#00d4aa',
        color0: '#ff4757',
        borderColor: '#00d4aa',
        borderColor0: '#ff4757',
      },
    },
    line: { smooth: false, symbol: 'circle', symbolSize: 4 },
    bar: { barMaxWidth: 40 },
  }
}

let darkRegistered = false
let lightRegistered = false

export function registerDarkTheme(): void {
  if (darkRegistered) return
  echarts.registerTheme('dark-terminal', makeTheme(true))
  darkRegistered = true
}

export function registerLightTheme(): void {
  if (lightRegistered) return
  echarts.registerTheme('light-terminal', makeTheme(false))
  lightRegistered = true
}

export function registerThemes(): void {
  registerDarkTheme()
  registerLightTheme()
}

export const DARK_THEME_NAME = 'dark-terminal'
export const LIGHT_THEME_NAME = 'light-terminal'

export function getThemeName(isDark: boolean): string {
  return isDark ? DARK_THEME_NAME : LIGHT_THEME_NAME
}

export function getChartColors(isDark: boolean) {
  return {
    primary: '#00d4aa',
    secondary: '#3b82f6',
    tertiary: '#f59e0b',
    danger: '#ef4444',
    purple: '#a855f7',
    cyan: '#06b6d4',
    fg: isDark ? '#f5f5f7' : '#1c1c1e',
    muted: isDark ? '#636366' : '#8e8e93',
    text: isDark ? '#f5f5f7' : '#1c1c1e',
    textSecondary: isDark ? '#636366' : '#8e8e93',
    border: isDark ? '#1f1f22' : '#d1d1d6',
    grid: isDark ? '#1f1f22' : '#d1d1d6',
    background: isDark ? '#0a0a0c' : '#ffffff',
    splitLine: isDark ? '#1c1c1e' : '#f2f2f7',
  }
}

export { CHART_COLORS }
