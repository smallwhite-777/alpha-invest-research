import { buildDocumentDedupeKey, normalizeText } from '@/lib/intelligence/core/dedupe'
import type {
  IntelligenceNormalizer,
  NormalizedEntity,
  NormalizedIntelligenceDocument,
  NormalizedSector,
  SourceRecord,
} from '@/lib/intelligence/core/types'
import { WSJ_SOURCE_CODE, WSJ_SOURCE_NAME } from './connector'

type WsjPayload = {
  fileName: string
  paperId: string
  paperDate: string
  translatedSummary?: string
  event: {
    id: number
    category: string
    title: string
    summary: string
    impact: string
    sourcePage: string
  }
}

function dedupeValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function mapCategory(rawCategory: string, title: string, summary: string): NormalizedIntelligenceDocument['category'] {
  const combined = `${rawCategory} ${title} ${summary}`.toLowerCase()

  if (
    combined.includes('政策') ||
    combined.includes('监管') ||
    combined.includes('央行') ||
    combined.includes('fed') ||
    combined.includes('central bank') ||
    combined.includes('regulation')
  ) {
    return 'POLICY_RUMOR'
  }

  if (
    combined.includes('科技') ||
    combined.includes('企业') ||
    combined.includes('产业') ||
    combined.includes('市场') ||
    combined.includes('制造业') ||
    combined.includes('ipo') ||
    combined.includes('ai') ||
    combined.includes('software') ||
    combined.includes('semiconductor')
  ) {
    return 'INDUSTRY_TRACK'
  }

  return 'NEWS'
}

function inferImportance(impact: string, sourcePage: string): 1 | 2 | 3 | 4 | 5 {
  const combined = `${impact} ${sourcePage}`.toLowerCase()
  let score = 2

  if (combined.includes('a1')) score += 2
  else if (/\ba\d/.test(combined)) score += 1
  else if (combined.includes('b1')) score += 1

  const highPrioritySignals = [
    '关键',
    '重大',
    '升级',
    '冲突',
    '停火',
    '制裁',
    '战争',
    '并购',
    '收购',
    'ipo',
    '失业',
    '油价',
    '美联储',
    'critical',
    'urgent',
  ]

  if (highPrioritySignals.some(signal => combined.includes(signal.toLowerCase()))) {
    score += 1
  }

  return Math.min(score, 5) as 1 | 2 | 3 | 4 | 5
}

function inferSectors(text: string): NormalizedSector[] {
  const sectors: NormalizedSector[] = []

  if (/(ai|software|cloud|cerebras|salesforce|verizon|chip|semiconductor)/i.test(text)) {
    sectors.push({ code: 'SW_COMPUTER', name: '计算机' })
  }
  if (/(oil|gas|energy|uranium|exxon|chevron|bp|totalenergies|霍尔木兹|原油)/i.test(text)) {
    sectors.push({ code: 'SW_OIL', name: '石油石化' })
  }
  if (/(pharma|drug|eli lilly|therapeutics|medical|biotech)/i.test(text)) {
    sectors.push({ code: 'SW_PHARMA', name: '医药生物' })
  }
  if (/(auto|ev|tesla|vehicle|car)/i.test(text)) {
    sectors.push({ code: 'SW_AUTO', name: '汽车' })
  }

  return sectors
}

function inferEntities(text: string): NormalizedEntity[] {
  const candidates: Array<{ pattern: RegExp; entity: NormalizedEntity }> = [
    { pattern: /Iran|伊朗/i, entity: { type: 'country', name: '伊朗' } },
    { pattern: /Trump|特朗普/i, entity: { type: 'person', name: '特朗普' } },
    { pattern: /OpenAI/i, entity: { type: 'company', name: 'OpenAI' } },
    { pattern: /Salesforce/i, entity: { type: 'company', name: 'Salesforce' } },
    { pattern: /Cerebras/i, entity: { type: 'company', name: 'Cerebras' } },
    { pattern: /Eli Lilly/i, entity: { type: 'company', name: 'Eli Lilly' } },
    { pattern: /Exxon/i, entity: { type: 'company', name: 'Exxon' } },
    { pattern: /Chevron/i, entity: { type: 'company', name: 'Chevron' } },
    { pattern: /\bFed\b|美联储/i, entity: { type: 'org', name: '美联储' } },
    { pattern: /Oil|原油|石油/i, entity: { type: 'commodity', name: '原油' } },
  ]

  return candidates.filter(candidate => candidate.pattern.test(text)).map(candidate => candidate.entity)
}

function inferTags(payload: WsjPayload, text: string): string[] {
  const categoryText = normalizeText(payload.event.category)
  const tags: string[] = []

  const keywordPatterns: Array<{ pattern: RegExp; tag: string }> = [
    { pattern: /\bAI\b/i, tag: 'AI' },
    { pattern: /\bIPO\b/i, tag: 'IPO' },
    { pattern: /\bCEO\b/i, tag: 'CEO' },
    { pattern: /\bFed\b|美联储|央行/i, tag: '美联储' },
    { pattern: /Iran|伊朗/i, tag: '伊朗' },
    { pattern: /Trump|特朗普/i, tag: '特朗普' },
    { pattern: /Oil|原油|石油|霍尔木兹/i, tag: '原油' },
    { pattern: /Uranium|铀/i, tag: '铀' },
    { pattern: /并购|收购/i, tag: '并购' },
    { pattern: /失业|裁员/i, tag: '就业' },
    { pattern: /战争|冲突|停火/i, tag: '地缘政治' },
    { pattern: /制造业|就业|收益率|国债/i, tag: '宏观' },
  ]

  for (const { pattern, tag } of keywordPatterns) {
    if (pattern.test(text)) tags.push(tag)
  }

  if (categoryText.includes('地缘') || categoryText.includes('政治')) tags.push('地缘政治')
  if (categoryText.includes('经济')) tags.push('宏观')
  if (categoryText.includes('科技')) tags.push('科技')
  if (categoryText.includes('企业')) tags.push('企业')
  if (categoryText.includes('金融')) tags.push('市场')
  if (categoryText.includes('政策') || categoryText.includes('监管')) tags.push('政策')

  return dedupeValues(tags).slice(0, 6)
}

function buildContent(payload: WsjPayload) {
  return [
    `摘要：${normalizeText(payload.event.summary) || '无'}`,
    `影响：${normalizeText(payload.event.impact) || '无'}`,
    '',
    `来源：华尔街日报`,
    `日期：${payload.paperDate}`,
    `分类：${normalizeText(payload.event.category) || '未分类'}`,
    `版面：${normalizeText(payload.event.sourcePage) || '未知'}`,
  ].join('\n')
}

export class WsjEventsNormalizer implements IntelligenceNormalizer {
  async normalize(record: SourceRecord): Promise<NormalizedIntelligenceDocument | null> {
    if (record.sourceCode !== WSJ_SOURCE_CODE) {
      return null
    }

    const payload = record.rawPayload as WsjPayload
    const title = normalizeText(record.titleRaw) || `WSJ Event ${record.externalId}`
    const summary = normalizeText(record.summaryRaw) || normalizeText(record.contentRaw) || title
    const fullText = `${title} ${summary} ${normalizeText(record.contentRaw)}`
    const category = mapCategory(payload.event.category, title, summary)

    const document: NormalizedIntelligenceDocument = {
      sourceCode: WSJ_SOURCE_CODE,
      sourceName: WSJ_SOURCE_NAME,
      externalId: record.externalId,
      publishedAt: record.publishedAt,
      capturedAt: record.capturedAt,
      title,
      summary,
      content: buildContent(payload),
      category,
      importance: inferImportance(payload.event.impact, payload.event.sourcePage),
      authorName: record.authorRaw || 'WSJ Importer',
      language: 'zh',
      region: 'US',
      tags: inferTags(payload, fullText),
      sectors: inferSectors(fullText.toLowerCase()),
      entities: inferEntities(fullText),
      metadata: {
        fileName: payload.fileName,
        paperDate: payload.paperDate,
        paperId: payload.paperId,
        sourcePage: payload.event.sourcePage,
        rawCategory: payload.event.category,
      },
      qualityScore: 0.85,
    }

    document.dedupeKey = buildDocumentDedupeKey(document)
    return document
  }
}
