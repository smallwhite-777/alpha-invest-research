import { NextRequest, NextResponse } from 'next/server'
import { getLocalMacroIndicators } from '@/lib/macro-local'

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category') || undefined

  try {
    return NextResponse.json(getLocalMacroIndicators(category))
  } catch (error) {
    console.error('Error fetching local macro indicators:', error)
    return NextResponse.json([])
  }
}
