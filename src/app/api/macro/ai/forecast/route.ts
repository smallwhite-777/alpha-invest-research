import { NextRequest, NextResponse } from 'next/server'
import { getMacroForecast } from '@/lib/macro-ai/forecast'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const series = typeof body?.series === 'string' ? body.series.trim() : ''
    const horizon = Number(body?.horizon || 3)

    if (!series) {
      return NextResponse.json({ error: 'series is required' }, { status: 400 })
    }

    const forecast = await getMacroForecast(series, horizon)
    return NextResponse.json({
      success: Boolean(forecast),
      forecast,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

