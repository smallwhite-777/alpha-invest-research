import { promises as fs } from 'fs'
import path from 'path'
import { MACRO_CATALOG, type MacroCatalogEntry, type MacroFrequency, type MacroSourceCandidate } from '../src/lib/macro-catalog'

type Point = { date: string; value: number }

const repoRoot = process.cwd()
const upstreamDir = path.resolve(repoRoot, '..', 'Knowledgebase', 'timesfm_deploy', 'data')
const publishDir = path.resolve(repoRoot, 'macro-data', 'data')

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

async function readCsv(relativePath: string): Promise<string[]> {
  const fullPath = path.join(upstreamDir, relativePath)
  const raw = await fs.readFile(fullPath, 'utf8')
  return raw.split(/\r?\n/).filter(Boolean)
}

async function loadLongSeries(relativePath: string, key: string): Promise<Point[]> {
  const lines = await readCsv(relativePath)
  if (lines.length <= 1) return []

  const points: Point[] = []
  for (const line of lines.slice(1)) {
    const [date, uniqueId, value] = splitCsvLine(line)
    if (uniqueId !== key || !date) continue
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) continue
    points.push({ date, value: numeric })
  }

  return points.sort((left, right) => left.date.localeCompare(right.date))
}

async function loadWideSeries(relativePath: string, column: string): Promise<Point[]> {
  const lines = await readCsv(relativePath)
  if (lines.length <= 1) return []

  const headers = splitCsvLine(lines[0])
  const dateIndex = headers.indexOf('date')
  const valueIndex = headers.indexOf(column)
  if (dateIndex === -1 || valueIndex === -1) return []

  const points: Point[] = []
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line)
    const date = cells[dateIndex]
    const rawValue = cells[valueIndex]
    if (!date || !rawValue || !rawValue.trim()) continue

    const numeric = Number(rawValue)
    if (!Number.isFinite(numeric)) continue
    points.push({ date, value: numeric })
  }

  return points.sort((left, right) => left.date.localeCompare(right.date))
}

function getFreshness(points: Point[]): number {
  if (!points.length) return -1
  return new Date(points[points.length - 1].date).getTime()
}

function normalizeSeries(points: Point[], frequency: MacroFrequency): Point[] {
  const deduped = new Map<string, number>()
  for (const point of points) {
    deduped.set(normalizeDateForFrequency(point.date, frequency), point.value)
  }

  return Array.from(deduped.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((left, right) => left.date.localeCompare(right.date))
}

async function loadCandidate(source: MacroSourceCandidate, frequency: MacroFrequency): Promise<Point[]> {
  const points =
    source.type === 'long'
      ? await loadLongSeries(source.file, source.key)
      : await loadWideSeries(source.file, source.column)

  return normalizeSeries(points, frequency)
}

async function selectSeries(entry: MacroCatalogEntry): Promise<Point[]> {
  const candidates = await Promise.all(
    entry.sourceCandidates.map(async (source) => ({
      source,
      points: await loadCandidate(source, entry.frequency),
    }))
  )

  candidates.sort((left, right) => {
    const freshnessGap = getFreshness(right.points) - getFreshness(left.points)
    if (freshnessGap !== 0) return freshnessGap
    return right.points.length - left.points.length
  })

  return candidates[0]?.points ?? []
}

async function writePublishedFiles() {
  const allRows: Array<{ date: string; indicatorCode: string; value: number; frequency: MacroFrequency; source: string }> = []
  const latestDates: Record<string, string | null> = {}

  for (const entry of MACRO_CATALOG) {
    const points = await selectSeries(entry)
    latestDates[entry.code] = points.at(-1)?.date ?? null

    for (const point of points) {
      allRows.push({
        date: point.date,
        indicatorCode: entry.code,
        value: point.value,
        frequency: entry.frequency,
        source: entry.source,
      })
    }
  }

  allRows.sort((left, right) => {
    if (left.indicatorCode !== right.indicatorCode) {
      return left.indicatorCode.localeCompare(right.indicatorCode)
    }
    return left.date.localeCompare(right.date)
  })

  await fs.rm(publishDir, { recursive: true, force: true })
  await fs.mkdir(publishDir, { recursive: true })

  const seriesLines = ['date,indicatorCode,value,frequency,source']
  for (const row of allRows) {
    seriesLines.push(`${row.date},${row.indicatorCode},${row.value},${row.frequency},"${row.source}"`)
  }

  const catalog = MACRO_CATALOG.map((entry) => ({
    id: entry.id,
    code: entry.code,
    name: entry.name,
    category: entry.category,
    unit: entry.unit,
    frequency: entry.frequency,
    source: entry.source,
    description: entry.description ?? null,
  }))

  const manifest = {
    generatedAt: new Date().toISOString(),
    upstreamDir,
    totalIndicators: MACRO_CATALOG.length,
    totalRows: allRows.length,
    latestDates,
  }

  await Promise.all([
    fs.writeFile(path.join(publishDir, 'series.csv'), `${seriesLines.join('\n')}\n`, 'utf8'),
    fs.writeFile(path.join(publishDir, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`, 'utf8'),
    fs.writeFile(path.join(publishDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
  ])

  console.log(`Published ${allRows.length} rows for ${MACRO_CATALOG.length} indicators to ${publishDir}`)
}

writePublishedFiles().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
