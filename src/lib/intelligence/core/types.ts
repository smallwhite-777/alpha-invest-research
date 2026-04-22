export type IntelligenceCategory =
  | 'NEWS'
  | 'INDUSTRY_TRACK'
  | 'POLICY_RUMOR'
  | 'MEETING_MINUTES'
  | 'RESEARCH_REPORT'
  | 'GOSSIP'

export interface SourceRecord {
  sourceCode: string
  externalId: string
  externalUrl?: string
  publishedAt?: string
  capturedAt: string
  titleRaw?: string
  summaryRaw?: string
  contentRaw?: string
  authorRaw?: string
  languageRaw?: string
  rawPayload: unknown
}

export interface NormalizedEntity {
  type: 'company' | 'person' | 'country' | 'org' | 'commodity' | 'theme'
  name: string
  ticker?: string
}

export interface NormalizedSector {
  code: string
  name: string
}

export interface NormalizedIntelligenceDocument {
  sourceCode: string
  sourceName: string
  externalId: string
  externalUrl?: string
  publishedAt?: string
  capturedAt: string
  title: string
  summary: string
  content: string
  category: IntelligenceCategory
  importance: 1 | 2 | 3 | 4 | 5
  authorName?: string
  language?: string
  region?: string
  tags: string[]
  sectors: NormalizedSector[]
  entities: NormalizedEntity[]
  dedupeKey?: string
  qualityScore?: number
  metadata?: Record<string, unknown>
}

export interface IntelligenceConnectorFetchOptions {
  latestOnly?: boolean
  limit?: number
  directoryPath?: string
  startDate?: string
  endDate?: string
}

export interface IntelligenceConnector {
  sourceCode: string
  sourceName: string
  fetch(options?: IntelligenceConnectorFetchOptions): Promise<SourceRecord[]>
}

export interface IntelligenceNormalizer {
  normalize(record: SourceRecord): Promise<NormalizedIntelligenceDocument | null>
}
