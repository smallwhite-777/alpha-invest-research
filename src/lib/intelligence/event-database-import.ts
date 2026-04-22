import path from 'node:path'

import { dedupeNormalizedDocuments } from '@/lib/intelligence/core/dedupe'
import { EventDatabaseConnector, EVENT_DB_SOURCE_NAME, getEventDatabaseAvailableDates, getEventDatabasePreview, resolveEventDatabasePath } from '@/lib/intelligence/connectors/event-db/connector'
import { EventDatabaseNormalizer } from '@/lib/intelligence/connectors/event-db/normalizer'
import { ingestSource } from '@/lib/intelligence/services/ingest-source'

export { EVENT_DB_SOURCE_NAME, getEventDatabaseAvailableDates, getEventDatabasePreview, resolveEventDatabasePath }

export interface ImportEventDatabaseOptions {
  filePath?: string
  latestOnly?: boolean
  dryRun?: boolean
  saveSnapshot?: boolean
  startDate?: string
  endDate?: string
}

export interface ImportEventDatabaseResult {
  jobId?: string
  filePath: string
  imported: number
  skipped: number
  normalized: number
  snapshotPath?: string
  latestItems: Array<{ title: string; publishedAt?: string }>
  startDate?: string
  endDate?: string
}

export interface ImportEventDatabaseIncrementalOptions extends ImportEventDatabaseOptions {
  batchDays?: number
  newestFirst?: boolean
  maxBatches?: number
}

export interface IncrementalBatchResult {
  startDate: string
  endDate: string
  imported: number
  skipped: number
  normalized: number
  jobId?: string
}

export interface ImportEventDatabaseIncrementalResult {
  filePath: string
  totalBatches: number
  processedBatches: number
  imported: number
  skipped: number
  normalized: number
  batches: IncrementalBatchResult[]
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

function buildDateWindows(dates: string[], batchDays: number, newestFirst: boolean) {
  const orderedDates = [...dates].sort((left, right) => left.localeCompare(right))
  const windows: Array<{ startDate: string; endDate: string }> = []

  for (let index = 0; index < orderedDates.length; index += batchDays) {
    const slice = orderedDates.slice(index, index + batchDays)
    if (slice.length === 0) continue
    windows.push({
      startDate: slice[0],
      endDate: slice[slice.length - 1],
    })
  }

  return newestFirst ? windows.reverse() : windows
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
      startDate: options.startDate,
      endDate: options.endDate,
    },
    dryRun: options.dryRun,
    snapshotPath: options.saveSnapshot === false
      ? undefined
      : !options.startDate && !options.endDate
        ? buildSnapshotPath(filePath)
        : undefined,
  })

  return {
    jobId: result.jobId,
    filePath,
    imported: result.imported,
    skipped: result.skipped,
    normalized: result.normalized,
    snapshotPath: result.snapshotPath,
    latestItems: result.latestItems,
    startDate: options.startDate,
    endDate: options.endDate,
  }
}

export async function importEventDatabaseIncremental(options: ImportEventDatabaseIncrementalOptions = {}): Promise<ImportEventDatabaseIncrementalResult> {
  const filePath = resolveEventDatabasePath(options.filePath)
  const availableDates = await getEventDatabaseAvailableDates(filePath)
  const filteredDates = availableDates.filter(date => {
    if (options.startDate && date < options.startDate) return false
    if (options.endDate && date > options.endDate) return false
    return true
  })

  const batchDays = Math.max(1, options.batchDays ?? 7)
  const windows = buildDateWindows(filteredDates, batchDays, options.newestFirst ?? true)
  const targetWindows = typeof options.maxBatches === 'number' && options.maxBatches > 0
    ? windows.slice(0, options.maxBatches)
    : windows

  const batches: IncrementalBatchResult[] = []
  let imported = 0
  let skipped = 0
  let normalized = 0

  for (const window of targetWindows) {
    const result = await importEventDatabase({
      filePath,
      startDate: window.startDate,
      endDate: window.endDate,
      dryRun: options.dryRun,
      saveSnapshot: false,
    })

    batches.push({
      startDate: window.startDate,
      endDate: window.endDate,
      imported: result.imported,
      skipped: result.skipped,
      normalized: result.normalized,
      jobId: result.jobId,
    })
    imported += result.imported
    skipped += result.skipped
    normalized += result.normalized
  }

  return {
    filePath,
    totalBatches: windows.length,
    processedBatches: targetWindows.length,
    imported,
    skipped,
    normalized,
    batches,
  }
}

export async function getLocalEventDatabaseIntelligenceItems(options: Pick<ImportEventDatabaseOptions, 'filePath' | 'latestOnly' | 'startDate' | 'endDate'> = {}) {
  const connector = new EventDatabaseConnector()
  const normalizer = new EventDatabaseNormalizer()
  const records = await connector.fetch({
    directoryPath: options.filePath,
    latestOnly: options.latestOnly,
    startDate: options.startDate,
    endDate: options.endDate,
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
