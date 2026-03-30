import { format as dateFnsFormat, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

/**
 * Format a number with Chinese units (亿/万)
 */
export function formatNumber(n: number): string {
  if (n === 0) return '0'

  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''

  if (abs >= 1e8) {
    const val = abs / 1e8
    return `${sign}${val >= 100 ? val.toFixed(0) : val >= 10 ? val.toFixed(1) : val.toFixed(2)}亿`
  }

  if (abs >= 1e4) {
    const val = abs / 1e4
    return `${sign}${val >= 100 ? val.toFixed(0) : val >= 10 ? val.toFixed(1) : val.toFixed(2)}万`
  }

  if (abs >= 1000) {
    return `${sign}${abs.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
  }

  return `${sign}${abs.toFixed(2)}`
}

/**
 * Format a number as a percentage string
 */
export function formatPercent(n: number, decimals: number = 2): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`
}

/**
 * Format a number with +/- sign and return value + CSS color class
 */
export function formatChange(n: number): { text: string; className: string } {
  const text = `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
  const className = n > 0 ? 'text-up' : n < 0 ? 'text-down' : 'text-muted-foreground'
  return { text, className }
}

/**
 * Format a number as currency
 */
export function formatCurrency(n: number, currency: string = 'CNY'): string {
  const symbols: Record<string, string> = {
    CNY: '¥',
    USD: '$',
    HKD: 'HK$',
    EUR: '€',
    GBP: '£',
  }

  const symbol = symbols[currency] || currency
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''

  if (abs >= 1e8) {
    return `${sign}${symbol}${(abs / 1e8).toFixed(2)}亿`
  }

  if (abs >= 1e4) {
    return `${sign}${symbol}${(abs / 1e4).toFixed(2)}万`
  }

  return `${sign}${symbol}${abs.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format a date string or Date object
 */
export function formatDate(date: string | Date, formatStr: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return dateFnsFormat(d, formatStr, { locale: zhCN })
}
