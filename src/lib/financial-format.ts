export function parseAmountToYi(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return 0
  }

  const cleaned = value.replace(/,/g, '').trim()
  const match = cleaned.match(/(-?\d+(?:\.\d+)?)/)
  if (!match) {
    return 0
  }

  const numeric = Number(match[1])
  if (!Number.isFinite(numeric)) {
    return 0
  }

  if (cleaned.includes('万亿')) return numeric * 10000
  if (cleaned.includes('亿')) return numeric
  if (cleaned.includes('万')) return numeric / 10000
  if (cleaned.includes('元')) return numeric / 1e8

  return numeric
}

export function formatAmountYi(
  valueYi: number,
  options: {
    emptyText?: string
    showUnit?: boolean
    decimalsForYi?: number
    decimalsForWanYi?: number
  } = {}
): string {
  const {
    emptyText = '-',
    showUnit = true,
    decimalsForYi = 0,
    decimalsForWanYi = 2,
  } = options

  if (!Number.isFinite(valueYi) || valueYi === 0) {
    return emptyText
  }

  const sign = valueYi < 0 ? '-' : ''
  const abs = Math.abs(valueYi)

  if (abs >= 10000) {
    const text = (abs / 10000).toFixed(decimalsForWanYi)
    return `${sign}${text}${showUnit ? '万亿' : ''}`
  }

  if (abs >= 100) {
    const text = abs.toFixed(decimalsForYi)
    return `${sign}${text}${showUnit ? '亿' : ''}`
  }

  const text = abs.toFixed(2)
  return `${sign}${text}${showUnit ? '亿' : ''}`
}

export function formatPriceCny(value: number, emptyText: string = '-'): string {
  if (!Number.isFinite(value) || value === 0) {
    return emptyText
  }
  return `¥${value.toFixed(2)}`
}

export function formatPercentValue(value: number, decimals: number = 1, emptyText: string = '-'): string {
  if (!Number.isFinite(value)) {
    return emptyText
  }
  return `${value.toFixed(decimals)}%`
}
