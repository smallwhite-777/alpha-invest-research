import { NextRequest, NextResponse } from 'next/server'

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5003'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const limit = searchParams.get('limit') || '10'

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 })
  }

  try {
    const response = await fetch(
      `${FLASK_API_URL}/api/stock/search?q=${encodeURIComponent(query)}&limit=${limit}`,
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
    console.error('Stock search error:', error)
    return NextResponse.json(
      { error: 'Failed to search stocks', results: [], query },
      { status: 500 }
    )
  }
}