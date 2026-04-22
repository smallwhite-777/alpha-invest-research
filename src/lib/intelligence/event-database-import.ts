import path from 'node:path'

import { dedupeNormalizedDocuments } from '@/lib/intelligence/core/dedupe'
import { EventDatabaseConnector, EVENT_DB_SOURCE_NAME, getEventDatabasePreview, resolveEventDatabasePath } from '@/lib/intelligence/connectors/event-db/connector'
import { EventDatabaseNormalizer } from '@/lib/intelligence/connectors/event-db/normalizer'
import { ingestSource } from '@/lib/intelligence/services/ingest-source'

export { EVENT_DB_SOURCE_NAME, getEventDatabasePreview, resolveEventDatabasePath }

export interface ImportEventDatabaseOptions {
  filePath?: string
  latestOnly?: boolean
  dryRun?: boolean
  saveSnapshot?: boolean
}

export interface ImportEventDatabaseResult {
  jobId?: string
  filePath: string
  imported: number
  skipped: number
  normalized: number
  snapshotPath?: string
  latestItems: Array<{ title: string; publishedAt?: string }>
}

export interface LocalEventDatabaseIntelligenceItem {
  id: string
  title: string
  content: string
  summary: string
  category: string
  importance: number
  source: string
  authorName: string
  createdAt: string
  updatedAt: string
  tags: Array<{ tag: { name: string } }>
  sectors: Array<{ sectorCode: string; sectorName: string }>
  stocks: Array<{ stockSymbol: string; stockName: string }>
}

function buildSnapshotPath(filePath: string) {
  return path.join(path.dirname(filePath), 'normalized_event_database_intelligence.json')
}

export async function importEventDatabase(options: ImportEventDatabaseOptions = {}): Promise<ImportEventDatabaseResult> {
  const filePath = resolveEventDatabasePath(options.filePath)
  await getEventDatabasePreview(filePath)

  const result = await ingestSource({
    connector: new EventDatabaseConnector(),
    normalizer: new EventDatabaseNormalizer(),
    fetchOptions: {
      directoryPath: filePath,
      latestOnly: options.latestOnly,
    },
    dryRun: options.dryRun,
    snapshotPath: options.saveSnapshot === false ? undefined : buildSnapshotPath(filePath),
  })

  return {
    jobId: result.jobId,
    filePath,
    imported: result.imported,
    skipped: result.skipped,
    normalized: result.normalized,
    snapshotPath: result.snapshotPath,
    latestItems: result.latestItems,
  }
}

export async function getLocalEventDatabaseIntelligenceItems(options: Pick<ImportEventDatabaseOptions, 'filePath' | 'latestOnly'> = {}) {
  const connector = new EventDatabaseConnector()
  const normalizer = new EventDatabaseNormalizer()
  const records = await connector.fetch({
    directoryPath: options.filePath,
    latestOnly: options.latestOnly,
  })

  const normalized = dedupeNormalizedDocuments(
    (
      await Promise.all(records.map(record => normalizer.normalize(record)))
    ).filter((document): document is NonNullable<typeof document> => Boolean(document))
  )

  return normalized
    .sort((left, right) => (right.publishedAt || right.capturedAt).localeCompare(left.publishedAt || left.capturedAt))
    .map(document => ({
      id: `${document.sourceCode}:${document.externalId}`,
      title: document.title,
      content: document.content,
      summary: document.summary,
      category: document.category,
      importance: document.importance,
      source: document.sourceName,
      authorName: document.authorName || document.sourceName,
      createdAt: document.publishedAt || document.capturedAt,
      updatedAt: document.publishedAt || document.capturedAt,
      tags: document.tags.map(tag => ({ tag: { name: tag } })),
      sectors: document.sectors.map(sector => ({
        sectorCode: sector.code,
        sectorName: sector.name,
      })),
      stocks: [],
    } satisfies LocalEventDatabaseIntelligenceItem))
}
