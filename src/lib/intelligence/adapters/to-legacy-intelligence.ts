type LegacyTag = { tag: { name: string } }
type LegacySector = { sectorCode: string; sectorName: string }
type LegacyStock = { stockSymbol: string; stockName: string }

export interface LegacyIntelligenceItem {
  id: string
  title: string
  content: string
  summary: string | null
  category: string
  importance: number
  source: string | null
  authorName: string | null
  createdAt: string
  updatedAt: string
  tags: LegacyTag[]
  sectors: LegacySector[]
  stocks: LegacyStock[]
}

type NewDocumentShape = {
  id: string
  title: string
  content: string
  summary: string | null
  category: string
  importance: number
  publishedAt: Date | null
  capturedAt: Date
  createdAt: Date
  updatedAt: Date
  authorName: string | null
  source: { name: string }
  tags: Array<{ tag: { name: string } }>
  sectors: Array<{ sectorCode: string; sectorName: string }>
}

export function toLegacyIntelligenceItem(document: NewDocumentShape): LegacyIntelligenceItem {
  const timestamp = document.publishedAt ?? document.capturedAt ?? document.createdAt

  return {
    id: document.id,
    title: document.title,
    content: document.content,
    summary: document.summary,
    category: document.category,
    importance: document.importance,
    source: document.source?.name ?? null,
    authorName: document.authorName ?? null,
    createdAt: timestamp.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    tags: document.tags.map(tag => ({ tag: { name: tag.tag.name } })),
    sectors: document.sectors.map(sector => ({
      sectorCode: sector.sectorCode,
      sectorName: sector.sectorName,
    })),
    stocks: [],
  }
}
