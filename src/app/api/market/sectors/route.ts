import { NextResponse } from 'next/server'

export const revalidate = 60

interface SectorRow {
  name: string
  ticker?: string
  change: number
}

interface EastmoneySectorRow {
  f12?: string
  f14?: string
  f3?: number
}

interface EastmoneyResponse {
  data?: {
    diff?: EastmoneySectorRow[]
  }
}

const URL =
  'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=40&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:2&fields=f12,f14,f3'

export async function GET() {
  try {
    const res = await fetch(URL, {
      headers: {
        Referer: 'https://quote.eastmoney.com',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return NextResponse.json({ success: false, sectors: [], reason: `upstream ${res.status}` })
    }

    const json = (await res.json()) as EastmoneyResponse
    const diff = json?.data?.diff ?? []

    const sectors: SectorRow[] = diff
      .filter(
        (row): row is Required<Pick<EastmoneySectorRow, 'f12' | 'f14' | 'f3'>> =>
          typeof row.f12 === 'string' && typeof row.f14 === 'string' && typeof row.f3 === 'number'
      )
      .map((row) => ({
        ticker: row.f12,
        name: row.f14,
        change: Number(row.f3),
      }))

    return NextResponse.json(
      { success: true, sectors },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=180' } }
    )
  } catch (err) {
    return NextResponse.json({
      success: false,
      sectors: [],
      reason: err instanceof Error ? err.message : 'unknown',
    })
  }
}
