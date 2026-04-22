import { NextRequest, NextResponse } from 'next/server'

import { getWsjImportPreview, importWsjEvents } from '@/lib/intelligence/wsj-events-import'

export async function GET() {
  try {
    const preview = await getWsjImportPreview()
    return NextResponse.json(preview)
  } catch (error) {
    console.error('Failed to load WSJ import preview:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load WSJ import preview',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const latestOnly = body.latestOnly === true
    const dryRun = body.dryRun === true
    const saveSnapshot = body.saveSnapshot !== false
    const directoryPath = typeof body.directoryPath === 'string' ? body.directoryPath : undefined
    const maxFiles = typeof body.maxFiles === 'number' ? body.maxFiles : undefined

    const result = await importWsjEvents({
      directoryPath,
      latestOnly,
      maxFiles,
      dryRun,
      saveSnapshot,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to import WSJ events:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to import WSJ events',
      },
      { status: 500 }
    )
  }
}
