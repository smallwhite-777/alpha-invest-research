export type SkillId =
  | 'company_analysis'
  | 'earnings_review'
  | 'valuation'
  | 'peer_comparison'
  | 'macro_analysis'
  | 'macro_to_asset'
  | 'event_impact'
  | 'risk_diagnosis'
  | 'fact_check'

export type EvidenceKind =
  | 'financial_fact'
  | 'valuation_snapshot'
  | 'price_series'
  | 'macro_series'
  | 'macro_signal'
  | 'research_view'
  | 'news_event'
  | 'intelligence_note'
  | 'annual_report_snippet'
  | 'peer_metric'
  | 'web_result'

export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantContext {
  pageType?: string
  entityType?: 'stock' | 'macro' | 'industry' | 'event'
  stockCode?: string
  companyName?: string
  indicatorCodes?: string[]
  compareTargets?: string[]
  timeRange?: string
  contextSummary?: string
  recentMessages?: AssistantMessage[]
  requestedSkill?: SkillId | string
  deepModeStage?: 'outline' | 'article' | 'answer'
  writingOutline?: string
}

export interface SkillDefinition {
  id: SkillId
  label: string
  description: string
  requiredEvidence: EvidenceKind[]
  optionalEvidence: EvidenceKind[]
  bannedBehaviors: string[]
  outputSections: string[]
  supportsFollowUp: boolean
}

export interface AssistantApiResponse {
  result: string
  skill?: SkillId | string
  sources?: Array<{ id: string; title: string; type?: string }>
  warnings?: string[]
  evidence_summary?: Record<string, number>
  steps?: Array<{ name: string; status: string; duration_ms?: number; error?: string }>
  total_duration_ms?: number
  workflow?: string
  context_used?: boolean
}
