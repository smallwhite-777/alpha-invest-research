import { buildDocumentDedupeKey, normalizeText } from '@/lib/intelligence/core/dedupe'
import type {
  IntelligenceNormalizer,
  NormalizedEntity,
  NormalizedIntelligenceDocument,
  NormalizedSector,
  SourceRecord,
} from '@/lib/intelligence/core/types'
import { EVENT_DB_SOURCE_CODE, type EventDatabasePayload } from './connector'

const SOURCE_NAME_MAP: Record<string, { code: string; name: string; region: string }> = {
  Bloomberg: { code: 'bloomberg', name: 'Bloomberg', region: 'GLOBAL' },
  WSJ: { code: 'wsj', name: '华尔街日报', region: 'US' },
  Economist: { code: 'economist', name: 'Economist', region: 'GLOBAL' },
}

const TOPIC_MAP: Record<string, { displayName: string; category: NormalizedIntelligenceDocument['category']; tags: string[] }> = {
  china_us_trade: { displayName: '中美关系', category: 'POLICY_RUMOR', tags: ['中美关系', '关税', '贸易'] },
  ai_competition: { displayName: 'AI竞争', category: 'INDUSTRY_TRACK', tags: ['AI', '科技'] },
  fed_policy: { displayName: '美联储政策', category: 'POLICY_RUMOR', tags: ['美联储', '宏观'] },
  russia_ukraine: { displayName: '俄乌与地缘政治', category: 'NEWS', tags: ['地缘政治'] },
  china_policy: { displayName: '中国政策', category: 'POLICY_RUMOR', tags: ['中国政策', '宏观'] },
  middle_east: { displayName: '中东局势', category: 'NEWS', tags: ['中东', '地缘政治'] },
  taiwan_issue: { displayName: '台湾议题', category: 'NEWS', tags: ['台湾', '地缘政治'] },
  ecb_policy: { displayName: '欧洲央行政策', category: 'POLICY_RUMOR', tags: ['欧洲央行', '宏观'] },
}

function dedupeValues(values: string[]) {
  return Array.from(new Set(values.map(normalizeText).filter(Boolean)))
}

function looksLikeLowQualityNoise(sourceName: string, content: string) {
  const normalized = normalizeText(content)
  if (!normalized) return true
  if (normalized.length < 8) return true
  if (/^by\s+[a-z .,'-]+$/i.test(normalized)) return true
  if (/^(photograph|illustration|for information contact|notice of|markets digest)\b/i.test(normalized)) return true
  if (/^[A-Z0-9 .,'&/-]{1,40}$/.test(normalized) && !/[\u4e00-\u9fff]/.test(normalized)) return true
  if (/^(f m|a m|j j|s o|n d)\b/i.test(normalized.toLowerCase())) return true

  if (sourceName === 'WSJ' && !/[\u4e00-\u9fff]/.test(normalized) && normalized.split(/\s+/).length <= 6) {
    return true
  }

  return false
}

function resolveSource(sourceName: string) {
  return SOURCE_NAME_MAP[sourceName] ?? {
    code: sourceName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    name: sourceName,
    region: 'GLOBAL',
  }
}

function resolveTopic(topicKey: string, payload: EventDatabasePayload) {
  return TOPIC_MAP[topicKey] ?? {
    displayName: normalizeText(payload.topicName) || topicKey,
    category: 'NEWS',
    tags: ['事件跟踪'],
  }
}

function buildTitle(content: string, topicDisplayName: string) {
  const normalized = normalizeText(content)
  if (/[\u4e00-\u9fff]/.test(normalized)) {
    const parts = normalized.split(/[。！？；]/).map(part => normalizeText(part)).filter(Boolean)
    const candidate = parts[0] || normalized
    return candidate.length > 34 ? `${candidate.slice(0, 34)}…` : candidate
  }

  const compact = normalized.replace(/\.$/, '')
  return compact.length > 72 ? `${compact.slice(0, 72)}…` : compact || `${topicDisplayName}事件`
}

function inferImportance(topicKey: string, content: string, sourceName: string): 1 | 2 | 3 | 4 | 5 {
  const combined = `${topicKey} ${content} ${sourceName}`.toLowerCase()
  let score = sourceName === 'Bloomberg' ? 3 : 2

  const signals = [
    '美联储',
    '央行',
    '停火',
    '战争',
    '关税',
    '制裁',
    '会谈',
    'ipo',
    '融资',
    '通胀',
    '油价',
    '特朗普',
    '拉加德',
    '率团',
    '协议',
  ]

  if (signals.some(signal => combined.includes(signal.toLowerCase()))) score += 1
  if (/(china_us_trade|fed_policy|middle_east|ecb_policy)/.test(topicKey)) score += 1

  return Math.min(score, 5) as 1 | 2 | 3 | 4 | 5
}

function inferSectors(text: string, topicKey: string): NormalizedSector[] {
  const sectors: NormalizedSector[] = []

  if (/(ai|chip|semiconductor|google|huawei|openai|cursor|cloud)/i.test(text) || topicKey === 'ai_competition') {
    sectors.push({ code: 'SW_COMPUTER', name: '计算机' })
  }
  if (/(oil|gas|energy|霍尔木兹|原油|天然气|伊朗原油)/i.test(text) || topicKey === 'middle_east') {
    sectors.push({ code: 'SW_OIL', name: '石油石化' })
  }
  if (/(bank|利率|降息|加息|bond|国债|银行)/i.test(text) || /(fed_policy|ecb_policy)/.test(topicKey)) {
    sectors.push({ code: 'SW_BANK', name: '银行' })
  }
  if (/(药品|制药|biotech|pharma|eli lilly)/i.test(text)) {
    sectors.push({ code: 'SW_PHARMA', name: '医药生物' })
  }

  return sectors
}

function inferEntities(text: string): NormalizedEntity[] {
  const candidates: Array<{ pattern: RegExp; entity: NormalizedEntity }> = [
    { pattern: /中国|China/i, entity: { type: 'country', name: '中国' } },
    { pattern: /美国|U\.S\.|US\b|特朗普|Trump/i, entity: { type: 'country', name: '美国' } },
    { pattern: /伊朗|Iran/i, entity: { type: 'country', name: '伊朗' } },
    { pattern: /俄罗斯|Russia/i, entity: { type: 'country', name: '俄罗斯' } },
    { pattern: /美联储|Fed|Federal Reserve/i, entity: { type: 'org', name: '美联储' } },
    { pattern: /欧洲央行|ECB|Lagarde/i, entity: { type: 'org', name: '欧洲央行' } },
    { pattern: /Google|谷歌/i, entity: { type: 'company', name: 'Google' } },
    { pattern: /华为|Huawei/i, entity: { type: 'company', name: '华为' } },
    { pattern: /OpenAI/i, entity: { type: 'company', name: 'OpenAI' } },
    { pattern: /Cursor/i, entity: { type: 'company', name: 'Cursor' } },
    { pattern: /原油|Oil|天然气|Gas/i, entity: { type: 'commodity', name: '原油' } },
  ]

  return candidates.filter(candidate => candidate.pattern.test(text)).map(candidate => candidate.entity)
}

function inferTags(text: string, topicKey: string, topicDisplayName: string): string[] {
  const tags = [...(TOPIC_MAP[topicKey]?.tags ?? []), topicDisplayName]
  const keywordTags: Array<{ pattern: RegExp; tag: string }> = [
    { pattern: /\bAI\b|人工智能/i, tag: 'AI' },
    { pattern: /关税|贸易/i, tag: '关税' },
    { pattern: /伊朗|中东|霍尔木兹/i, tag: '中东' },
    { pattern: /停火|战争|冲突/i, tag: '地缘政治' },
    { pattern: /美联储|Fed|降息|加息/i, tag: '货币政策' },
    { pattern: /欧洲央行|ECB/i, tag: '欧洲央行' },
    { pattern: /IPO|融资/i, tag: '融资' },
    { pattern: /台湾/i, tag: '台湾' },
    { pattern: /特朗普|Trump/i, tag: '特朗普' },
  ]

  for (const { pattern, tag } of keywordTags) {
    if (pattern.test(text)) tags.push(tag)
  }

  return dedupeValues(tags).slice(0, 8)
}

function buildContent(payload: EventDatabasePayload, summary: string, sourceName: string, topicDisplayName: string) {
  return [
    summary,
    '',
    `来源：${resolveSource(sourceName).name}`,
    `主题：${topicDisplayName}`,
    `日期：${payload.itemDate || '未知'}`,
    `来源文件：${payload.fileName}`,
  ].join('\n')
}

export class EventDatabaseNormalizer implements IntelligenceNormalizer {
  async normalize(record: SourceRecord): Promise<NormalizedIntelligenceDocument | null> {
    if (record.sourceCode !== EVENT_DB_SOURCE_CODE) {
      return null
    }

    const payload = record.rawPayload as EventDatabasePayload
    const sourceName = normalizeText(payload.sourceName)
    const rawText = normalizeText(payload.originalContent || record.contentRaw || record.summaryRaw || record.titleRaw)

    if (looksLikeLowQualityNoise(sourceName, rawText)) {
      return null
    }

    const source = resolveSource(sourceName)
    const topic = resolveTopic(payload.topicKey, payload)
    const summary = rawText
    const title = buildTitle(rawText, topic.displayName)
    const combined = `${title} ${summary} ${payload.topicDescription || ''}`

    const document: NormalizedIntelligenceDocument = {
      sourceCode: source.code,
      sourceName: source.name,
      externalId: `${payload.topicKey}:${source.code}:${record.externalId}`,
      publishedAt: record.publishedAt,
      capturedAt: record.capturedAt,
      title,
      summary,
      content: buildContent(payload, summary, sourceName, topic.displayName),
      category: topic.category,
      importance: inferImportance(payload.topicKey, combined, sourceName),
      authorName: source.name,
      language: record.languageRaw || (/[\u4e00-\u9fff]/.test(rawText) ? 'zh' : 'en'),
      region: source.region,
      tags: inferTags(combined, payload.topicKey, topic.displayName),
      sectors: inferSectors(combined, payload.topicKey),
      entities: inferEntities(combined),
      metadata: {
        topicKey: payload.topicKey,
        topicName: topic.displayName,
        topicDescription: payload.topicDescription,
        sourceName: source.name,
        fileName: payload.fileName,
        itemDate: payload.itemDate,
        itemIndex: payload.itemIndex,
      },
      qualityScore: sourceName === 'Bloomberg' ? 0.9 : sourceName === 'Economist' ? 0.75 : 0.65,
    }

    document.dedupeKey = buildDocumentDedupeKey(document)
    return document
  }
}
