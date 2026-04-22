import { promises as fs } from 'node:fs'
import path from 'node:path'

import { dedupeNormalizedDocuments } from '@/lib/intelligence/core/dedupe'
import { ensureIntelligenceStoreSchema } from '@/lib/intelligence/core/schema'
import type { IntelligenceConnector, IntelligenceConnectorFetchOptions, IntelligenceNormalizer, NormalizedIntelligenceDocument } from '@/lib/intelligence/core/types'
import { upsertNormalizedDocument } from '@/lib/intelligence/core/upsert'
import { ensureSourceRecord, finishIngestionJob, startIngestionJob } from '@/lib/intelligence/services/ingestion-jobs'

export interface IngestSourceOptions extends IntelligenceConnectorFetchOptions {
  dryRun?: boolean
  snapshotPath?: string
}

export interface IngestSourceResult {
  jobId?: string
  fetched: number
  normalized: number
  imported: number
  skipped: number
  snapshotPath?: string
  latestItems: Array<{ title: string; publishedAt?: string }>
}

export async function saveNormalizedSnapshot(snapshotPath: string, documents: NormalizedIntelligenceDocument[]) {
  await fs.writeFile(snapshotPath, JSON.stringify(documents, null, 2), 'utf8')
}

export async function ingestSource(options: {
  connector: IntelligenceConnector
  normalizer: IntelligenceNormalizer
  fetchOptions?: IntelligenceConnectorFetchOptions
  dryRun?: boolean
  snapshotPath?: string
}): Promise<IngestSourceResult> {
  let jobId: string | undefined
  let fetched = 0
  let normalizedCount = 0
  let imported = 0
  let skipped = 0

  if (!options.dryRun) {
    await ensureIntelligenceStoreSchema()
    const source = await ensureSourceRecord({
      code: options.connector.sourceCode,
      name: options.connector.sourceName,
      type: 'news',
    })
    const job = await startIngestionJob({
      sourceId: source.id,
      jobType: 'pull',
      inputCursor: JSON.stringify(options.fetchOptions ?? {}),
    })
    jobId = job.id
  }

  try {
  const records = await options.connector.fetch(options.fetchOptions)
  fetched = records.length
  const normalizedCandidates = await Promise.all(records.map(record => options.normalizer.normalize(record)))
  const normalizedDocuments = dedupeNormalizedDocuments(
    normalizedCandidates.filter((document): document is NormalizedIntelligenceDocument => Boolean(document))
  )
  normalizedCount = normalizedDocuments.length

  for (const document of normalizedDocuments) {
    const result = await upsertNormalizedDocument(document, Boolean(options.dryRun), jobId)
    if (result.skipped) skipped += 1
    else imported += 1
  }

  if (options.snapshotPath) {
    await fs.mkdir(path.dirname(options.snapshotPath), { recursive: true })
    await saveNormalizedSnapshot(options.snapshotPath, normalizedDocuments)
  }

  if (jobId) {
    await finishIngestionJob({
      jobId,
      status: 'success',
      totalFetched: fetched,
      totalNormalized: normalizedCount,
      totalInserted: imported,
      totalSkipped: skipped,
      outputCursor: JSON.stringify({ latest: normalizedDocuments[0]?.publishedAt ?? null }),
    })
  }

  return {
    jobId,
    fetched,
    normalized: normalizedCount,
    imported,
    skipped,
    snapshotPath: options.snapshotPath,
    latestItems: normalizedDocuments
      .slice()
      .sort((left, right) => (right.publishedAt || right.capturedAt).localeCompare(left.publishedAt || left.capturedAt))
      .slice(0, 10)
      .map(document => ({
        title: document.title,
        publishedAt: document.publishedAt,
      })),
  }
  } catch (error) {
    if (jobId) {
      await finishIngestionJob({
        jobId,
        status: 'failed',
        totalFetched: fetched,
        totalNormalized: normalizedCount,
        totalInserted: imported,
        totalSkipped: skipped,
        errorMessage: error instanceof Error ? error.message : 'Unknown ingestion error',
      })
    }
    throw error
  }
}
