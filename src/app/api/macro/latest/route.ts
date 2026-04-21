import { NextRequest, NextResponse } from 'next/server'
import { getLocalMacroLatest } from '@/lib/macro-local'

export async function GET(request: NextRequest) {
  const codes = request.nextUrl.searchParams.get('codes')
  const selectedCodes = codes
    ? codes
        .split(',')
        .map((code) => code.trim())
        .filter(Boolean)
    : undefined

  try {
    const data = await getLocalMacroLatest(selectedCodes)
    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Error fetching local macro latest values:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: [],
      },
      { status: 500 }
    )
  }
}
