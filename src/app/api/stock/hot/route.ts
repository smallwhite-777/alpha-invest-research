import { NextRequest, NextResponse } from 'next/server'

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5003'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const count = searchParams.get('count') || '15'

  try {
    const response = await fetch(
      `${FLASK_API_URL}/api/stock/hot?count=${count}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Flask API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Hot stocks fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hot stocks', stocks: [] },
      { status: 500 }
    )
  }
}