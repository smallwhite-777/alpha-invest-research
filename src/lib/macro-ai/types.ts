export type MacroAIIntent = 'fact' | 'analysis' | 'forecast' | 'scenario'

export interface MacroAIContext {
  page?: string
  visibleIndicators?: string[]
  selectedComparison?: {
    leftCode?: string | null
    rightCode?: string | null
  } | null
  selectedCorrelation?: {
    codeX?: string | null
    codeY?: string | null
    lag?: number | null
  } | null
}

export interface MacroAIFactItem {
  code: string
  name: string
  unit: string
  latestValue: number | null
  latestDate: string | null
  previousValue: number | null
  change: number | null
  isStale: boolean
  notes: string[]
}

export interface MacroAICorrelationItem {
  codeX: string
  codeY: string
  correlation: number
  sampleSize: number
}

export interface MacroForecastPayload {
  series: string
  horizon: number
  values: number[]
  lower80: number[]
  upper80: number[]
  model: string
  forecastDate?: string
}

export interface MacroAIResponse {
  answer: string
  intent: MacroAIIntent
  usedTools: string[]
  facts: MacroAIFactItem[]
  correlations?: MacroAICorrelationItem[]
  forecast?: MacroForecastPayload | null
  warnings?: string[]
}

