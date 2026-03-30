import type { DuPont3Stage, RadarScores, FCFData, PEHistoryData, PEPercentiles, TenYearTrend } from '@/types/financial'
import { getChartColors, createGradientColor, formatLargeNumber, formatPercent } from './BaseChart'

// ==================== 雷达图配置 ====================

export function createRadarChartOption(
  scores: RadarScores | undefined,
  industryAvg: RadarScores | undefined,
  isDark: boolean
) {
  const colors = getChartColors(isDark)

  // 安全获取分数，默认为0
  const safeScores = {
    profitability: scores?.profitability ?? 50,
    growth: scores?.growth ?? 50,
    financial_health: scores?.financial_health ?? 50,
    valuation: scores?.valuation ?? 50,
    cashflow_quality: scores?.cashflow_quality ?? 50,
    dividend: scores?.dividend ?? 50
  }

  const safeIndustryAvg = industryAvg ? {
    profitability: industryAvg.profitability ?? 50,
    growth: industryAvg.growth ?? 50,
    financial_health: industryAvg.financial_health ?? 50,
    valuation: industryAvg.valuation ?? 50,
    cashflow_quality: industryAvg.cashflow_quality ?? 50,
    dividend: industryAvg.dividend ?? 50
  } : null

  return {
    title: {
      text: '综合质量雷达图',
      left: 'center',
      textStyle: {
        fontSize: 14,
        fontWeight: 600,
        color: colors.text
      }
    },
    legend: {
      data: ['当前股票', '行业平均'],
      bottom: 5,
      textStyle: { color: colors.textSecondary }
    },
    radar: {
      indicator: [
        { name: '盈利能力', max: 100 },
        { name: '成长性', max: 100 },
        { name: '财务健康', max: 100 },
        { name: '估值吸引力', max: 100 },
        { name: '现金流质量', max: 100 },
        { name: '分红能力', max: 100 }
      ],
      shape: 'polygon',
      splitNumber: 5,
      axisName: {
        color: colors.text,
        fontSize: 12
      },
      splitLine: {
        lineStyle: { color: colors.grid }
      },
      splitArea: {
        areaStyle: {
          color: isDark
            ? ['rgba(0,212,170,0.05)', 'rgba(0,212,170,0.1)']
            : ['rgba(59,130,246,0.05)', 'rgba(59,130,246,0.1)']
        }
      },
      axisLine: {
        lineStyle: { color: colors.grid }
      }
    },
    series: [{
      type: 'radar',
      data: [
        {
          value: [
            safeScores.profitability,
            safeScores.growth,
            safeScores.financial_health,
            safeScores.valuation,
            safeScores.cashflow_quality,
            safeScores.dividend
          ],
          name: '当前股票',
          lineStyle: { color: colors.primary, width: 2 },
          areaStyle: { color: 'rgba(0,212,170,0.3)' },
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: colors.primary }
        },
        safeIndustryAvg ? {
          value: [
            safeIndustryAvg.profitability,
            safeIndustryAvg.growth,
            safeIndustryAvg.financial_health,
            safeIndustryAvg.valuation,
            safeIndustryAvg.cashflow_quality,
            safeIndustryAvg.dividend
          ],
          name: '行业平均',
          lineStyle: { color: colors.secondary, width: 2 },
          areaStyle: { color: 'rgba(59,130,246,0.2)' },
          symbol: 'circle',
          symbolSize: 4,
          itemStyle: { color: colors.secondary }
        } : null
      ].filter(Boolean)
    }]
  }
}

// ==================== 10年趋势图配置 ====================

export function createTrendChartOption(
  trends: TenYearTrend[],
  metrics: ('revenue' | 'net_profit' | 'roe')[],
  isDark: boolean
) {
  const colors = getChartColors(isDark)
  const metricConfig = {
    revenue: { name: '营收(亿)', color: colors.primary, unit: '亿', yAxis: 0 },
    net_profit: { name: '净利润(亿)', color: colors.secondary, unit: '亿', yAxis: 0 },
    roe: { name: 'ROE(%)', color: colors.tertiary, unit: '%', yAxis: 1 }
  }

  // 安全处理趋势数据，并按年份升序排列（从左到右：2015-2024）
  const safeTrends = [...(trends ?? [])].sort((a, b) => {
    const yearA = parseInt(a.year ?? '0')
    const yearB = parseInt(b.year ?? '0')
    return yearA - yearB
  })

  // 检查是否需要双坐标轴（同时有金额指标和ROE）
  const hasROE = metrics.includes('roe')
  const hasAmount = metrics.includes('revenue') || metrics.includes('net_profit')

  // 计算金额范围（基于数据动态调整）
  let maxAmount = 0
  let maxROE = 50
  if (safeTrends.length > 0) {
    maxAmount = Math.max(
      ...safeTrends.map(t => Math.max(t.revenue ?? 0, t.net_profit ?? 0))
    )
    maxROE = Math.max(50, Math.ceil(Math.max(...safeTrends.map(t => t.roe ?? 0)) / 10) * 10 + 10)
  }
  const amountAxisMax = Math.ceil(maxAmount / 100) * 100 + 100

  const series = metrics.map(metric => {
    const config = metricConfig[metric]
    return {
      name: config.name,
      type: 'line',
      yAxisIndex: config.yAxis,
      data: safeTrends.map(t => t[metric] ?? 0),
      smooth: true,
      lineStyle: { color: config.color, width: 2 },
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: config.color },
      areaStyle: metric === 'roe' ? undefined : {
        color: createGradientColor(config.color, 'vertical', 0.2, 0.01)
      }
    }
  })

  return {
    title: {
      text: '10年关键指标趋势',
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 600, color: colors.text }
    },
    legend: {
      data: metrics.map(m => metricConfig[m].name),
      bottom: 5,
      textStyle: { color: colors.textSecondary }
    },
    grid: {
      left: 65,
      right: 65,
      top: 50,
      bottom: 50
    },
    xAxis: {
      type: 'category',
      data: safeTrends.map(t => t.year ?? ''),
      axisLine: { lineStyle: { color: colors.grid } },
      axisLabel: { color: colors.textSecondary }
    },
    yAxis: hasROE && hasAmount ? [
      // 左轴：金额（营收、净利润）
      {
        type: 'value',
        name: '金额(亿)',
        position: 'left',
        min: 0,
        max: amountAxisMax,
        nameGap: 10,
        nameTextStyle: {
          color: colors.textSecondary,
          fontSize: 11,
          padding: [0, 0, 0, 0]
        },
        axisLine: { lineStyle: { color: colors.primary } },
        axisLabel: {
          color: colors.textSecondary,
          formatter: (v: number) => formatLargeNumber(v),
          fontSize: 11
        },
        splitLine: {
          lineStyle: { color: colors.grid, type: 'dashed' }
        }
      },
      // 右轴：百分比（ROE）
      {
        type: 'value',
        name: 'ROE(%)',
        position: 'right',
        min: 0,
        max: maxROE,
        nameGap: 10,
        nameTextStyle: {
          color: colors.textSecondary,
          fontSize: 11,
          padding: [0, 0, 0, 0]
        },
        axisLine: { lineStyle: { color: colors.tertiary } },
        axisLabel: {
          color: colors.textSecondary,
          formatter: (v: number) => `${v}%`,
          fontSize: 11
        },
        splitLine: { show: false }
      }
    ] : hasAmount ? [
      // 只有金额指标
      {
        type: 'value',
        name: '金额(亿)',
        position: 'left',
        min: 0,
        max: amountAxisMax,
        nameGap: 10,
        nameTextStyle: {
          color: colors.textSecondary,
          fontSize: 11,
          padding: [0, 0, 0, 0]
        },
        axisLine: { lineStyle: { color: colors.grid } },
        axisLabel: {
          color: colors.textSecondary,
          formatter: (v: number) => formatLargeNumber(v),
          fontSize: 11
        }
      }
    ] : [
      // 只有ROE
      {
        type: 'value',
        name: 'ROE(%)',
        position: 'left',
        min: 0,
        max: maxROE,
        nameGap: 10,
        nameTextStyle: {
          color: colors.textSecondary,
          fontSize: 11,
          padding: [0, 0, 0, 0]
        },
        axisLine: { lineStyle: { color: colors.grid } },
        axisLabel: {
          color: colors.textSecondary,
          formatter: (v: number) => `${v}%`,
          fontSize: 11
        }
      }
    ],
    series,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any[]) => {
        if (!params || params.length === 0) return ''
        const year = params[0]?.axisValue ?? ''
        let html = `<div style="font-weight:600">${year}</div>`
        params.forEach(p => {
          const unit = p.seriesName.includes('%') ? '%' : '亿'
          const value = p.value ?? 0
          html += `<div style="color:${p.color}">${p.seriesName}: ${value.toFixed(2)}${unit}</div>`
        })
        return html
      }
    }
  }
}

// ==================== 瀑布图配置 ====================

export function createWaterfallChartOption(
  data: DuPont3Stage | undefined,
  contributions: {
    net_margin_contribution: number
    asset_turnover_contribution: number
    equity_multiplier_contribution: number
  } | undefined,
  isDark: boolean
) {
  const colors = getChartColors(isDark)

  // 安全获取数据
  const safeData = {
    net_margin: data?.net_margin ?? 0,
    asset_turnover: data?.asset_turnover ?? 0,
    equity_multiplier: data?.equity_multiplier ?? 1,
    roe: data?.roe ?? 0
  }

  // 瀑布图数据 - 统一使用百分比单位
  const waterfallData = [
    { name: '净利率', value: safeData.net_margin, type: 'margin', displayUnit: '%' },
    { name: '资产周转率', value: safeData.asset_turnover * 100, type: 'turnover', displayUnit: '%' },
    { name: '权益乘数', value: (safeData.equity_multiplier - 1) * 100, type: 'multiplier', displayUnit: '%' },
    { name: '最终ROE', value: safeData.roe, type: 'total', displayUnit: '%' }
  ]

  return {
    title: {
      text: 'ROE杜邦分解瀑布图',
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 600, color: colors.text }
    },
    grid: {
      left: 60,
      right: 40,
      top: 60,
      bottom: 60
    },
    xAxis: {
      type: 'category',
      data: waterfallData.map(d => d.name),
      axisLine: { lineStyle: { color: colors.grid } },
      axisLabel: {
        color: colors.textSecondary,
        interval: 0,
        rotate: 0
      }
    },
    yAxis: {
      type: 'value',
      name: '贡献度 (%)',
      nameGap: 10,
      nameTextStyle: {
        color: colors.textSecondary,
        fontSize: 12
      },
      axisLine: { lineStyle: { color: colors.grid } },
      axisLabel: {
        color: colors.textSecondary,
        formatter: (v: number) => `${v}%`
      },
      splitLine: {
        lineStyle: { color: colors.grid, type: 'dashed' }
      }
    },
    series: [{
      type: 'bar',
      data: waterfallData.map((d, idx) => ({
        value: d.value,
        itemStyle: {
          color: d.type === 'total' ? colors.primary :
                 d.type === 'margin' ? colors.secondary :
                 d.type === 'turnover' ? colors.tertiary : colors.purple,
          borderRadius: idx === waterfallData.length - 1 ? [6, 6, 0, 0] : [2, 2, 0, 0]
        },
        label: {
          show: true,
          position: 'top' as const,
          formatter: `{c|${d.value.toFixed(1)}${d.displayUnit}}`,
          rich: {
            c: {
              color: colors.text,
              fontSize: 12,
              fontWeight: 'bold'
            }
          }
        }
      })),
      barWidth: 60,
      barGap: '10%'
    }],
    tooltip: {
      trigger: 'item',
      backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
      borderColor: colors.grid,
      textStyle: { color: colors.text },
      formatter: (params: any) => {
        const d = waterfallData[params.dataIndex]
        return `<div style="font-weight:600">${d.name}</div>
                <div>贡献值: ${d.value.toFixed(2)}%</div>`
      }
    }
  }
}

// ==================== FCF趋势图配置 ====================

export function createFCFChartOption(fcfData: FCFData[] | undefined, isDark: boolean) {
  const colors = getChartColors(isDark)

  // 安全处理数据
  const safeFcfData = fcfData ?? []

  // 计算数据范围
  const maxAmount = Math.max(
    ...safeFcfData.map(d => Math.max(d.operating_cf ?? 0, d.net_profit ?? 0, d.fcf ?? 0))
  )
  const amountAxisMax = Math.ceil(maxAmount / 100) * 100 + 50

  return {
    title: {
      text: '现金流质量',
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 600, color: colors.text }
    },
    legend: {
      data: ['经营现金流(亿)', '净利润(亿)', 'FCF(亿)', 'FCF增长率(%)'],
      bottom: 5,
      textStyle: { color: colors.textSecondary }
    },
    grid: {
      left: 70,
      right: 70,
      top: 50,
      bottom: 50
    },
    xAxis: {
      type: 'category',
      data: safeFcfData.map(d => d.year ?? ''),
      axisLine: { lineStyle: { color: colors.grid } },
      axisLabel: { color: colors.textSecondary }
    },
    yAxis: [
      {
        type: 'value',
        name: '金额(亿元)',
        position: 'left',
        min: 0,
        max: amountAxisMax,
        nameGap: 10,
        nameTextStyle: {
          color: colors.textSecondary,
          fontSize: 11,
          padding: [0, 0, 0, 0]
        },
        axisLine: { lineStyle: { color: colors.primary } },
        axisLabel: {
          color: colors.textSecondary,
          fontSize: 11
        },
        splitLine: {
          lineStyle: { color: colors.grid, type: 'dashed' }
        }
      },
      {
        type: 'value',
        name: '增长率(%)',
        position: 'right',
        nameGap: 10,
        nameTextStyle: {
          color: colors.textSecondary,
          fontSize: 11,
          padding: [0, 0, 0, 0]
        },
        axisLine: { lineStyle: { color: colors.tertiary } },
        axisLabel: {
          color: colors.textSecondary,
          formatter: (v: number) => `${v.toFixed(0)}%`,
          fontSize: 11
        },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '经营现金流(亿)',
        type: 'bar',
        yAxisIndex: 0,
        data: safeFcfData.map(d => d.operating_cf ?? 0),
        itemStyle: { color: colors.secondary, borderRadius: [2, 2, 0, 0] },
        barWidth: 20
      },
      {
        name: '净利润(亿)',
        type: 'bar',
        yAxisIndex: 0,
        data: safeFcfData.map(d => d.net_profit ?? 0),
        itemStyle: { color: colors.purple, borderRadius: [2, 2, 0, 0] },
        barWidth: 20
      },
      {
        name: 'FCF(亿)',
        type: 'line',
        yAxisIndex: 0,
        data: safeFcfData.map(d => d.fcf ?? 0),
        lineStyle: { color: colors.primary, width: 3 },
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: colors.primary },
        areaStyle: {
          color: createGradientColor(colors.primary, 'vertical', 0.3, 0.01)
        }
      },
      {
        name: 'FCF增长率(%)',
        type: 'line',
        yAxisIndex: 1,
        data: safeFcfData.map(d => d.fcf_growth_rate ?? 0),
        lineStyle: { color: colors.tertiary, width: 2, type: 'dashed' },
        symbol: 'diamond',
        symbolSize: 6,
        itemStyle: { color: colors.tertiary }
      }
    ],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any[]) => {
        if (!params || params.length === 0) return ''
        const year = params[0]?.axisValue ?? ''
        let html = `<div style="font-weight:600">${year}</div>`
        params.forEach(p => {
          if (p.value !== null && p.value !== undefined) {
            const unit = p.seriesName.includes('%') ? '%' : '亿'
            html += `<div style="color:${p.color}">${p.seriesName}: ${p.value.toFixed(2)}${unit}</div>`
          }
        })
        return html
      }
    }
  }
}

// ==================== PE Band图配置 ====================

export function createPEBandChartOption(
  peHistory: PEHistoryData[] | undefined,
  percentiles: PEPercentiles | undefined,
  currentPE: number | undefined,
  isDark: boolean
) {
  const colors = getChartColors(isDark)
  const percentileColors = [colors.danger, colors.tertiary, colors.textSecondary, colors.secondary, colors.primary]

  // 安全处理数据
  const safePeHistory = peHistory ?? []
  const safePercentiles = percentiles ?? { p10: 20, p25: 25, p50: 30, p75: 35, p90: 40 }
  const safeCurrentPE = currentPE ?? 25

  return {
    title: {
      text: 'PE历史分位图',
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 600, color: colors.text }
    },
    legend: {
      data: ['PE', 'P10', 'P25', 'P50', 'P75', 'P90'],
      bottom: 5,
      textStyle: { color: colors.textSecondary }
    },
    xAxis: {
      type: 'category',
      data: safePeHistory.map(d => d.date ?? ''),
      axisLine: { lineStyle: { color: colors.grid } },
      axisLabel: {
        color: colors.textSecondary,
        formatter: (val: string) => val ? val.substring(0, 7) : '' // 只显示年月
      }
    },
    yAxis: {
      type: 'value',
      name: 'PE(倍)',
      axisLine: { lineStyle: { color: colors.grid } },
      axisLabel: { color: colors.textSecondary }
    },
    series: [
      // 分位线
      ...['p10', 'p25', 'p50', 'p75', 'p90'].map((p, idx) => ({
        name: `P${p.replace('p', '')}`,
        type: 'line',
        data: safePeHistory.map(() => safePercentiles[p as keyof PEPercentiles] ?? 25),
        lineStyle: {
          color: percentileColors[idx],
          type: 'dashed',
          width: 1
        },
        symbol: 'none',
        emphasis: { disabled: true }
      })),
      // 实际PE线
      {
        name: 'PE',
        type: 'line',
        data: safePeHistory.map(d => d.pe ?? 25),
        lineStyle: { color: colors.secondary, width: 2 },
        symbol: 'circle',
        symbolSize: 4,
        itemStyle: { color: colors.secondary },
        areaStyle: {
          color: createGradientColor(colors.secondary, 'vertical', 0.2, 0.01)
        },
        markPoint: safePeHistory.length > 0 ? {
          data: [{
            name: '当前',
            coord: [safePeHistory.length - 1, safeCurrentPE],
            symbol: 'pin',
            symbolSize: 40,
            itemStyle: { color: colors.primary },
            label: {
              show: true,
              formatter: `${safeCurrentPE.toFixed(1)}`,
              color: '#fff',
              fontSize: 10
            }
          }]
        } : undefined
      }
    ].filter(Boolean),
    tooltip: {
      trigger: 'axis'
    }
  }
}

// ==================== 杜邦历史趋势图配置 ====================

export function createDuPontTrendChartOption(
  history: { year: string; roe: number; net_margin?: number; asset_turnover?: number; equity_multiplier?: number; revenue?: number; net_profit?: number }[] | undefined,
  isDark: boolean
) {
  const colors = getChartColors(isDark)

  // 安全处理数据，并按年份升序排列（从左到右：2015-2024）
  const safeHistory = [...(history ?? [])].sort((a, b) => {
    const yearA = parseInt(a.year ?? '0')
    const yearB = parseInt(b.year ?? '0')
    return yearA - yearB
  })

  // 双坐标轴配置：
  // 左轴（Y轴1）：百分比指标 - ROE、净利率（范围0-60%）
  // 右轴（Y轴2）：倍数指标 - 资产周转率、权益乘数（范围0-3）

  return {
    title: {
      text: '杜邦分解历史趋势',
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 600, color: colors.text }
    },
    legend: {
      data: ['ROE(%)', '净利率(%)', '资产周转率', '权益乘数'],
      bottom: 5,
      textStyle: { color: colors.textSecondary }
    },
    grid: {
      left: 60,
      right: 60,
      top: 50,
      bottom: 50
    },
    xAxis: {
      type: 'category',
      data: safeHistory.map(h => h.year ?? ''),
      axisLine: { lineStyle: { color: colors.grid } },
      axisLabel: { color: colors.textSecondary }
    },
    yAxis: [
      {
        type: 'value',
        name: '百分比(%)',
        position: 'left',
        min: 0,
        max: 60,
        nameGap: 10,
        nameTextStyle: {
          color: colors.textSecondary,
          fontSize: 11,
          padding: [0, 0, 0, 0]
        },
        axisLine: { lineStyle: { color: colors.primary } },
        axisLabel: {
          color: colors.textSecondary,
          formatter: (v: number) => `${v}%`,
          fontSize: 11
        },
        splitLine: {
          lineStyle: { color: colors.grid, type: 'dashed' }
        }
      },
      {
        type: 'value',
        name: '倍数',
        position: 'right',
        min: 0,
        max: 3,
        nameGap: 10,
        nameTextStyle: {
          color: colors.textSecondary,
          fontSize: 11,
          padding: [0, 0, 0, 0]
        },
        axisLine: { lineStyle: { color: colors.tertiary } },
        axisLabel: {
          color: colors.textSecondary,
          formatter: (v: number) => v.toFixed(1),
          fontSize: 11
        },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: 'ROE(%)',
        type: 'line',
        yAxisIndex: 0,
        data: safeHistory.map(h => h.roe ?? 0),
        lineStyle: { color: colors.primary, width: 3 },
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: colors.primary },
        areaStyle: {
          color: createGradientColor(colors.primary, 'vertical', 0.2, 0.01)
        }
      },
      {
        name: '净利率(%)',
        type: 'line',
        yAxisIndex: 0,
        data: safeHistory.map(h => h.net_margin ?? null),
        lineStyle: { color: colors.secondary, width: 2 },
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: colors.secondary }
      },
      {
        name: '资产周转率',
        type: 'line',
        yAxisIndex: 1,
        data: safeHistory.map(h => h.asset_turnover ?? null),
        lineStyle: { color: colors.tertiary, width: 2 },
        symbol: 'diamond',
        symbolSize: 6,
        itemStyle: { color: colors.tertiary }
      },
      {
        name: '权益乘数',
        type: 'line',
        yAxisIndex: 1,
        data: safeHistory.map(h => h.equity_multiplier ?? null),
        lineStyle: { color: colors.purple, width: 2 },
        symbol: 'triangle',
        symbolSize: 6,
        itemStyle: { color: colors.purple }
      }
    ],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any[]) => {
        if (!params || params.length === 0) return ''
        const year = params[0]?.axisValue ?? ''
        let html = `<div style="font-weight:600">${year}</div>`
        params.forEach(p => {
          if (p.value !== null && p.value !== undefined) {
            const unit = p.seriesName.includes('%') ? '%' : '倍'
            html += `<div style="color:${p.color}">${p.seriesName}: ${p.value.toFixed(2)}${unit}</div>`
          }
        })
        return html
      }
    }
  }
}