import path from 'node:path'

import { WsjEventsConnector, getWsjImportPreview, resolveWsjEventsDbPath, WSJ_SOURCE_NAME } from '@/lib/intelligence/connectors/wsj/connector'
import { WsjEventsNormalizer } from '@/lib/intelligence/connectors/wsj/normalizer'
import { ingestSource } from '@/lib/intelligence/services/ingest-source'
import { dedupeNormalizedDocuments } from '@/lib/intelligence/core/dedupe'

export { getWsjImportPreview, resolveWsjEventsDbPath, WSJ_SOURCE_NAME }

export interface ImportWsjOptions {
  directoryPath?: string
  latestOnly?: boolean
  maxFiles?: number
  dryRun?: boolean
  saveSnapshot?: boolean
}

export interface ImportWsjResult {
  jobId?: string
  directoryPath: string
  processedFiles: string[]
  imported: number
  skipped: number
  normalized: number
  snapshotPath?: string
  latestItems: Array<{ title: string; publishedAt?: string }>
  errors: Array<{ file: string; message: string }>
}

export interface LocalWsjIntelligenceItem {
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

function buildSnapshotPath(directoryPath: string) {
  return path.join(directoryPath, 'normalized_wsj_intelligence.json')
}

export async function importWsjEvents(options: ImportWsjOptions = {}): Promise<ImportWsjResult> {
  const directoryPath = resolveWsjEventsDbPath(options.directoryPath)
  const preview = await getWsjImportPreview(directoryPath)
  const connector = new WsjEventsConnector()
  const normalizer = new WsjEventsNormalizer()

  const result = await ingestSource({
    connector,
    normalizer,
    fetchOptions: {
      directoryPath,
      latestOnly: options.latestOnly,
      limit: options.maxFiles,
    },
    dryRun: options.dryRun,
    snapshotPath: options.saveSnapshot === false ? undefined : buildSnapshotPath(directoryPath),
  })

  return {
    jobId: result.jobId,
    directoryPath,
    processedFiles: preview.fileCount ? [preview.earliestFile, preview.latestFile].filter((file): file is string => Boolean(file)) : [],
    imported: result.imported,
    skipped: result.skipped,
    normalized: result.normalized,
    snapshotPath: result.snapshotPath,
    latestItems: result.latestItems,
    errors: [],
  }
}

export async function getLocalWsjIntelligenceItems(options: Pick<ImportWsjOptions, 'directoryPath' | 'latestOnly' | 'maxFiles'> = {}): Promise<LocalWsjIntelligenceItem[]> {
  const connector = new WsjEventsConnector()
  const normalizer = new WsjEventsNormalizer()
  const records = await connector.fetch({
    directoryPath: options.directoryPath,
    latestOnly: options.latestOnly,
    limit: options.maxFiles,
  })
  const normalized = dedupeNormalizedDocuments(
    (
      await Promise.all(records.map(record => normalizer.normalize(record)))
    ).filter((document): document is NonNullable<typeof document> => Boolean(document))
  )

  return normalized
    .sort((left, right) => (right.publishedAt || right.capturedAt).localeCompare(left.publishedAt || left.capturedAt))
    .map(document => ({
      id: `wsj:${document.externalId}`,
      title: document.title,
      content: document.content,
      summary: document.summary,
      category: document.category,
      importance: document.importance,
      source: document.sourceName,
      authorName: document.authorName || 'WSJ Importer',
      createdAt: document.publishedAt || document.capturedAt,
      updatedAt: document.publishedAt || document.capturedAt,
      tags: document.tags.map(tag => ({ tag: { name: tag } })),
      sectors: document.sectors.map(sector => ({
        sectorCode: sector.code,
        sectorName: sector.name,
      })),
      stocks: [],
    }))
}
