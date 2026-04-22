import { NextResponse } from 'next/server'

import { ensureIntelligenceStoreSchema } from '@/lib/intelligence/core/schema'
import { listRecentIngestionJobs } from '@/lib/intelligence/services/ingestion-jobs'

export async function GET() {
  try {
    await ensureIntelligenceStoreSchema()
    const jobs = await listRecentIngestionJobs()
    return NextResponse.json({ items: jobs })
  } catch (error) {
    console.error('Failed to fetch ingestion jobs:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch ingestion jobs' },
      { status: 500 }
    )
  }
}
