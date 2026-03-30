import type { BaseEntity } from './common'
import type { IntelligenceCategory, ImportanceLevel, SectorCode } from '@/lib/constants'

/** Intelligence entry */
export interface Intelligence extends BaseEntity {
  title: string
  content: string
  summary: string
  category: IntelligenceCategory
  importance: ImportanceLevel
  sectors: SectorCode[]
  source: string
  sourceUrl?: string
  publishedAt: string
  isVerified: boolean
  tags: string[]
}

/** Intelligence list filter */
export interface IntelligenceFilter {
  category?: IntelligenceCategory
  importance?: ImportanceLevel
  sectors?: SectorCode[]
  search?: string
  dateRange?: {
    start: string
    end: string
  }
  isVerified?: boolean
}

/** Intelligence statistics */
export interface IntelligenceStats {
  totalCount: number
  todayCount: number
  byCategory: Record<IntelligenceCategory, number>
  byImportance: Record<number, number>
  bySector: Record<SectorCode, number>
}

/** Intelligence creation input */
export interface CreateIntelligenceInput {
  title: string
  content: string
  category: IntelligenceCategory
  importance: ImportanceLevel
  sectors: SectorCode[]
  source: string
  sourceUrl?: string
  tags: string[]
}
