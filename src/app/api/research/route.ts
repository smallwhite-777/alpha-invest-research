import { NextRequest, NextResponse } from 'next/server'
import {
  buildLimitReachedPayload,
  buildQuotaInfo,
  checkAndConsumeQuota,
} from '@/lib/guest-quota'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5003'

export async function POST(request: NextRequest) {
  try {
    const quota = await checkAndConsumeQuota('AI')
    if (!quota.allowed) {
      return NextResponse.json(buildLimitReachedPayload('AI', quota), { status: 401 })
    }

    const body = await request.json()
    const { query, provider } = body

    if (!query) {
      return NextResponse.json(
        { status: 'failed', error: 'Missing query' },
        { status: 400 }
      )
    }

    // Call Python backend
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, provider }),
    })

    if (!response.ok) {
      throw new Error(`Python backend error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json({ ...data, quota: buildQuotaInfo(quota, 'AI') })

  } catch (error) {
    console.error('Research query error:', error)
    return NextResponse.json(
      {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/companies`)
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch companies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    )
  }
}