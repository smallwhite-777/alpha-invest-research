/** Generic API response wrapper */
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

/** Paginated API response */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** Date range filter */
export interface DateRange {
  start: string
  end: string
}

/** Sort configuration */
export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

/** Base entity with common fields */
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

/** Filter option for dropdowns */
export interface FilterOption {
  value: string
  label: string
  count?: number
}

/** Market index ticker data */
export interface MarketTicker {
  name: string
  code: string
  price: number
  change: number
  changePercent: number
}
