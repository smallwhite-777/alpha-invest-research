import { NextRequest, NextResponse } from 'next/server'
import { getLocalMacroData } from '@/lib/macro-local'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const codes = searchParams.get('codes')
  const startDate = searchParams.get('startDate') || searchParams.get('start_date')
  const endDate = searchParams.get('endDate') || searchParams.get('end_date')
  const limit = parseInt(searchParams.get('limit') || '60', 10)

  if (!codes) {
    return NextResponse.json({ error: 'codes parameter required' }, { status: 400 })
  }

  try {
    const grouped = await getLocalMacroData(codes.split(','), {
      startDate,
      endDate,
      limit,
    })
    return NextResponse.json(grouped)
  } catch (error) {
    console.error('Error fetching local macro data:', error)
    return NextResponse.json([], { status: 500 })
  }
}
