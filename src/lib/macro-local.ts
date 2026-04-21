import 'server-only'

import { promises as fs } from 'fs'
import path from 'path'
import type { MacroCategory } from '@/lib/constants'

export interface LocalMacroIndicator {
  id: string
  code: string
  name: string
  category: MacroCategory
  unit: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  source: string
  description?: string
}

export interface LocalMacroPoint {
  date: string
  value: number
}

type IndicatorSource =
  | { type: 'long'; file: string; key: string }
  | { type: 'wide'; file: string; column: string }

type CatalogEntry = LocalMacroIndicator & { sourceConfig: IndicatorSource }

const DATA_DIR = path.join(process.cwd(), 'macro-data', 'data')

const CATALOG: CatalogEntry[] = [
  {
    id: 'cn_cpi_yoy',
    code: 'CN_CPI_NT_YOY',
    name: '中国 CPI 同比',
    category: 'ECONOMIC',
    unit: '%',
    frequency: 'monthly',
    source: 'us_china_joint_chronos.csv',
    sourceConfig: { type: 'long', file: 'us_china_joint_chronos.csv', key: 'CN_CPI_NT_YOY' },
  },
  {
    id: 'cn_ppi_yoy',
    code: 'CN_PPI_YOY',
    name: '中国 PPI 同比',
    category: 'ECONOMIC',
    unit: '%',
    frequency: 'monthly',
    source: 'us_china_joint_chronos.csv',
    sourceConfig: { type: 'long', file: 'us_china_joint_chronos.csv', key: 'CN_PPI_YOY' },
  },
  {
    id: 'cn_m2_yoy',
    code: 'CN_M2_YOY',
    name: '中国 M2 同比',
    category: 'MONETARY',
    unit: '%',
    frequency: 'monthly',
    source: 'us_china_joint_chronos.csv',
    sourceConfig: { type: 'long', file: 'us_china_joint_chronos.csv', key: 'CN_M2_YOY' },
  },
  {
    id: 'cn_m1_yoy',
    code: 'CN_M1_YOY',
    name: '中国 M1 同比',
    category: 'MONETARY',
    unit: '%',
    frequency: 'monthly',
    source: 'us_china_joint_chronos.csv',
    sourceConfig: { type: 'long', file: 'us_china_joint_chronos.csv', key: 'CN_M1_YOY' },
  },
  {
    id: 'cn_pmi',
    code: 'PMI_CHN',
    name: '中国制造业 PMI',
    category: 'ECONOMIC',
    unit: '点',
    frequency: 'monthly',
    source: 'china_macro_monthly_clean.csv',
    sourceConfig: { type: 'long', file: path.join('china_macro', 'china_macro_monthly_clean.csv'), key: 'PMI_CHN' },
  },
  {
    id: 'cn_gdp_yoy',
    code: 'GDP_CHN_YOY',
    name: '中国 GDP 同比',
    category: 'ECONOMIC',
    unit: '%',
    frequency: 'quarterly',
    source: 'china_macro_monthly_clean.csv',
    sourceConfig: { type: 'long', file: path.join('china_macro', 'china_macro_monthly_clean.csv'), key: 'GDP_CHN_YOY' },
  },
  {
    id: 'cn_ip_yoy',
    code: 'IP_CHN_YOY',
    name: '中国工业增加值同比',
    category: 'ECONOMIC',
    unit: '%',
    frequency: 'monthly',
    source: 'china_macro_monthly_clean.csv',
    sourceConfig: { type: 'long', file: path.join('china_macro', 'china_macro_monthly_clean.csv'), key: 'IP_CHN_YOY' },
  },
  {
    id: 'cn_retail_yoy',
    code: 'RS_CHN_YOY',
    name: '中国社零同比',
    category: 'ECONOMIC',
    unit: '%',
    frequency: 'monthly',
    source: 'china_macro_monthly_clean.csv',
    sourceConfig: { type: 'long', file: path.join('china_macro', 'china_macro_monthly_clean.csv'), key: 'RS_CHN_YOY' },
  },
  {
    id: 'cn_repo7d',
    code: 'REPO7D_CHN',
    name: '中国 7 天回购利率',
    category: 'MONETARY',
    unit: '%',
    frequency: 'daily',
    source: 'china_macro_monthly_clean.csv',
    sourceConfig: { type: 'long', file: path.join('china_macro', 'china_macro_monthly_clean.csv'), key: 'REPO7D_CHN' },
  },
  {
    id: 'cn_10y',
    code: 'TREASURY10Y_CHN',
    name: '中国 10 年国债收益率',
    category: 'MONETARY',
    unit: '%',
    frequency: 'daily',
    source: 'china_macro_monthly_clean.csv',
    sourceConfig: { type: 'long', file: path.join('china_macro', 'china_macro_monthly_clean.csv'), key: 'TREASURY10Y_CHN' },
  },
  {
    id: 'us_fed_funds',
    code: 'US_DFF_M',
    name: '美国联邦基金利率',
    category: 'MONETARY',
    unit: '%',
    frequency: 'monthly',
    source: 'us_macro_fred_monthly.csv',
    sourceConfig: { type: 'wide', file: path.join('us_macro', 'us_macro_fred_monthly.csv'), column: 'DFF_M' },
  },
  {
    id: 'us_10y',
    code: 'US_DGS10_M',
    name: '美国 10 年国债收益率',
    category: 'MONETARY',
    unit: '%',
    frequency: 'monthly',
    source: 'us_macro_fred_monthly.csv',
    sourceConfig: { type: 'wide', file: path.join('us_macro', 'us_macro_fred_monthly.csv'), column: 'DGS10_M' },
  },
  {
    id: 'us_2y',
    code: 'US_DGS2_M',
    name: '美国 2 年国债收益率',
    category: 'MONETARY',
    unit: '%',
    frequency: 'monthly',
    source: 'us_macro_fred_monthly.csv',
    sourceConfig: { type: 'wide', file: path.join('us_macro', 'us_macro_fred_monthly.csv'), column: 'DGS2_M' },
  },
  {
    id: 'us_m2',
    code: 'US_M2SL_M',
    name: '美国 M2',
    category: 'MONETARY',
    unit: '十亿美元',
    frequency: 'monthly',
    source: 'us_macro_fred_monthly.csv',
    sourceConfig: { type: 'wide', file: path.join('us_macro', 'us_macro_fred_monthly.csv'), column: 'M2SL_M' },
  },
  {
    id: 'us_pce',
    code: 'US_PCECTPI_M',
    name: '美国 PCE 物价指数',
    category: 'ECONOMIC',
    unit: '指数',
    frequency: 'monthly',
    source: 'us_macro_fred_monthly.csv',
    sourceConfig: { type: 'wide', file: path.join('us_macro', 'us_macro_fred_monthly.csv'), column: 'PCECTPI_M' },
  },
  {
    id: 'us_dxy_broad',
    code: 'US_DTWEXBGS_M',
    name: '美元广义指数',
    category: 'SENTIMENT',
    unit: '指数',
    frequency: 'monthly',
    source: 'us_macro_fred_monthly.csv',
    sourceConfig: { type: 'wide', file: path.join('us_macro', 'us_macro_fred_monthly.csv'), column: 'DTWEXBGS_M' },
  },
  {
    id: 'oil_brent',
    code: 'US_DCOILBRENTEU_M',
    name: '布伦特原油',
    category: 'COMMODITY',
    unit: '美元/桶',
    frequency: 'monthly',
    source: 'us_macro_fred_monthly.csv',
    sourceConfig: { type: 'wide', file: path.join('us_macro', 'us_macro_fred_monthly.csv'), column: 'DCOILBRENTEU_M' },
  },
  {
    id: 'us_balance_sheet',
    code: 'US_WALCL_M',
    name: '美联储总资产',
    category: 'MONETARY',
    unit: '百万美元',
    frequency: 'monthly',
    source: 'us_macro_fred_monthly.csv',
    sourceConfig: { type: 'wide', file: path.join('us_macro', 'us_macro_fred_monthly.csv'), column: 'WALCL_M' },
  },
]

const CATEGORY_ALIASES: Record<string, MacroCategory> = {
  ECONOMIC: 'ECONOMIC',
  MONETARY: 'MONETARY',
  COMMODITY: 'COMMODITY',
  SENTIMENT: 'SENTIMENT',
  PRICE: 'ECONOMIC',
}

const fileCache = new Map<string, Promise<string>>()
const seriesCache = new Map<string, Promise<LocalMacroPoint[]>>()

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

function normalizeDateForFrequency(date: string, frequency: LocalMacroIndicator['frequency']): string {
  if (!date) return date
  if (frequency === 'monthly') return toMonthEnd(date)
  if (frequency === 'quarterly') return toQuarterEnd(date)
  if (frequency === 'yearly') return toYearEnd(date)
  return date.slice(0, 10)
}

function normalizeSeries(points: LocalMacroPoint[], frequency: LocalMacroIndicator['frequency']): LocalMacroPoint[] {
  const normalized = new Map<string, number>()

  for (const point of points) {
    const canonicalDate = normalizeDateForFrequency(point.date, frequency)
    normalized.set(canonicalDate, point.value)
  }

  return Array.from(normalized.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((left, right) => left.date.localeCompare(right.date))
}

async function readFileCached(relativePath: string): Promise<string> {
  const fullPath = path.join(DATA_DIR, relativePath)
  if (!fileCache.has(fullPath)) {
    fileCache.set(fullPath, fs.readFile(fullPath, 'utf8'))
  }
  return fileCache.get(fullPath)!
}

async function loadLongSeries(relativePath: string, key: string): Promise<LocalMacroPoint[]> {
  const cacheKey = `long:${relativePath}:${key}`
  if (!seriesCache.has(cacheKey)) {
    seriesCache.set(
      cacheKey,
      (async () => {
        const raw = await readFileCached(relativePath)
        const lines = raw.split(/\r?\n/).filter(Boolean)
        if (lines.length <= 1) return []

        const points: LocalMacroPoint[] = []
        for (const line of lines.slice(1)) {
          const [date, uniqueId, value] = splitCsvLine(line)
          if (uniqueId !== key || !date) continue
          const numeric = Number(value)
          if (!Number.isFinite(numeric)) continue
          points.push({ date, value: numeric })
        }

        return points.sort((left, right) => left.date.localeCompare(right.date))
      })()
    )
  }

  return seriesCache.get(cacheKey)!
}

async function loadWideSeries(relativePath: string, column: string): Promise<LocalMacroPoint[]> {
  const cacheKey = `wide:${relativePath}:${column}`
  if (!seriesCache.has(cacheKey)) {
    seriesCache.set(
      cacheKey,
      (async () => {
        const raw = await readFileCached(relativePath)
        const lines = raw.split(/\r?\n/).filter(Boolean)
        if (lines.length <= 1) return []

        const headers = splitCsvLine(lines[0])
        const dateIndex = headers.indexOf('date')
        const valueIndex = headers.indexOf(column)
        if (dateIndex === -1 || valueIndex === -1) return []

        const points: LocalMacroPoint[] = []
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
      })()
    )
  }

  return seriesCache.get(cacheKey)!
}

async function loadSeries(entry: CatalogEntry): Promise<LocalMacroPoint[]> {
  const rawPoints =
    entry.sourceConfig.type === 'long'
      ? await loadLongSeries(entry.sourceConfig.file, entry.sourceConfig.key)
      : await loadWideSeries(entry.sourceConfig.file, entry.sourceConfig.column)

  return normalizeSeries(rawPoints, entry.frequency)
}

export async function inspectLocalMacroDataset() {
  const files = await fs.readdir(DATA_DIR)
  const chinaDir = await fs.readdir(path.join(DATA_DIR, 'china_macro'))
  const usDir = await fs.readdir(path.join(DATA_DIR, 'us_macro'))

  return {
    rootFiles: files,
    chinaFiles: chinaDir,
    usFiles: usDir,
  }
}

export function getLocalMacroIndicators(category?: string): LocalMacroIndicator[] {
  const normalized = category ? CATEGORY_ALIASES[category] ?? null : null

  return CATALOG
    .filter((entry) => !normalized || entry.category === normalized)
    .map((entry) => ({
      id: entry.id,
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
      const entry = CATALOG.find((item) => item.code === code)
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

export async function getLocalMacroLatest(codes?: string[]) {
  const selectedCodes = codes?.length ? codes : CATALOG.map((item) => item.code)
  const grouped = await getLocalMacroData(selectedCodes, { limit: 2 })

  return grouped.map((group) => {
    const latest = group.data[group.data.length - 1]
    const previous = group.data[group.data.length - 2]

    return {
      indicatorCode: group.indicatorCode,
      latestValue: latest?.value ?? null,
      latestDate: latest?.date ?? null,
      previousValue: previous?.value ?? null,
      change: latest && previous ? latest.value - previous.value : null,
    }
  })
}
