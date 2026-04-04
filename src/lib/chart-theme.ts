import * as echarts from 'echarts'

// Refined editorial palette — matches the Sovereign Analyst design system
const CHART_COLOR_ARRAY = [
  '#001629', // primary navy
  '#3f6653', // secondary emerald
  '#8b6914', // warm gold
  '#58040f', // crimson
  '#74796d', // muted sage
  '#002b49', // deep navy
  '#5a3e1b', // bronze
  '#2d4a3a', // dark emerald
]

const CHART_COLORS = {
  primary: '#001629',
  secondary: '#3f6653',
  tertiary: '#8b6914',
  danger: '#58040f',
  purple: '#74796d',
  cyan: '#002b49',
  pink: '#5a3e1b',
  lime: '#2d4a3a',
}

function makeTheme(isDark: boolean): Record<string, any> {
  const fg = isDark ? '#e4e2dd' : '#1b1c19'
  const muted = isDark ? '#8a8d82' : '#74796d'
  const border = isDark ? '#252523' : '#e4e2dd'
  const splitColor = isDark ? '#1c1c1a' : '#f5f3ee'
  const tooltipBg = isDark ? 'rgba(28,28,26,0.96)' : 'rgba(255,255,255,0.96)'

  const colors = isDark
    ? ['#e4e2dd', '#6fa888', '#d4a841', '#c65d65', '#5a5d56', '#8a8d82', '#9e8c6c', '#4a7a5e']
    : CHART_COLOR_ARRAY

  return {
    color: colors,
    backgroundColor: 'transparent',
    textStyle: {
      color: fg,
      fontFamily: 'Public Sans, Noto Sans SC, -apple-system, BlinkMacSystemFont, sans-serif',
    },
    title: {
      textStyle: { color: fg, fontSize: 14, fontWeight: 600 },
      subtextStyle: { color: muted, fontSize: 12 },
    },
    legend: {
      textStyle: { color: muted, fontSize: 11 },
      pageTextStyle: { color: muted },
    },
    tooltip: {
      backgroundColor: tooltipBg,
      borderColor: 'transparent',
      borderWidth: 0,
      textStyle: { color: fg, fontSize: 11, fontFamily: 'Public Sans, Noto Sans SC' },
      extraCssText: `box-shadow: 0 0 40px rgba(27,28,25,0.06); border-radius: 0;`,
    },
    axisPointer: {
      lineStyle: { color: muted, type: 'dashed' },
      crossStyle: { color: muted },
    },
    xAxis: {
      axisLine: { lineStyle: { color: border } },
      axisTick: { lineStyle: { color: border } },
      axisLabel: { color: muted, fontSize: 10, fontFamily: 'Public Sans' },
      splitLine: { lineStyle: { color: splitColor, type: 'dashed' } },
    },
    yAxis: {
      axisLine: { lineStyle: { color: border } },
      axisTick: { lineStyle: { color: border } },
      axisLabel: { color: muted, fontSize: 10, fontFamily: 'Public Sans' },
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
        handleColor: isDark ? '#6fa888' : '#001629',
        moveHandleSize: 12,
        fillerColor: isDark ? 'rgba(111,168,136,0.1)' : 'rgba(0,22,41,0.08)',
        dataBackground: {
          lineStyle: { color: border },
          areaStyle: { color: isDark ? 'rgba(111,168,136,0.05)' : 'rgba(0,22,41,0.03)' },
        },
      },
      {
        type: 'slider',
        textStyle: { color: muted },
        borderColor: border,
        handleColor: isDark ? '#6fa888' : '#001629',
        fillerColor: isDark ? 'rgba(111,168,136,0.1)' : 'rgba(0,22,41,0.08)',
        dataBackground: {
          lineStyle: { color: border },
          areaStyle: { color: isDark ? 'rgba(111,168,136,0.05)' : 'rgba(0,22,41,0.03)' },
        },
      },
    ],
    candlestick: {
      itemStyle: {
        color: isDark ? '#6fa888' : '#3f6653',
        color0: isDark ? '#c65d65' : '#58040f',
        borderColor: isDark ? '#6fa888' : '#3f6653',
        borderColor0: isDark ? '#c65d65' : '#58040f',
      },
    },
    line: { smooth: false, symbol: 'circle', symbolSize: 3 },
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
    primary: isDark ? '#e4e2dd' : '#001629',
    secondary: isDark ? '#6fa888' : '#3f6653',
    tertiary: isDark ? '#d4a841' : '#8b6914',
    danger: isDark ? '#c65d65' : '#58040f',
    purple: isDark ? '#5a5d56' : '#74796d',
    cyan: isDark ? '#8a8d82' : '#002b49',
    fg: isDark ? '#e4e2dd' : '#1b1c19',
    muted: isDark ? '#8a8d82' : '#74796d',
    text: isDark ? '#e4e2dd' : '#1b1c19',
    textSecondary: isDark ? '#8a8d82' : '#74796d',
    border: isDark ? '#252523' : '#e4e2dd',
    grid: isDark ? '#252523' : '#e4e2dd',
    background: isDark ? '#0e0e0e' : '#fbf9f4',
    splitLine: isDark ? '#1c1c1a' : '#f5f3ee',
  }
}

export { CHART_COLORS }
