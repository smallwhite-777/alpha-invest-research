import { NextResponse } from 'next/server'

export const revalidate = 30

interface IndexQuote {
  code: string
  name: string
  value: string
  change: number
  isPercent: boolean
}

const TARGETS: Array<{ sinaCode: string; name: string; isPercent: boolean }> = [
  { sinaCode: 'sh000001', name: '上证', isPercent: true },
  { sinaCode: 'sz399001', name: '深证', isPercent: true },
  { sinaCode: 'sz399006', name: '创业板', isPercent: true },
  { sinaCode: 'sh000300', name: '沪深300', isPercent: true },
  { sinaCode: 'hkHSI', name: '恒生', isPercent: true },
  { sinaCode: 'fx_susdcny', name: '美元/人民币', isPercent: false },
]

function formatNumber(n: number, fractionDigits: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

interface ParseResult {
  value: string
  change: number
}

function parseSinaResponse(line: string, sinaCode: string, isPercent: boolean): ParseResult | null {
  const match = /var hq_str_[A-Za-z0-9_]+="([^"]*)";/.exec(line)
  if (!match) return null
  const fields = match[1].split(',')
  if (fields.length < 4) return null

  if (sinaCode.startsWith('hk')) {
    // Hang Seng: name, en, open, prevClose, high, low, last, change, changePct, ...
    const last = parseFloat(fields[6])
    const prev = parseFloat(fields[3])
    if (!Number.isFinite(last) || !Number.isFinite(prev) || prev === 0) return null
    const pct = ((last - prev) / prev) * 100
    return { value: formatNumber(last, 2), change: Number(pct.toFixed(2)) }
  }

  if (sinaCode.startsWith('fx_s')) {
    // FX (e.g. fx_susdcny): time, last, prevClose? — actual layout: 06:30:00,7.218,buy,sell,bid,ask,...
    // Sina FX line content fields[0]=time/string. Try to find first numeric field.
    const last = parseFloat(fields[1])
    const prev = parseFloat(fields[2] || fields[1])
    if (!Number.isFinite(last)) return null
    const change = Number.isFinite(prev) && prev !== 0 ? last - prev : 0
    return {
      value: formatNumber(last, 4).replace(/0+$/, '').replace(/\.$/, ''),
      change: Number(change.toFixed(4)),
    }
  }

  // A-share index: name, open, prevClose, last, high, low, ..., volume, amount, ...
  const last = parseFloat(fields[3])
  const prev = parseFloat(fields[2])
  if (!Number.isFinite(last) || !Number.isFinite(prev) || prev === 0) return null
  if (isPercent) {
    const pct = ((last - prev) / prev) * 100
    return { value: formatNumber(last, 2), change: Number(pct.toFixed(2)) }
  }
  const diff = last - prev
  return { value: formatNumber(last, 2), change: Number(diff.toFixed(3)) }
}

export async function GET() {
  const list = TARGETS.map((t) => t.sinaCode).join(',')
  const url = `https://hq.sinajs.cn/list=${list}`

  try {
    const res = await fetch(url, {
      headers: {
        Referer: 'https://finance.sina.com.cn',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
      next: { revalidate: 30 },
    })
    if (!res.ok) {
      return NextResponse.json({ success: false, indices: [], reason: `upstream ${res.status}` }, { status: 200 })
    }

    const text = await res.text()
    const lines = text.split('\n').filter((l) => l.includes('hq_str_'))

    const indices: IndexQuote[] = []
    for (let i = 0; i < TARGETS.length; i++) {
      const target = TARGETS[i]
      const line = lines[i] ?? ''
      const parsed = parseSinaResponse(line, target.sinaCode, target.isPercent)
      if (!parsed) continue
      indices.push({
        code: target.sinaCode,
        name: target.name,
        value: parsed.value,
        change: parsed.change,
        isPercent: target.isPercent,
      })
    }

    return NextResponse.json({ success: true, indices }, { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' } })
  } catch (err) {
    return NextResponse.json(
      { success: false, indices: [], reason: err instanceof Error ? err.message : 'unknown' },
      { status: 200 }
    )
  }
}
