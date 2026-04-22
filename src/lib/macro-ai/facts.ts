import 'server-only'

import { getLocalMacroData, getLocalMacroIndicators, getLocalMacroLatest } from '@/lib/macro-local'
import type { MacroAICorrelationItem, MacroAIContext, MacroAIFactItem } from './types'

const INDICATOR_ALIASES: Record<string, string[]> = {
  CN_CPI_NT_YOY: ['cpi', '中国cpi', '中国cpi同比', '居民消费价格', '通胀'],
  CN_PPI_YOY: ['ppi', '中国ppi', '工业品出厂价格', '工业通胀'],
  CN_M2_YOY: ['m2', '中国m2', '货币供应', '流动性'],
  CN_M1_YOY: ['m1', '中国m1'],
  PMI_CHN: ['pmi', '制造业pmi', '中国pmi', '景气'],
  GDP_CHN_YOY: ['gdp', '中国gdp', '经济增长'],
  IP_CHN_YOY: ['工业增加值', '工业生产'],
  RS_CHN_YOY: ['社零', '消费', '零售'],
  REPO7D_CHN: ['回购利率', '7天回购', 'repo7d'],
  TREASURY10Y_CHN: ['中国10年国债', '中债10年', '国债收益率'],
  US_DFF_M: ['联邦基金利率', 'fed', '美联储利率', '政策利率'],
  US_DGS10_M: ['美债10年', '美国10年国债', '10y', '长端利率'],
  US_DGS2_M: ['美债2年', '美国2年国债', '2y'],
  US_M2SL_M: ['美国m2', 'us m2'],
  US_PCECTPI_M: ['pce', '美国pce', 'pce物价'],
  US_DTWEXBGS_M: ['美元指数', 'dxy', '美元广义指数'],
  US_DCOILBRENTEU_M: ['布伦特', '油价', '原油', 'brent'],
  US_WALCL_M: ['美联储总资产', 'fed资产负债表', 'walcl', '缩表', '扩表'],
}

function normalizeText(input: string) {
  return input.toLowerCase().replace(/\s+/g, '')
}

function pearsonCorrelation(valuesX: number[], valuesY: number[]) {
  const n = valuesX.length
  if (n < 2 || n !== valuesY.length) return 0

  const sumX = valuesX.reduce((acc, value) => acc + value, 0)
  const sumY = valuesY.reduce((acc, value) => acc + value, 0)
  const sumXY = valuesX.reduce((acc, value, index) => acc + value * valuesY[index], 0)
  const sumX2 = valuesX.reduce((acc, value) => acc + value * value, 0)
  const sumY2 = valuesY.reduce((acc, value) => acc + value * value, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  return denominator === 0 ? 0 : numerator / denominator
}

function alignSeries(
  seriesX: Array<{ date: string; value: number }>,
  seriesY: Array<{ date: string; value: number }>
) {
  const toMonthKey = (date: string) => date.slice(0, 7)
  const monthlyX = new Map<string, number>()
  const monthlyY = new Map<string, number>()

  for (const item of seriesX) {
    monthlyX.set(toMonthKey(item.date), item.value)
  }

  for (const item of seriesY) {
    monthlyY.set(toMonthKey(item.date), item.value)
  }

  return Array.from(monthlyX.entries())
    .filter(([month]) => monthlyY.has(month))
    .map(([month, valueX]) => ({ month, x: valueX, y: monthlyY.get(month)! }))
    .slice(-36)
}

export function resolveRelevantMacroCodes(question: string, context?: MacroAIContext): string[] {
  const normalizedQuestion = normalizeText(question)
  const indicators = getLocalMacroIndicators()
  const matches = new Set<string>()

  for (const indicator of indicators) {
    const normalizedName = normalizeText(indicator.name)
    if (normalizedQuestion.includes(normalizedName) || normalizedQuestion.includes(normalizeText(indicator.code))) {
      matches.add(indicator.code)
      continue
    }

    const aliases = INDICATOR_ALIASES[indicator.code] ?? []
    if (aliases.some((alias) => normalizedQuestion.includes(normalizeText(alias)))) {
      matches.add(indicator.code)
    }
  }

  if (context?.selectedCorrelation?.codeX) matches.add(context.selectedCorrelation.codeX)
  if (context?.selectedCorrelation?.codeY) matches.add(context.selectedCorrelation.codeY)
  if (context?.selectedComparison?.leftCode) matches.add(context.selectedComparison.leftCode)
  if (context?.selectedComparison?.rightCode) matches.add(context.selectedComparison.rightCode)

  const visibleIndicators = context?.visibleIndicators?.filter(Boolean) ?? []
  if (matches.size === 0 && visibleIndicators.length > 0) {
    for (const code of visibleIndicators.slice(0, 4)) {
      matches.add(code)
    }
  }

  if (matches.size === 0) {
    for (const code of ['CN_CPI_NT_YOY', 'CN_M2_YOY', 'PMI_CHN', 'US_DFF_M']) {
      matches.add(code)
    }
  }

  return Array.from(matches).slice(0, 4)
}

export async function buildMacroFactPack(question: string, context?: MacroAIContext) {
  const codes = resolveRelevantMacroCodes(question, context)
  const [latestRows, historyGroups] = await Promise.all([
    getLocalMacroLatest(codes),
    getLocalMacroData(codes, { limit: 36 }),
  ])
  const indicators = getLocalMacroIndicators()
  const historyMap = new Map(historyGroups.map((group) => [group.indicatorCode, group.data]))

  const facts: MacroAIFactItem[] = codes.map((code) => {
    const indicator = indicators.find((item) => item.code === code)
    const latest = latestRows.find((item) => item.indicatorCode === code)

    return {
      code,
      name: indicator?.name || code,
      unit: indicator?.unit || '',
      latestValue: latest?.latestValue ?? null,
      latestDate: latest?.latestDate ?? null,
      previousValue: latest?.previousValue ?? null,
      change: latest?.change ?? null,
      isStale: latest?.quality.isStale ?? false,
      notes: latest?.quality.notes ?? [],
    }
  })

  const correlations: MacroAICorrelationItem[] = []
  if (codes.length >= 2) {
    for (let index = 0; index < codes.length - 1; index += 1) {
      const codeX = codes[index]
      const codeY = codes[index + 1]
      const aligned = alignSeries(historyMap.get(codeX) ?? [], historyMap.get(codeY) ?? [])
      if (aligned.length >= 3) {
        correlations.push({
          codeX,
          codeY,
          correlation: pearsonCorrelation(
            aligned.map((item) => item.x),
            aligned.map((item) => item.y)
          ),
          sampleSize: aligned.length,
        })
      }
    }
  }

  return {
    codes,
    facts,
    correlations,
  }
}

