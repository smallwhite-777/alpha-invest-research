import { prisma } from '@/lib/db'
import { toLegacyIntelligenceItem, type LegacyIntelligenceItem } from '@/lib/intelligence/adapters/to-legacy-intelligence'

export interface IntelligenceFeedQuery {
  category?: string | null
  sector?: string | null
  importance?: string | null
  source?: string | null
  search?: string | null
  recentDays?: string | null
  skip: number
  limit: number
}

function buildDocumentWhere(query: Omit<IntelligenceFeedQuery, 'skip' | 'limit'>) {
  const where: Record<string, unknown> = {}

  if (query.category) where.category = query.category
  if (query.importance) where.importance = parseInt(query.importance)
  if (query.source) {
    where.source = {
      name: query.source,
    }
  }
  if (query.sector) {
    where.sectors = {
      some: { sectorCode: query.sector },
    }
  }
  if (query.search) {
    where.OR = [
      { title: { contains: query.search } },
      { content: { contains: query.search } },
      { summary: { contains: query.search } },
      {
        tags: {
          some: {
            tag: {
              name: { contains: query.search },
            },
          },
        },
      },
    ]
  }
  if (query.recentDays) {
    const days = parseInt(query.recentDays)
    if (Number.isFinite(days) && days > 0) {
      const since = new Date()
      since.setDate(since.getDate() - days)
      where.AND = [
        {
          OR: [
            { publishedAt: { gte: since } },
            {
              AND: [
                { publishedAt: null },
                { capturedAt: { gte: since } },
              ],
            },
          ],
        },
      ]
    }
  }

  return where
}

export async function getIntelligenceFeedFromNewStore(query: IntelligenceFeedQuery): Promise<{
  items: LegacyIntelligenceItem[]
  total: number
}> {
  const where = buildDocumentWhere(query)

  const [items, total] = await Promise.all([
    prisma.intelligenceDocument.findMany({
      where,
      include: {
        source: { select: { name: true } },
        tags: { include: { tag: { select: { name: true } } } },
        sectors: true,
      },
      orderBy: [
        { publishedAt: 'desc' },
        { capturedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: query.skip,
      take: query.limit,
    }),
    prisma.intelligenceDocument.count({ where }),
  ])

  return {
    items: items.map(toLegacyIntelligenceItem),
    total,
  }
}

export async function hasNewIntelligenceStoreData() {
  const count = await prisma.intelligenceDocument.count({ take: 1 })
  return count > 0
}
