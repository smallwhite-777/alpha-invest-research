import type { BaseEntity } from './common'
import type { SectorCode } from '@/lib/constants'

/** Stock basic info */
export interface Stock extends BaseEntity {
  code: string
  name: string
  sector: SectorCode
  exchange: 'SH' | 'SZ' | 'HK' | 'US'
  marketCap: number
  peRatio: number | null
  pbRatio: number | null
}

/** Stock real-time quote */
export interface StockQuote {
  code: string
  name: string
  price: number
  open: number
  high: number
  low: number
  close: number
  prevClose: number
  volume: number
  amount: number
  change: number
  changePercent: number
  timestamp: string
}

/** Stock OHLCV candlestick data point */
export interface StockKline {
  date: string
  open: number
  close: number
  high: number
  low: number
  volume: number
  amount: number
}

/** Stock financial metrics */
export interface StockFinancials {
  code: string
  period: string
  revenue: number
  netProfit: number
  grossMargin: number
  netMargin: number
  roe: number
  debtRatio: number
  eps: number
}

/** Stock list filter */
export interface StockFilter {
  sector?: SectorCode
  exchange?: Stock['exchange']
  search?: string
  sortBy?: 'changePercent' | 'marketCap' | 'volume' | 'amount'
  sortDirection?: 'asc' | 'desc'
}

/** Stock watchlist item */
export interface WatchlistItem {
  stockCode: string
  stockName: string
  addedAt: string
  notes?: string
  targetPrice?: number
  stopLoss?: number
}

/** Stock sector overview */
export interface SectorOverview {
  code: SectorCode
  name: string
  stockCount: number
  avgChange: number
  totalMarketCap: number
  topGainers: StockQuote[]
  topLosers: StockQuote[]
}
