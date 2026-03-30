import { NextRequest, NextResponse } from 'next/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5003'

/**
 * GET /api/macro/latest
 * Get latest values for all or specified macro indicators
 *
 * Proxies to Python backend for real data from AKShare
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const codes = searchParams.get('codes')

  try {
    // Fetch from Python backend with extended timeout
    // Note: Fetching all indicators can take 2-3 minutes
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 180000) // 3 minutes

    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/macro/latest${codes ? `?codes=${codes}` : ''}`,
      {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      }
    )
    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }

    // Fallback with error
    return NextResponse.json(
      {
        success: false,
        error: 'Backend unavailable',
        data: []
      },
      { status: 503 }
    )

  } catch (error) {
    console.error('Error fetching latest macro values:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      },
      { status: 500 }
    )
  }
}