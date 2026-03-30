/**
 * Analyze Page Types
 * Types for AI analysis and chat functionality
 */

export interface UploadedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
}

export interface AnalysisResult {
  summary: string
  keyPoints: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  riskFactors: string[]
  opportunities: string[]
  valuation?: {
    method: string
    targetPrice?: string
    currentPrice?: string
    peRatio?: string
    pbRatio?: string
  }
  recommendation?: 'buy' | 'hold' | 'sell' | 'watch'
  deepAnalysis?: {
    business?: { coreStrength: string; newNarrative: string }
    keyMetrics?: { metrics: string[]; trends: string }
    valuationDeep?: { methods: string; assumptions: string; scenarios: any }
    monitoring?: { drivers: string[]; risks: string[]; triggers: string[] }
  }
  philosophyViews?: {
    buffett: { view: string; reasoning: string }
    ark: { view: string; reasoning: string }
    tiger: { view: string; reasoning: string }
    klarman: { view: string; reasoning: string }
    tepper: { view: string; reasoning: string }
    druck: { view: string; reasoning: string }
  }
  variantView?: { consensus: string; ourView: string; whyDifferent: string }
  preMortem?: string[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content?: string
  files?: { name: string; size: number }[]
  result?: AnalysisResult
  analysisMode?: 'basic' | 'deep'
  sources?: { id: string; title: string; type?: string }[]
  timestamp: number
  isLoading?: boolean
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  timestamp: number
}

export type AnalysisMode = 'basic' | 'deep'