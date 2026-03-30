import type { BaseEntity } from './common'
import type { MacroCategory } from '@/lib/constants'

/** Macro economic indicator */
export interface MacroIndicator extends BaseEntity {
  name: string
  code: string
  category: MacroCategory
  unit: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  description?: string
  source: string
}

/** Macro data point */
export interface MacroDataPoint {
  date: string
  value: number
  previousValue?: number
  expected?: number
  revised?: number
}

/** Macro indicator with latest data */
export interface MacroIndicatorWithData extends MacroIndicator {
  latestValue: number
  latestDate: string
  change: number
  changePercent: number
  trend: 'up' | 'down' | 'flat'
  history: MacroDataPoint[]
}

/** Macro dashboard summary */
export interface MacroDashboard {
  economic: MacroIndicatorWithData[]
  monetary: MacroIndicatorWithData[]
  commodity: MacroIndicatorWithData[]
  sentiment: MacroIndicatorWithData[]
}

/** Macro event (e.g., central bank meeting) */
export interface MacroEvent {
  id: string
  title: string
  date: string
  category: MacroCategory
  importance: 1 | 2 | 3
  description?: string
  actual?: string
  forecast?: string
  previous?: string
}

/** Macro filter */
export interface MacroFilter {
  category?: MacroCategory
  frequency?: MacroIndicator['frequency']
  dateRange?: {
    start: string
    end: string
  }
}
