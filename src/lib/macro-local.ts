import 'server-only'

import { promises as fs } from 'fs'
import path from 'path'
import type { MacroCategory } from '@/lib/constants'
import { MACRO_CATALOG, type MacroCatalogEntry, type MacroFrequency } from '@/lib/macro-catalog'

export interface LocalMacroIndicator {
  id: string
  createdAt: string
  updatedAt: string
  code: string
  name: string
  category: MacroCategory
  unit: string
  frequency: MacroFrequency
  source: string
  description?: string
}

export interface LocalMacroPoint {
  date: string
  value: number
}

export interface LocalMacroQuality {
  score: number
  status: 'good' | 'fair' | 'poor'
  isStale: boolean
  suspectLatest: boolean
  notes: string[]
}

export interface LocalMacroLatest {
  indicatorCode: string
  latestValue: number | null
  latestDate: string | null
  previousValue: number | null
  change: number | null
  quality: LocalMacroQuality
}

const DATA_DIR = path.join(process.cwd(), 'macro-data', 'data')
const PUBLISHED_SERIES_FILE = path.join(DATA_DIR, 'series.csv')
const EVENT_WHITELIST: Record<string, Set<string>> = {
  US_DCOILBRENTEU_M: new Set(['2026-03-31']),
}

const CATEGORY_ALIASES: Record<string, MacroCategory> = {
  ECONOMIC: 'ECONOMIC',
  MONETARY: 'MONETARY',
  COMMODITY: 'COMMODITY',
  SENTIMENT: 'SENTIMENT',
  PRICE: 'ECONOMIC',
}

const fileCache = new Map<string, Promise<string>>()
const publishedSeriesCache = new Map<string, Promise<Map<string, LocalMacroPoint[]>>>()

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

function toMonthEnd(date: string): string {
  const [yearText, monthText] = date.slice(0, 10).split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${yearText}-${monthText}-${String(lastDay).padStart(2, '0')}`
}

function toQuarterEnd(date: string): string {
  const [yearText, monthText] = date.slice(0, 10).split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const quarterEndMonth = Math.ceil(month / 3) * 3
  const lastDay = new Date(Date.UTC(year, quarterEndMonth, 0)).getUTCDate()
  return `${yearText}-${String(quarterEndMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

function toYearEnd(date: string): string {
  const yearText = date.slice(0, 4)
  return `${yearText}-12-31`
}

function normalizeDateForFrequency(date: string, frequency: MacroFrequency): string {
  if (!date) return date
  if (frequency === 'monthly') return toMonthEnd(date)
  if (frequency === 'quarterly') return toQuarterEnd(date)
  if (frequency === 'yearly') return toYearEnd(date)
  return date.slice(0, 10)
}

function normalizeSeries(points: LocalMacroPoint[], frequency: MacroFrequency): LocalMacroPoint[] {
  const normalized = new Map<string, number>()

  for (const point of points) {
    const canonicalDate = normalizeDateForFrequency(point.date, frequency)
    normalized.set(canonicalDate, point.value)
  }

  return Array.from(normalized.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((left, right) => left.date.localeCompare(right.date))
}

function parseDateParts(date: string) {
  const [yearText, monthText, dayText] = date.slice(0, 10).split('-')
  return {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
  }
}

function addPeriods(date: string, frequency: MacroFrequency, count: number): string {
  if (frequency === 'monthly') {
    const { year, month } = parseDateParts(date)
    const next = new Date(Date.UTC(year, month - 1 + count, 1))
    return toMonthEnd(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`)
  }

  if (frequency === 'quarterly') {
    const { year, month } = parseDateParts(date)
    const quarterIndex = Math.floor((month - 1) / 3)
    const next = new Date(Date.UTC(year, quarterIndex * 3 + count * 3, 1))
    return toQuarterEnd(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`)
  }

  if (frequency === 'yearly') {
    const { year } = parseDateParts(date)
    return `${year + count}-12-31`
  }

  return date
}

function fillShortGaps(points: LocalMacroPoint[], frequency: MacroFrequency): LocalMacroPoint[] {
  if (!['monthly', 'quarterly', 'yearly'].includes(frequency) || points.length < 2) {
    return points
  }

  const filled: LocalMacroPoint[] = [points[0]]
  for (let index = 1; index < points.length; index += 1) {
    const previous = filled[filled.length - 1]
    const current = points[index]
    const expectedNext = addPeriods(previous.date, frequency, 1)

    if (current.date !== expectedNext) {
      const maybeSecond = addPeriods(previous.date, frequency, 2)
      if (current.date === maybeSecond) {
        filled.push({
          date: expectedNext,
          value: previous.value + (current.value - previous.value) / 2,
        })
      }
    }

    filled.push(current)
  }

  return filled
}

function smoothIsolatedSpikes(points: LocalMacroPoint[]): LocalMacroPoint[] {
  if (points.length < 3) return points

  const cleaned = points.map((point) => ({ ...point }))
  for (let index = 1; index < cleaned.length - 1; index += 1) {
    const previous = cleaned[index - 1]
    const current = cleaned[index]
    const next = cleaned[index + 1]

    const baseline = Math.max(Math.abs(previous.value), Math.abs(next.value), 1)
    const jumpPrev = Math.abs(current.value - previous.value) / baseline
    const jumpNext = Math.abs(current.value - next.value) / baseline
    const neighborDiff = Math.abs(next.value - previous.value) / baseline

    if (jumpPrev > 0.6 && jumpNext > 0.6 && neighborDiff < 0.25) {
      current.value = previous.value + (next.value - previous.value) / 2
    }
  }

  return cleaned
}

function daysBetween(laterDate: string, earlierDate: string): number {
  const later = new Date(laterDate).getTime()
  const earlier = new Date(earlierDate).getTime()
  return Math.round((later - earlier) / 86400000)
}

function expectedFreshnessDays(frequency: MacroFrequency): number {
  switch (frequency) {
    case 'daily':
      return 14
    case 'weekly':
      return 21
    case 'monthly':
      return 70
    case 'quarterly':
      return 140
    case 'yearly':
      return 400
    default:
      return 90
  }
}

function detectLatestSuspect(entry: MacroCatalogEntry, points: LocalMacroPoint[]): boolean {
  if (points.length < 2) return false

  const latest = points[points.length - 1]
  const previous = points[points.length - 2]
  if (EVENT_WHITELIST[entry.code]?.has(latest.date)) {
    return false
  }

  const baseline = Math.max(Math.abs(previous.value), 1)
  const pctChange = Math.abs((latest.value - previous.value) / baseline)
  return pctChange >= 0.8
}

function assessSeriesQuality(entry: MacroCatalogEntry, points: LocalMacroPoint[]): LocalMacroQuality {
  let score = 100
  const notes: string[] = []
  const latest = points[points.length - 1]

  if (!latest) {
    return {
      score: 0,
      status: 'poor',
      isStale: true,
      suspectLatest: false,
      notes: ['无可用数据'],
    }
  }

  const stale = daysBetween(new Date().toISOString().slice(0, 10), latest.date) > expectedFreshnessDays(entry.frequency)
  if (stale) {
    score -= 25
    notes.push('最新数据偏旧')
  }

  const suspectLatest = detectLatestSuspect(entry, points)
  if (suspectLatest) {
    score -= 20
    notes.push('最新值波动异常，建议复核源数据')
  }

  if (points.length < 12 && entry.frequency !== 'yearly') {
    score -= 15
    notes.push('可用历史样本偏少')
  }

  if (points.length < 4 && entry.frequency === 'quarterly') {
    score -= 15
    notes.push('季度样本偏少')
  }

  const status: LocalMacroQuality['status'] = score >= 80 ? 'good' : score >= 60 ? 'fair' : 'poor'

  return {
    score: Math.max(0, score),
    status,
    isStale: stale,
    suspectLatest,
    notes,
  }
}

async function readFileCached(filePath: string): Promise<string> {
  if (!fileCache.has(filePath)) {
    fileCache.set(filePath, fs.readFile(filePath, 'utf8'))
  }
  return fileCache.get(filePath)!
}

async function loadPublishedSeriesMap(): Promise<Map<string, LocalMacroPoint[]>> {
  const cacheKey = PUBLISHED_SERIES_FILE
  if (!publishedSeriesCache.has(cacheKey)) {
    publishedSeriesCache.set(
      cacheKey,
      (async () => {
        const raw = await readFileCached(PUBLISHED_SERIES_FILE)
        const lines = raw.split(/\r?\n/).filter(Boolean)
        if (lines.length <= 1) return new Map<string, LocalMacroPoint[]>()

        const headers = splitCsvLine(lines[0])
        const dateIndex = headers.indexOf('date')
        const codeIndex = headers.indexOf('indicatorCode')
        const valueIndex = headers.indexOf('value')
        if (dateIndex === -1 || codeIndex === -1 || valueIndex === -1) {
          return new Map<string, LocalMacroPoint[]>()
        }

        const grouped = new Map<string, LocalMacroPoint[]>()
        for (const line of lines.slice(1)) {
          const cells = splitCsvLine(line)
          const date = cells[dateIndex]
          const code = cells[codeIndex]
          const rawValue = cells[valueIndex]
          if (!date || !code || !rawValue || !rawValue.trim()) continue

          const numeric = Number(rawValue)
          if (!Number.isFinite(numeric)) continue

          const bucket = grouped.get(code) ?? []
          bucket.push({ date, value: numeric })
          grouped.set(code, bucket)
        }

        for (const [code, points] of grouped.entries()) {
          points.sort((left, right) => left.date.localeCompare(right.date))
          grouped.set(code, points)
        }

        return grouped
      })()
    )
  }

  return publishedSeriesCache.get(cacheKey)!
}

async function loadSeries(entry: MacroCatalogEntry): Promise<LocalMacroPoint[]> {
  const grouped = await loadPublishedSeriesMap()
  const points = grouped.get(entry.code) ?? []
  const normalized = normalizeSeries(points, entry.frequency)
  const gapFilled = fillShortGaps(normalized, entry.frequency)
  return smoothIsolatedSpikes(gapFilled)
}

export async function inspectLocalMacroDataset() {
  const files = await fs.readdir(DATA_DIR)
  return { files }
}

export function getLocalMacroIndicators(category?: string): LocalMacroIndicator[] {
  const normalized = category ? CATEGORY_ALIASES[category] ?? null : null

  return MACRO_CATALOG
    .filter((entry) => !normalized || entry.category === normalized)
    .map((entry) => ({
      id: entry.id,
      createdAt: '1970-01-01T00:00:00.000Z',
      updatedAt: '1970-01-01T00:00:00.000Z',
      code: entry.code,
      name: entry.name,
      category: entry.category,
      unit: entry.unit,
      frequency: entry.frequency,
      source: entry.source,
      description: entry.description,
    }))
}

export async function getLocalMacroData(
  codes: string[],
  options: { startDate?: string | null; endDate?: string | null; limit?: number } = {}
) {
  const uniqueCodes = Array.from(new Set(codes.filter(Boolean)))
  const { startDate, endDate, limit = 60 } = options

  return Promise.all(
    uniqueCodes.map(async (code) => {
      const entry = MACRO_CATALOG.find((item) => item.code === code)
      if (!entry) {
        return { indicatorCode: code, data: [] as LocalMacroPoint[] }
      }

      let points = await loadSeries(entry)
      if (startDate) points = points.filter((point) => point.date >= startDate)
      if (endDate) points = points.filter((point) => point.date <= endDate)
      if (limit > 0 && points.length > limit) {
        points = points.slice(-limit)
      }

      return { indicatorCode: code, data: points }
    })
  )
}

export async function getLocalMacroLatest(codes?: string[]): Promise<LocalMacroLatest[]> {
  const selectedCodes = codes?.length ? codes : MACRO_CATALOG.map((item) => item.code)
  const grouped = await getLocalMacroData(selectedCodes, { limit: 24 })

  return grouped.map((group) => {
    const entry = MACRO_CATALOG.find((item) => item.code === group.indicatorCode)
    const latest = group.data[group.data.length - 1]
    const previous = group.data[group.data.length - 2]

    return {
      indicatorCode: group.indicatorCode,
      latestValue: latest?.value ?? null,
      latestDate: latest?.date ?? null,
      previousValue: previous?.value ?? null,
      change: latest && previous ? latest.value - previous.value : null,
      quality: entry
        ? assessSeriesQuality(entry, group.data)
        : {
            score: 0,
            status: 'poor',
            isStale: true,
            suspectLatest: false,
            notes: ['指标未在目录中注册'],
          },
    }
  })
}
