import { NextRequest, NextResponse } from 'next/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5003'

/**
 * GET /api/macro/indicators
 * List all available macro indicators
 *
 * Proxies to Python backend for real data from AKShare
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category')

  try {
    // Try to fetch from Python backend with extended timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 1 minute

    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/macro/indicators${category ? `?category=${category}` : ''}`,
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

    const where: Record<string, unknown> = {}
    if (category) {
      where.category = category
    }

    const indicators = await prisma.macroIndicator.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(indicators)

  } catch (error) {
    console.error('Error fetching indicators:', error)

    // Fallback: return default indicators
    const defaultIndicators = [
      { id: 'cn_gdp_yoy', code: 'cn_gdp_yoy', name: 'GDP同比增速', category: 'ECONOMIC', unit: '%', frequency: 'QUARTERLY' },
      { id: 'cn_pmi', code: 'cn_pmi', name: '制造业PMI', category: 'ECONOMIC', unit: '点', frequency: 'MONTHLY' },
      { id: 'cn_cpi', code: 'cn_cpi', name: 'CPI同比', category: 'PRICE', unit: '%', frequency: 'MONTHLY' },
      { id: 'cn_ppi', code: 'cn_ppi', name: 'PPI同比', category: 'PRICE', unit: '%', frequency: 'MONTHLY' },
      { id: 'cn_m2', code: 'cn_m2', name: 'M2增速', category: 'MONETARY', unit: '%', frequency: 'MONTHLY' },
      { id: 'shibor_3m', code: 'shibor_3m', name: 'SHIBOR 3个月', category: 'MONETARY', unit: '%', frequency: 'DAILY' },
      { id: 'brent_oil', code: 'brent_oil', name: '布伦特原油', category: 'COMMODITY', unit: '美元/桶', frequency: 'DAILY' },
      { id: 'lme_copper', code: 'lme_copper', name: 'LME铜', category: 'COMMODITY', unit: '美元/吨', frequency: 'DAILY' },
    ]

    return NextResponse.json(defaultIndicators)
  }
}
