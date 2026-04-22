import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { IntelligenceConnector, IntelligenceConnectorFetchOptions, SourceRecord } from '@/lib/intelligence/core/types'
import { normalizeText } from '@/lib/intelligence/core/dedupe'

export const WSJ_SOURCE_CODE = 'wsj'
export const WSJ_SOURCE_NAME = '华尔街日报'

interface ParsedWsjEvent {
  id: number
  category: string
  title: string
  summary: string
  impact: string
  sourcePage: string
}

interface ParsedWsjPaper {
  date: string
  paperId: string
  translatedSummary?: string
  events: ParsedWsjEvent[]
}

function parseQuotedField(line: string, field: string): string | null {
  const match = line.trim().match(new RegExp(`^"${field}":\\s*"(.*)"[,]?$`))
  return match ? match[1].trim() : null
}

async function listWsjFiles(directoryPath: string): Promise<string[]> {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true })
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('_events.json'))
    .map(entry => path.join(directoryPath, entry.name))
    .sort((left, right) => left.localeCompare(right))
}

async function ensureDirectoryExists(directoryPath: string) {
  const stats = await fs.stat(directoryPath)
  if (!stats.isDirectory()) {
    throw new Error(`WSJ events path is not a directory: ${directoryPath}`)
  }
}

async function parseWsjPaper(filePath: string): Promise<ParsedWsjPaper> {
  const content = await fs.readFile(filePath, 'utf8')
  const lines = content.split(/\r?\n/)

  let date = ''
  let paperId = ''
  let translatedSummary = ''
  let inEvents = false
  let currentEvent: Partial<ParsedWsjEvent> | null = null
  const events: ParsedWsjEvent[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!date) date = parseQuotedField(line, 'date') ?? date
    if (!paperId) paperId = parseQuotedField(line, 'paper_id') ?? paperId
    if (!translatedSummary) translatedSummary = parseQuotedField(line, 'translated_summary') ?? translatedSummary

    if (line.startsWith('"events": [')) {
      inEvents = true
      continue
    }

    if (inEvents && line === '],') {
      inEvents = false
      continue
    }

    if (!inEvents) continue

    if (line === '{') {
      currentEvent = {}
      continue
    }

    if (line === '},' || line === '}') {
      if (currentEvent?.id && currentEvent.title) {
        events.push({
          id: currentEvent.id,
          category: normalizeText(currentEvent.category),
          title: normalizeText(currentEvent.title),
          summary: normalizeText(currentEvent.summary),
          impact: normalizeText(currentEvent.impact),
          sourcePage: normalizeText(currentEvent.sourcePage),
        })
      }
      currentEvent = null
      continue
    }

    if (!currentEvent) continue

    const idMatch = line.match(/^"id":\s*(\d+)[,]?$/)
    if (idMatch) {
      currentEvent.id = Number(idMatch[1])
      continue
    }

    currentEvent.category = parseQuotedField(line, 'category') ?? currentEvent.category
    currentEvent.title = parseQuotedField(line, 'title') ?? currentEvent.title
    currentEvent.summary = parseQuotedField(line, 'summary') ?? currentEvent.summary
    currentEvent.impact = parseQuotedField(line, 'impact') ?? currentEvent.impact
    currentEvent.sourcePage = parseQuotedField(line, 'source_page') ?? currentEvent.sourcePage
  }

  if (!date) {
    throw new Error(`Unable to parse date from file: ${filePath}`)
  }

  return {
    date,
    paperId,
    translatedSummary: normalizeText(translatedSummary),
    events,
  }
}

export function resolveWsjEventsDbPath(explicitPath?: string): string {
  if (explicitPath) return explicitPath
  if (process.env.WSJ_EVENTS_DB_PATH) return process.env.WSJ_EVENTS_DB_PATH

  throw new Error('WSJ_EVENTS_DB_PATH is not configured')
}

export async function getWsjImportPreview(directoryPath?: string) {
  const resolvedPath = resolveWsjEventsDbPath(directoryPath)
  await ensureDirectoryExists(resolvedPath)
  const files = await listWsjFiles(resolvedPath)

  return {
    directoryPath: resolvedPath,
    fileCount: files.length,
    earliestFile: files[0] ? path.basename(files[0]) : null,
    latestFile: files[files.length - 1] ? path.basename(files[files.length - 1]) : null,
  }
}

export class WsjEventsConnector implements IntelligenceConnector {
  sourceCode = WSJ_SOURCE_CODE
  sourceName = WSJ_SOURCE_NAME

  async fetch(options: IntelligenceConnectorFetchOptions = {}): Promise<SourceRecord[]> {
    const directoryPath = resolveWsjEventsDbPath(options.directoryPath)
    await ensureDirectoryExists(directoryPath)
    const files = await listWsjFiles(directoryPath)
    const selectedFiles = options.latestOnly
      ? files.slice(-1)
      : options.limit
        ? files.slice(-Math.abs(options.limit))
        : files

    const records: SourceRecord[] = []

    for (const filePath of selectedFiles) {
      let paper: ParsedWsjPaper
      try {
        paper = await parseWsjPaper(filePath)
      } catch (error) {
        console.warn(`Skipping malformed WSJ file: ${filePath}`, error)
        continue
      }
      const fileName = path.basename(filePath)

      for (const event of paper.events) {
        const publishedAt = new Date(`${paper.date}T00:00:00.000Z`)
        publishedAt.setUTCMinutes(event.id)

        records.push({
          sourceCode: this.sourceCode,
          externalId: `${paper.date}:${event.id}`,
          publishedAt: publishedAt.toISOString(),
          capturedAt: new Date().toISOString(),
          titleRaw: event.title,
          summaryRaw: event.summary,
          contentRaw: event.impact,
          authorRaw: 'WSJ Importer',
          languageRaw: 'zh',
          rawPayload: {
            fileName,
            paperId: paper.paperId,
            paperDate: paper.date,
            translatedSummary: paper.translatedSummary,
            event,
          },
        })
      }
    }

    return records
  }
}
