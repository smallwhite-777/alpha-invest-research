import 'server-only'

import { aiService } from '@/lib/ai'
import type { MacroAICorrelationItem, MacroAIFactItem, MacroForecastPayload, MacroAIIntent } from './types'

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-'
  if (Math.abs(value) >= 1000) return value.toFixed(0)
  return value.toFixed(2)
}

function buildFallbackAnswer(params: {
  intent: MacroAIIntent
  facts: MacroAIFactItem[]
  correlations: MacroAICorrelationItem[]
  forecast: MacroForecastPayload | null
  warnings: string[]
}) {
  const factLines = params.facts.map((fact) => {
    const direction = fact.change === null ? '-' : fact.change >= 0 ? '+' : ''
    return `- ${fact.name}：最新 ${formatNumber(fact.latestValue)} ${fact.unit}，所属期 ${fact.latestDate || '-'}，变动 ${direction}${formatNumber(fact.change)}`
  })

  const correlationLines = params.correlations.map((item) => {
    return `- ${item.codeX} vs ${item.codeY}：相关系数 ${item.correlation.toFixed(2)}，样本 ${item.sampleSize}`
  })

  const forecastLine = params.forecast
    ? `- 预测：${params.forecast.series} 未来 ${params.forecast.horizon} 期均值 ${params.forecast.values.map((value) => formatNumber(value)).join(' / ')}`
    : '- 预测：当前未取到后端预测结果，先依据最新事实数据做解释。'

  const warningLines = params.warnings.length > 0
    ? `\n注意：\n${params.warnings.map((warning) => `- ${warning}`).join('\n')}`
    : ''

  return `当前宏观上下文如下：\n${factLines.join('\n')}${correlationLines.length ? `\n相关性：\n${correlationLines.join('\n')}` : ''}\n${forecastLine}${warningLines}`
}

export async function generateMacroAnswer(params: {
  question: string
  intent: MacroAIIntent
  facts: MacroAIFactItem[]
  correlations: MacroAICorrelationItem[]
  forecast: MacroForecastPayload | null
  warnings: string[]
  signalSummary?: string
}) {
  const systemPrompt = `你是官网里的“AI 宏观解读”助手。

你的回答必须严格区分“当前数据”和“模型判断”：
1. 先写“当前数据”，只使用给定事实。
2. 再写“分析判断”，解释联动、周期位置或风险点。
3. 如果提供了 forecast，再写“模型判断”，明确这是预测而非事实。
4. 最后写“提示”，提醒样本截止日、源数据偏旧或预测服务不可用等。

要求：
- 使用中文，简洁专业。
- 不要编造未提供的指标和数值。
- 如果预测不可用，要明确说当前只基于历史与最新数据解读。
- 不构成投资建议。`

  const payload = {
    question: params.question,
    intent: params.intent,
    facts: params.facts,
    correlations: params.correlations,
    forecast: params.forecast,
    warnings: params.warnings,
    signalSummary: params.signalSummary ?? null,
  }

  try {
    const answer = await aiService.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(payload, null, 2) },
    ])
    return answer
  } catch {
    return buildFallbackAnswer(params)
  }
}

