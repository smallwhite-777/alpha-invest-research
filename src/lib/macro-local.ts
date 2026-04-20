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
    name: '中国CPI同比',
    category: 'ECONOMIC',
    unit: '%',
    frequency: 'monthly',
    source: 'us_china_joint_chronos.csv',
    sourceConfig: { type: 'long', file: 'us_china_joint_chronos.csv', key: 'CN_CPI_NT_YOY' },
  },
  {
    id: 'cn_ppi_yoy',
    code: 'CN_PPI_YOY',
    name: '中国PPI同比',
    category: 'ECONOMIC',
    unit: '%',
    frequency: 'monthly',
    source: 'us_china_joint_chronos.csv',
    sourceConfig: { type: 'long', file: 'us_china_joint_chronos.csv', key: 'CN_PPI_YOY' },
  },
  {
    id: 'cn_m2_yoy',
    code: 'CN_M2_YOY',
    name: '中国M2同比',
    category: 'MONETARY',
    unit: '%',
    frequency: 'monthly',
    source: 'us_china_joint_chronos.csv',
    sourceConfig: { type: 'long', file: 'us_china_joint_chronos.csv', key: 'CN_M2_YOY' },
  },
  {
    id: 'cn_m1_yoy',
    code: 'CN_M1_YOY',
    name: '中国M1同比',
    category: 'MONETARY',
    unit: '%',
    frequency: 'monthly',
    source: 'us_china_joint_chronos.csv',
    sourceConfig: { type: 'long', file: 'us_china_joint_chronos.csv', key: 'CN_M1_YOY' },
  },
  {
    id: 'cn_pmi',
    code: 'PMI_CHN',
    name: '中国制造业PMI',
    category: 'ECONOMIC',
    unit: '点',
    frequency: 'monthly',
    source: 'china_macro_monthly_clean.csv',
    sourceConfig: { type: 'long', file: path.join('china_macro', 'china_macro_monthly_clean.csv'), key: 'PMI_CHN' },
  },
  {
    id: 'cn_gdp_yoy',
    code: 'GDP_CHN_YOY',
    name: '中国GDP同比',
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
    name: '中国7天回购利率',
    category: 'MONETARY',
    unit: '%',
    frequency: 'daily',
    source: 'china_macro_monthly_clean.csv',
    sourceConfig: { type: 'long', file: path.join('china_macro', 'china_macro_monthly_clean.csv'), key: 'REPO7D_CHN' },
  },
  {
    id: 'cn_10y',
    code: 'TREASURY10Y_CHN',
    name: '中国10年国债收益率',
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
    name: '美国10年国债收益率',
    category: 'MONETARY',
    unit: '%',
    frequency: 'monthly',
    source: 'us_macro_fred_monthly.csv',
    sourceConfig: { type: 'wide', file: path.join('us_macro', 'us_macro_fred_monthly.csv'), column: 'DGS10_M' },
  },
  {
    id: 'us_2y',
    code: 'US_DGS2_M',
    name: '美国2年国债收益率',
    category: 'MONETARY',
    unit: '%',
    frequency: 'monthly',
    source: 'us_macro_fred_monthly.csv',
    sourceConfig: { type: 'wide', file: path.join('us_macro', 'us_macro_fred_monthly.csv'), column: 'DGS2_M' },
  },
  {
    id: 'us_m2',
    code: 'US_M2SL_M',
    name: '美国M2',
    category: 'MONETARY',
    unit: '十亿美元',
    frequency: 'monthly',
    source: 'us_macro_fred_monthly.csv',
    sourceConfig: { type: 'wide', file: path.join('us_macro', 'us_macro_fred_monthly.csv'), column: 'M2SL_M' },
  },
  {
    id: 'us_pce',
    code: 'US_PCECTPI_M',
    name: '美国PCE物价指数',
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

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
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

        const records = new Map<string, number>()
        for (const line of lines.slice(1)) {
          const [date, uniqueId, value] = splitCsvLine(line)
          if (uniqueId !== key) continue
          if (!value || !value.trim()) continue
          const numeric = Number(value)
          if (!Number.isFinite(numeric)) continue
          records.set(date, numeric)
        }

        return Array.from(records.entries())
          .map(([date, value]) => ({ date, value }))
          .sort((a, b) => a.date.localeCompare(b.date))
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
          if (!rawValue || !rawValue.trim()) continue
          const numeric = Number(rawValue)
          if (!date || !Number.isFinite(numeric)) continue
          points.push({ date, value: numeric })
        }

        return points.sort((a, b) => a.date.localeCompare(b.date))
      })()
    )
  }
  return seriesCache.get(cacheKey)!
}

async function loadSeries(entry: CatalogEntry): Promise<LocalMacroPoint[]> {
  return entry.sourceConfig.type === 'long'
    ? loadLongSeries(entry.sourceConfig.file, entry.sourceConfig.key)
    : loadWideSeries(entry.sourceConfig.file, entry.sourceConfig.column)
}

export function listAvailableLocalMacroData() {
  return {
    files: [
      'china_macro/china_macro_monthly_clean.csv',
      'china_macro/china_macro_monthly.csv',
      'china_macro/china_macro_daily.csv',
      'china_macro/china_macro_real_akshare.csv',
      'china_macro/china_macro_real_chronos.csv',
      'china_macro/china_macro_tushare.csv',
      'china_macro/china_macro_tushare_chronos.csv',
      'china_macro/china_macro_tushare_full.csv',
      'us_macro/us_macro_fred_monthly.csv',
      'us_macro/us_macro_fred_daily.csv',
      'us_macro/us_macro_fred_chronos.csv',
      'us_macro/fred_series_catalog.csv',
      'us_china_joint_chronos.csv',
      'us_balance_sheet.csv',
      'us_balance_sheet_weekly.csv',
      'debt_dashboard_raw.pkl',
      'dashboard_update_state.json',
    ],
    chinaIndicators: ['CPI_CHN', 'GDP_CHN_YOY', 'IP_CHN_YOY', 'M2_CHN_YOY', 'OIL_WTI', 'PMI_CHN', 'PPI_CHN', 'REPO7D_CHN', 'RS_CHN_YOY', 'TREASURY10Y_CHN', 'UR_CHN'],
    jointIndicators: ['CN_CPI_NT_YOY', 'CN_M0_YOY', 'CN_M1_YOY', 'CN_M2_YOY', 'CN_PPI_YOY', 'CN_SF_MONTHLY', 'CN_SF_STOCK', 'CN_SHIBOR_1M', 'CN_SHIBOR_1W', 'CN_SHIBOR_1Y', 'CN_SHIBOR_2W', 'CN_SHIBOR_3M', 'CN_SHIBOR_6M', 'CN_SHIBOR_9M', 'CN_SHIBOR_ON', 'US_DCOILBRENTEU_M', 'US_DFF_M', 'US_DGS10_M', 'US_DGS2_M', 'US_DTWEXBGS_M', 'US_IORB_M', 'US_M2SL_M', 'US_MORTGAGE30US_M', 'US_PCECTPI_M', 'US_WALCL_M', 'US_WORAL_M', 'US_WTREGEN_M'],
    usColumns: ['BOGMBASE_M', 'BUSLOANS_M', 'CONSUMER_M', 'CPALTT01USM657N_M', 'DCOILBRENTEU_M', 'DEXCHUS_M', 'DFF_M', 'DGS10_M', 'DGS2_M', 'DGS5_M', 'DTWEXBGS_M', 'EFFR_M', 'EXCRESNS_M', 'GFDEBTN_M', 'IORB_M', 'M2NS_M', 'M2SL_M', 'MORTGAGE30US_M', 'PCECTPI_M', 'TOTRESNS_M', 'TREAST_M', 'WALCL_M', 'WORAL_M', 'WSHOMCB_M', 'WTREGEN_M'],
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

  const result = await Promise.all(
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

  return result
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
