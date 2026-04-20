import { NextRequest, NextResponse } from 'next/server'

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5003'
export const maxDuration = 30

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params
  const searchParams = request.nextUrl.searchParams
  const startDate = searchParams.get('start_date') || ''
  const endDate = searchParams.get('end_date') || ''

  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker parameter" }, { status: 400 })
  }

  try {
    let url = `${FLASK_API_URL}/api/stock/price/${ticker}`
    const queryParams = new URLSearchParams()
    if (startDate) queryParams.append('start_date', startDate)
    if (endDate) queryParams.append('end_date', endDate)
    if (queryParams.toString()) url += `?${queryParams.toString()}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Flask API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('Stock price error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock price' },
      { status: 500 }
    )
  }
}
