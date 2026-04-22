import type { MacroAIIntent } from './types'

const FORECAST_PATTERNS = ['预测', '未来', '后续', '接下来', '走势', '展望', '怎么看', '判断']
const SCENARIO_PATTERNS = ['如果', '假设', '情景', '冲击', '上涨', '下跌']
const ANALYSIS_PATTERNS = ['为什么', '说明什么', '联动', '关系', '相关', '背离', '同步', '分化', '意味着']

export function detectMacroIntent(question: string): MacroAIIntent {
  const normalized = question.trim().toLowerCase()

  if (SCENARIO_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return 'scenario'
  }

  if (FORECAST_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return 'forecast'
  }

  if (ANALYSIS_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return 'analysis'
  }

  return 'fact'
}

