import type { MacroAIContext, MacroAIResponse } from '@/lib/macro-ai/types'

export interface MacroAIRequest {
  question: string
  context?: MacroAIContext
}

export interface MacroAIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  response?: MacroAIResponse
}

