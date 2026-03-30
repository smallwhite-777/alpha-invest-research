import { NextRequest, NextResponse } from 'next/server'

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5003'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const source = searchParams.get('source') || 'cls'
  const count = searchParams.get('count') || '10'

  try {
    const response = await fetch(
      `${FLASK_API_URL}/api/news/hot?source=${source}&count=${count}`,
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
    console.error('News fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news', news: [], source },
      { status: 500 }
    )
  }
}