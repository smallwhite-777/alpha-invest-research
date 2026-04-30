import { NextRequest, NextResponse } from 'next/server'
import { generateMacroAnswer } from '@/lib/macro-ai/answer'
import { buildMacroFactPack } from '@/lib/macro-ai/facts'
import { getMacroForecast } from '@/lib/macro-ai/forecast'
import { detectMacroIntent } from '@/lib/macro-ai/intents'
import { readMacroSignals } from '@/lib/macro-ai/signals'
import type { MacroAIContext } from '@/lib/macro-ai/types'
import {
  buildLimitReachedPayload,
  buildQuotaInfo,
  checkAndConsumeQuota,
} from '@/lib/guest-quota'

export async function POST(request: NextRequest) {
  try {
    const quota = await checkAndConsumeQuota('AI')
    if (!quota.allowed) {
      return NextResponse.json(buildLimitReachedPayload('AI', quota), { status: 401 })
    }

    const body = await request.json()
    const question = typeof body?.question === 'string' ? body.question.trim() : ''
    const context = (body?.context ?? undefined) as MacroAIContext | undefined

    if (!question) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 })
    }

    const intent = detectMacroIntent(question)
    const { codes, facts, correlations } = await buildMacroFactPack(question, context)
    const usedTools = ['macro_facts']
    const warnings: string[] = []

    const signalData = await readMacroSignals()
    const signalSummary = signalData.files.length > 0
      ? `已加载信号文件：${signalData.files.join(', ')}`
      : undefined
    if (signalSummary) {
      usedTools.push('macro_signals')
    }

    let forecast = null
    if (intent === 'forecast' || intent === 'scenario') {
      forecast = await getMacroForecast(codes[0], 3)
      if (forecast) {
        usedTools.push('macro_forecast')
      } else {
        warnings.push('后端预测服务当前不可用，本次回答仅基于最新历史数据与页面上下文。')
      }
    }

    if (facts.some((fact) => fact.isStale)) {
      warnings.push('当前涉及的部分指标存在“源数据偏旧”情况，请结合数据所属期阅读。')
    }

    const answer = await generateMacroAnswer({
      question,
      intent,
      facts,
      correlations,
      forecast,
      warnings,
      signalSummary,
    })

    return NextResponse.json({
      answer,
      intent,
      usedTools,
      facts,
      correlations,
      forecast,
      warnings,
      quota: buildQuotaInfo(quota, 'AI'),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

