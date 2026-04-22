import type { AssistantContext, AssistantMessage } from './types'

export function buildAssistantContext(input: {
  pageType?: string
  entityType?: AssistantContext['entityType']
  stockCode?: string
  companyName?: string
  indicatorCodes?: string[]
  compareTargets?: string[]
  timeRange?: string
  contextSummary?: string
  recentMessages?: AssistantMessage[]
  requestedSkill?: AssistantContext['requestedSkill']
  deepModeStage?: AssistantContext['deepModeStage']
  writingOutline?: string
}): AssistantContext {
  return {
    pageType: input.pageType,
    entityType: input.entityType,
    stockCode: input.stockCode,
    companyName: input.companyName,
    indicatorCodes: input.indicatorCodes ?? [],
    compareTargets: input.compareTargets ?? [],
    timeRange: input.timeRange,
    contextSummary: input.contextSummary,
    recentMessages: input.recentMessages ?? [],
    requestedSkill: input.requestedSkill,
    deepModeStage: input.deepModeStage,
    writingOutline: input.writingOutline,
  }
}
