import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { IntelligenceConnector, IntelligenceConnectorFetchOptions, SourceRecord } from '@/lib/intelligence/core/types'
import { normalizeText } from '@/lib/intelligence/core/dedupe'

export const EVENT_DB_SOURCE_CODE = 'event_db'
export const EVENT_DB_SOURCE_NAME = '本地事件库'

export interface EventDatabaseTopicBucket {
  name?: string
  description?: string
  total_items?: number
  date_range?: {
    start?: string
    end?: string
    count?: number
  }
  sources?: Record<string, Array<{ date?: string; content?: string }>>
}

export interface EventDatabaseFile {
  [topicKey: string]: EventDatabaseTopicBucket
}

export interface EventDatabasePayload {
  topicKey: string
  topicName: string
  topicDescription?: string
  sourceName: string
  itemIndex: number
  itemDate?: string
  fileName: string
  originalContent: string
}

function isWithinDateRange(date: string | undefined, startDate?: string, endDate?: string) {
  if (!date) return false
  if (startDate && date < startDate) return false
  if (endDate && date > endDate) return false
  return true
}

function slugifySourceCode(sourceName: string) {
  return normalizeText(sourceName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'event_source'
}

function normalizeDate(value?: string) {
  const raw = normalizeText(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined
}

async function ensureFileExists(filePath: string) {
  const stats = await fs.stat(filePath)
  if (!stats.isFile()) {
    throw new Error(`Event database path is not a file: ${filePath}`)
  }
}

export function resolveEventDatabasePath(explicitPath?: string) {
  if (explicitPath) return explicitPath
  if (process.env.EVENT_DATABASE_PATH) return process.env.EVENT_DATABASE_PATH
  throw new Error('EVENT_DATABASE_PATH is not configured')
}

export async function getEventDatabasePreview(filePath?: string) {
  const resolvedPath = resolveEventDatabasePath(filePath)
  await ensureFileExists(resolvedPath)

  const parsed = JSON.parse(await fs.readFile(resolvedPath, 'utf8')) as EventDatabaseFile
  const topicEntries = Object.entries(parsed).filter(([, bucket]) => bucket && typeof bucket === 'object')
  const topicCount = topicEntries.length
  const sourceNames = new Set<string>()
  let itemCount = 0

  for (const [, bucket] of topicEntries) {
    for (const [sourceName, items] of Object.entries(bucket.sources ?? {})) {
      sourceNames.add(sourceName)
      itemCount += Array.isArray(items) ? items.length : 0
    }
  }

  return {
    filePath: resolvedPath,
    fileName: path.basename(resolvedPath),
    topicCount,
    sourceCount: sourceNames.size,
    itemCount,
  }
}

export async function getEventDatabaseAvailableDates(filePath?: string) {
  const resolvedPath = resolveEventDatabasePath(filePath)
  await ensureFileExists(resolvedPath)

  const parsed = JSON.parse(await fs.readFile(resolvedPath, 'utf8')) as EventDatabaseFile
  const dates = new Set<string>()

  for (const [, bucket] of Object.entries(parsed)) {
    for (const [, items] of Object.entries(bucket.sources ?? {})) {
      for (const item of items) {
        const normalizedDate = normalizeDate(item?.date)
        if (normalizedDate) {
          dates.add(normalizedDate)
        }
      }
    }
  }

  return Array.from(dates).sort((left, right) => left.localeCompare(right))
}

export class EventDatabaseConnector implements IntelligenceConnector {
  sourceCode = EVENT_DB_SOURCE_CODE
  sourceName = EVENT_DB_SOURCE_NAME

  async fetch(options: IntelligenceConnectorFetchOptions = {}): Promise<SourceRecord[]> {
    const filePath = resolveEventDatabasePath(options.directoryPath)
    await ensureFileExists(filePath)

    const parsed = JSON.parse(await fs.readFile(filePath, 'utf8')) as EventDatabaseFile
    const records: SourceRecord[] = []
    const fileName = path.basename(filePath)

    for (const [topicKey, bucket] of Object.entries(parsed)) {
      const topicName = normalizeText(bucket?.name) || topicKey
      const topicDescription = normalizeText(bucket?.description)

      for (const [sourceName, items] of Object.entries(bucket?.sources ?? {})) {
        const normalizedSourceName = normalizeText(sourceName)
        const filteredByDate = items.filter(item => {
          const normalizedItemDate = normalizeDate(item?.date)
          if (options.startDate || options.endDate) {
            return isWithinDateRange(normalizedItemDate, options.startDate, options.endDate)
          }
          return true
        })
        const selectedItems = options.latestOnly ? filteredByDate.slice(-20) : filteredByDate

        selectedItems.forEach((item, index) => {
          const normalizedContent = normalizeText(item?.content)
          const normalizedItemDate = normalizeDate(item?.date)
          const publishedAt = normalizedItemDate ? `${normalizedItemDate}T00:00:00.000Z` : undefined

          records.push({
            sourceCode: this.sourceCode,
            externalId: [
              slugifySourceCode(normalizedSourceName),
              topicKey,
              normalizedItemDate || 'undated',
              String(index + 1),
            ].join(':'),
            publishedAt,
            capturedAt: new Date().toISOString(),
            titleRaw: normalizedContent,
            summaryRaw: normalizedContent,
            contentRaw: normalizedContent,
            authorRaw: normalizedSourceName,
            languageRaw: /[\u4e00-\u9fff]/.test(normalizedContent) ? 'zh' : 'en',
            rawPayload: {
              topicKey,
              topicName,
              topicDescription,
              sourceName: normalizedSourceName,
              itemIndex: index,
              itemDate: normalizedItemDate,
              fileName,
              originalContent: normalizedContent,
            } satisfies EventDatabasePayload,
          })
        })
      }
    }

    return records
  }
}
