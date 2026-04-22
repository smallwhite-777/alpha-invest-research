import { NextRequest, NextResponse } from 'next/server'

import { getEventDatabasePreview, importEventDatabase } from '@/lib/intelligence/event-database-import'

export async function GET(request: NextRequest) {
  try {
    const filePath = request.nextUrl.searchParams.get('path') || undefined
    const preview = await getEventDatabasePreview(filePath)
    return NextResponse.json(preview)
  } catch (error) {
    console.error('Failed to load event database preview:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load event database preview' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const filePath = typeof body?.path === 'string' ? body.path : undefined
    const latestOnly = Boolean(body?.latestOnly)
    const dryRun = Boolean(body?.dryRun)

    const result = await importEventDatabase({
      filePath,
      latestOnly,
      dryRun,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to import local event database:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import local event database' },
      { status: 500 }
    )
  }
}
