import { NextRequest, NextResponse } from 'next/server'

import { getEventDatabaseAvailableDates, getEventDatabasePreview, importEventDatabase, importEventDatabaseIncremental } from '@/lib/intelligence/event-database-import'

export async function GET(request: NextRequest) {
  try {
    const filePath = request.nextUrl.searchParams.get('path') || undefined
    const includeDates = request.nextUrl.searchParams.get('include_dates') === '1'
    const preview = await getEventDatabasePreview(filePath)
    const dates = includeDates ? await getEventDatabaseAvailableDates(filePath) : undefined
    return NextResponse.json({
      ...preview,
      dates,
    })
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
    const startDate = typeof body?.startDate === 'string' ? body.startDate : undefined
    const endDate = typeof body?.endDate === 'string' ? body.endDate : undefined
    const incremental = Boolean(body?.incremental)

    const result = incremental
      ? await importEventDatabaseIncremental({
          filePath,
          dryRun,
          startDate,
          endDate,
          batchDays: typeof body?.batchDays === 'number' ? body.batchDays : undefined,
          newestFirst: typeof body?.newestFirst === 'boolean' ? body.newestFirst : undefined,
          maxBatches: typeof body?.maxBatches === 'number' ? body.maxBatches : undefined,
        })
      : await importEventDatabase({
          filePath,
          latestOnly,
          dryRun,
          startDate,
          endDate,
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
