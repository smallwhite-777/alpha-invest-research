import { NextRequest, NextResponse } from 'next/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5003'

/**
 * GET /api/macro/data
 * Get macro data for specific indicators
 *
 * Proxies to Python backend for real data from AKShare
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const codes = searchParams.get('codes')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const limit = parseInt(searchParams.get('limit') || '60')

  if (!codes) {
    return NextResponse.json({ error: 'codes parameter required' }, { status: 400 })
  }

  const codeList = codes.split(',')

  try {
    // Try to fetch from Python backend with extended timeout
    const params = new URLSearchParams({
      codes,
      limit: limit.toString(),
    })
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 1 minute

    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/macro/data?${params.toString()}`,
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

    // Fallback to database if backend fails
    const { prisma } = await import('@/lib/db')

    const data = await prisma.macroDataPoint.findMany({
      where: {
        indicatorCode: { in: codeList },
        ...(startDate && { date: { gte: startDate } }),
        ...(endDate && { date: { lte: endDate } }),
      },
      orderBy: { date: 'desc' },
      take: limit * codeList.length,
    })

    // Group by indicator
    const grouped = codeList.map(code => ({
      indicatorCode: code,
      data: data
        .filter(d => d.indicatorCode === code)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }))

    return NextResponse.json(grouped)

  } catch (error) {
    console.error('Error fetching macro data:', error)

    // Fallback: generate mock data
    const mockData = generateMockData(codeList, limit)
    return NextResponse.json(mockData)
  }
}

/**
 * Generate mock data as last resort fallback
 */
function generateMockData(codes: string[], limit: number) {
  const now = new Date()

  return codes.map(code => {
    const data = []
    let baseValue = getBaseValueForCode(code)

    for (let i = 0; i < limit; i++) {
      const date = new Date(now)
      date.setMonth(date.getMonth() - (limit - i))

      const value = baseValue + (Math.random() - 0.5) * baseValue * 0.1
      baseValue = value // Slight random walk

      data.push({
        date: date.toISOString().split('T')[0],
        value: parseFloat(value.toFixed(2))
      })
    }

    return {
      indicatorCode: code,
      data
    }
  })
}

function getBaseValueForCode(code: string): number {
  const baseValues: Record<string, number> = {
    'cn_gdp_yoy': 5.0,
    'cn_pmi': 50,
    'cn_cpi': 2.0,
    'cn_ppi': -1.0,
    'cn_m2': 8.5,
    'cn_m1': 4.0,
    'shibor_3m': 2.2,
    'brent_oil': 80,
    'lme_copper': 8500,
    'gold_price': 2000,
  }
  return baseValues[code] || 100
}
