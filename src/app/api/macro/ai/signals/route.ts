import { NextResponse } from 'next/server'
import { readMacroSignals } from '@/lib/macro-ai/signals'

export async function GET() {
  try {
    const data = await readMacroSignals()
    return NextResponse.json({
      success: true,
      ...data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        files: [],
        items: [],
      },
      { status: 500 }
    )
  }
}

