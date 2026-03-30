/**
 * AI Data Validator
 * 数据验证层 - 确保AI回答的数据准确性
 */

import { getCachedTimeContext, latestReportYear } from '../time-context'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  confidence: number // 0-1
}

export interface DataPoint {
  name: string
  value: number | string
  unit: string
  year: string
  source?: string
}

export interface SourceInfo {
  id: string
  title: string
  type: 'annual_report' | 'news' | 'database' | 'api'
  year?: string
  page?: string
  url?: string
  quote?: string // 原文引用
}

// 动态获取当前年份，解决LLM知识截止问题
const CURRENT_YEAR = () => latestReportYear()
const VALID_YEARS = () => {
  const ctx = getCachedTimeContext()
  return [ctx.currentYear - 4, ctx.currentYear - 3, ctx.currentYear - 2, ctx.currentYear - 1, ctx.currentYear]
}

/**
 * 验证单个财务指标
 */
export function validateMetric(metric: DataPoint): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. 年份验证
  const yearNum = parseInt(metric.year)
  const validYears = VALID_YEARS()
  if (!validYears.includes(yearNum)) {
    errors.push(`年份 ${metric.year} 不在有效范围内 (${validYears.join(', ')})`)
  }

  // 2. 数值合理性验证
  const valueNum = typeof metric.value === 'string' ?
    parseFloat(metric.value.replace(/[,%亿万元]/g, '')) :
    metric.value

  if (isNaN(valueNum)) {
    errors.push(`数值 ${metric.value} 无法解析为数字`)
  }

  // 3. 特定指标的业务逻辑验证
  switch (metric.name) {
    case '营业收入':
    case '营收':
      if (valueNum < 0) errors.push('营业收入不能为负')
      if (valueNum > 100000) warnings.push('营业收入超过10万亿，请核实')
      break

    case '净利润':
    case '归母净利润':
      // 净利润可以为负（亏损）
      if (valueNum > 100000) warnings.push('净利润超过10万亿，请核实')
      break

    case '毛利率':
    case '净利率':
    case 'ROE':
      if (valueNum < -100 || valueNum > 100) {
        errors.push(`${metric.name} ${valueNum}% 超出合理范围`)
      }
      break

    case '资产负债率':
      if (valueNum < 0 || valueNum > 100) {
        errors.push(`资产负债率 ${valueNum}% 超出合理范围(0-100%)`)
      }
      break

    case 'PE':
    case '市盈率':
      if (valueNum < 0 && valueNum > -1) {
        warnings.push('PE接近0，可能是亏损公司')
      }
      if (valueNum > 500) {
        warnings.push('PE超过500，估值极高')
      }
      break

    case 'PB':
    case '市净率':
      if (valueNum < 0) {
        warnings.push('PB为负，可能是净资产为负')
      }
      break
  }

  // 4. 单位一致性验证
  const validUnits = ['亿元', '万元', '%', '元', '万吨', '吨', '亿', '万']
  if (!validUnits.some(u => metric.unit.includes(u))) {
    warnings.push(`单位 "${metric.unit}" 不常见`)
  }

  // 计算置信度
  const confidence = errors.length === 0 ?
    (warnings.length === 0 ? 1.0 : 0.8) :
    (warnings.length === 0 ? 0.5 : 0.3)

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    confidence
  }
}

/**
 * 验证财务数据一致性（逻辑关系）
 */
export function validateConsistency(metrics: DataPoint[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 同一年份的指标进行交叉验证
  const byYear: Record<string, DataPoint[]> = {}
  metrics.forEach(m => {
    if (!byYear[m.year]) byYear[m.year] = []
    byYear[m.year].push(m)
  })

  for (const [year, yearMetrics] of Object.entries(byYear)) {
    const revenue = yearMetrics.find(m => m.name.includes('营业收入') || m.name.includes('营收'))
    const netProfit = yearMetrics.find(m => m.name.includes('净利润') || m.name.includes('利润'))
    const grossMargin = yearMetrics.find(m => m.name.includes('毛利率'))
    const netMargin = yearMetrics.find(m => m.name.includes('净利率'))

    // 净利润不应大于营收（除非有特殊情况）
    if (revenue && netProfit) {
      const revenueNum = typeof revenue.value === 'number' ? revenue.value :
        parseFloat(revenue.value.toString().replace(/[,%亿万元]/g, ''))
      const profitNum = typeof netProfit.value === 'number' ? netProfit.value :
        parseFloat(netProfit.value.toString().replace(/[,%亿万元]/g, ''))

      if (!isNaN(revenueNum) && !isNaN(profitNum) && profitNum > revenueNum * 1.1) {
        errors.push(`${year}年净利润(${profitNum})显著大于营收(${revenueNum})，请核实`)
      }
    }

    // 毛利率应大于净利率（通常情况）
    if (grossMargin && netMargin) {
      const grossNum = typeof grossMargin.value === 'number' ? grossMargin.value :
        parseFloat(grossMargin.value.toString().replace('%', ''))
      const netNum = typeof netMargin.value === 'number' ? netMargin.value :
        parseFloat(netMargin.value.toString().replace('%', ''))

      if (!isNaN(grossNum) && !isNaN(netNum) && grossNum < netNum) {
        warnings.push(`${year}年毛利率(${grossNum}%)小于净利率(${netNum}%)，请确认是否为特殊情况`)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    confidence: errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.85) : 0.6
  }
}

/**
 * 验证年份标注正确性
 */
export function validateYearAnnotation(content: string, expectedYear: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 提取内容中的年份
  const yearMatches = content.match(/(20\d{2})年/g) || []
  const yearsFound = yearMatches.map(m => m.replace('年', ''))

  // 检查是否有年份不一致
  const uniqueYears = [...new Set(yearsFound)]
  if (uniqueYears.length > 2) {
    warnings.push(`内容中包含多个年份: ${uniqueYears.join(', ')}, 请确认数据是否来自同一报告期`)
  }

  // 检查是否标注了预期年份
  if (!yearsFound.includes(expectedYear) && uniqueYears.length > 0) {
    warnings.push(`未找到 ${expectedYear} 年的数据标注，内容使用的是 ${uniqueYears[0]} 年`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    confidence: 0.9
  }
}

/**
 * 综合验证
 */
export function validateFinancialResponse(
  metrics: DataPoint[],
  content: string,
  sources: SourceInfo[]
): ValidationResult {
  // 验证每个指标
  const metricResults = metrics.map(validateMetric)
  const metricErrors = metricResults.flatMap(r => r.errors)
  const metricWarnings = metricResults.flatMap(r => r.warnings)

  // 验证一致性
  const consistencyResult = validateConsistency(metrics)
  const allErrors = [...metricErrors, ...consistencyResult.errors]
  const allWarnings = [...metricWarnings, ...consistencyResult.warnings]

  // 验证年份标注
  const yearResult = validateYearAnnotation(content, CURRENT_YEAR().toString())
  allWarnings.push(...yearResult.warnings)

  // 验证来源完整性
  if (sources.length === 0 && metrics.length > 0) {
    allWarnings.push('有数据但无来源信息，请添加来源')
  }

  // 计算综合置信度
  const avgMetricConfidence = metricResults.reduce((sum, r) => sum + r.confidence, 0) / metricResults.length || 1
  const overallConfidence = (avgMetricConfidence * 0.5 + consistencyResult.confidence * 0.3 + yearResult.confidence * 0.2)

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    confidence: overallConfidence
  }
}

/**
 * 格式化验证结果为提示文本
 */
export function formatValidationReport(result: ValidationResult): string {
  const parts: string[] = []

  if (result.errors.length > 0) {
    parts.push('### 数据验证错误')
    result.errors.forEach(e => parts.push(`- ❌ ${e}`))
  }

  if (result.warnings.length > 0) {
    parts.push('### 数据验证提示')
    result.warnings.forEach(w => parts.push(`- ⚠️ ${w}`))
  }

  parts.push(`### 数据置信度: ${Math.round(result.confidence * 100)}%`)

  if (result.isValid) {
    parts.push('- ✅ 数据验证通过')
  }

  return parts.join('\n')
}

/**
 * 数据来源增强 - 构建完整的来源信息
 */
export function enhanceSources(
  sources: Partial<SourceInfo>[]
): SourceInfo[] {
  return sources.map((s, idx) => ({
    id: s.id || `source-${idx}`,
    title: s.title || '未知来源',
    type: s.type || 'database',
    year: s.year,
    page: s.page,
    url: s.url,
    quote: s.quote
  }))
}

/**
 * 从文本中提取数据点
 */
export function extractDataPoints(content: string): DataPoint[] {
  const metrics: DataPoint[] = []

  // 匹配模式: **指标名**: 数值单位 (年份)
  const pattern1 = /\*\*([^*]+)\*\*:\s*([\d,]+\.?\d*)\s*(亿元|万元|%|吨|万吨|元)(?:\s*\((20\d{2})年?\))?/g
  for (const match of content.matchAll(pattern1)) {
    metrics.push({
      name: match[1],
      value: match[2],
      unit: match[3],
      year: match[4] || CURRENT_YEAR().toString(),
      source: 'extracted'
    })
  }

  // 匹配模式: 指标名 xx亿元 (年份)
  const pattern2 = /(营业收入|净利润|归母净利润|总资产|净资产|经营性现金流)[^\d]*([\d,]+\.?\d*)\s*(亿元|万元)(?:\s*\((20\d{2})年?\))?/g
  for (const match of content.matchAll(pattern2)) {
    metrics.push({
      name: match[1],
      value: match[2],
      unit: match[3],
      year: match[4] || CURRENT_YEAR().toString(),
      source: 'extracted'
    })
  }

  return metrics
}