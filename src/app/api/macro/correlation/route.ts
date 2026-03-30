import { NextRequest, NextResponse } from 'next/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5003'

/**
 * POST /api/macro/correlation
 * Calculate correlation between two macro indicators
 *
 * Body: { codeX: string, codeY: string, lag?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { codeX, codeY, lag = 0 } = body

    if (!codeX || !codeY) {
      return NextResponse.json({ error: 'codeX and codeY required' }, { status: 400 })
    }

    // Try to use Python backend for real data
    try {
      const response = await fetch(`${PYTHON_BACKEND_URL}/api/macro/correlation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeX, codeY, lag }),
        signal: AbortSignal.timeout(30000)
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }
    } catch (backendError) {
      console.log('Python backend not available, using local calculation')
    }

    // Fallback: use local calculation with database data
    const { prisma } = await import('@/lib/db')

    // Fetch data for both indicators
    const dataX = await prisma.macroDataPoint.findMany({
      where: { indicatorCode: codeX },
      orderBy: { date: 'asc' },
    })

    const dataY = await prisma.macroDataPoint.findMany({
      where: { indicatorCode: codeY },
      orderBy: { date: 'asc' },
    })

    // Create date-indexed maps
    const mapX = new Map(dataX.map(d => [d.date, d.value]))
    const mapY = new Map(dataY.map(d => [d.date, d.value]))

    // Find common dates with lag
    const commonDates: string[] = []
    const valuesX: number[] = []
    const valuesY: number[] = []

    const datesX = Array.from(mapX.keys()).sort()

    for (let i = 0; i < datesX.length - lag; i++) {
      const dateX = datesX[i]
      const dateY = datesX[i + lag]

      if (mapY.has(dateY)) {
        commonDates.push(dateX)
        valuesX.push(mapX.get(dateX)!)
        valuesY.push(mapY.get(dateY)!)
      }
    }

    if (valuesX.length < 3) {
      return NextResponse.json({
        correlation: 0,
        regression: { slope: 0, intercept: 0, r2: 0 },
        dataPoints: [],
      })
    }

    const correlation = calculateCorrelation(valuesX, valuesY)
    const regression = calculateRegression(valuesX, valuesY)

    const dataPoints = commonDates.map((date, i) => ({
      date,
      x: valuesX[i],
      y: valuesY[i],
    }))

    return NextResponse.json({
      correlation,
      regression,
      dataPoints,
      sampleSize: valuesX.length,
    })

  } catch (error) {
    console.error('Error calculating correlation:', error)
    return NextResponse.json({ error: 'Failed to calculate' }, { status: 500 })
  }
}

// Calculate Pearson correlation coefficient
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length
  if (n === 0 || n !== y.length) return 0

  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0)
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0)
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  if (denominator === 0) return 0
  return numerator / denominator
}

// Calculate linear regression
function calculateRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  const n = x.length
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 }

  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0)
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const yMean = sumY / n
  const ssTotal = y.reduce((total, yi) => total + Math.pow(yi - yMean, 2), 0)
  const ssResidual = y.reduce((total, yi, i) => total + Math.pow(yi - (slope * x[i] + intercept), 2), 0)
  const r2 = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal

  return { slope, intercept, r2 }
}
