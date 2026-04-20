import { NextRequest, NextResponse } from 'next/server'
import { getLocalMacroData } from '@/lib/macro-local'

function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length
  if (!n || n !== y.length) return 0

  const sumX = x.reduce((acc, value) => acc + value, 0)
  const sumY = y.reduce((acc, value) => acc + value, 0)
  const sumXY = x.reduce((acc, value, index) => acc + value * y[index], 0)
  const sumX2 = x.reduce((acc, value) => acc + value * value, 0)
  const sumY2 = y.reduce((acc, value) => acc + value * value, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  return denominator === 0 ? 0 : numerator / denominator
}

function calculateRegression(x: number[], y: number[]) {
  const n = x.length
  if (!n) return { slope: 0, intercept: 0, r2: 0 }

  const sumX = x.reduce((acc, value) => acc + value, 0)
  const sumY = y.reduce((acc, value) => acc + value, 0)
  const sumXY = x.reduce((acc, value, index) => acc + value * y[index], 0)
  const sumX2 = x.reduce((acc, value) => acc + value * value, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1)
  const intercept = (sumY - slope * sumX) / n
  const yMean = sumY / n
  const ssTotal = y.reduce((acc, value) => acc + (value - yMean) ** 2, 0)
  const ssResidual = y.reduce((acc, value, index) => acc + (value - (slope * x[index] + intercept)) ** 2, 0)
  const r2 = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal

  return { slope, intercept, r2 }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { codeX, codeY, lag = 0 } = body

    if (!codeX || !codeY) {
      return NextResponse.json({ error: 'codeX and codeY required' }, { status: 400 })
    }

    const [seriesX, seriesY] = await getLocalMacroData([codeX, codeY], { limit: 240 })
    const mapX = new Map(seriesX.data.map((item) => [item.date, item.value]))
    const mapY = new Map(seriesY.data.map((item) => [item.date, item.value]))
    const datesX = Array.from(mapX.keys()).sort()

    const dataPoints: Array<{ date: string; x: number; y: number }> = []
    const valuesX: number[] = []
    const valuesY: number[] = []

    for (let index = 0; index < datesX.length - lag; index += 1) {
      const dateX = datesX[index]
      const dateY = datesX[index + lag]
      if (!mapY.has(dateY)) continue

      const x = mapX.get(dateX)
      const y = mapY.get(dateY)
      if (x === undefined || y === undefined) continue

      dataPoints.push({ date: dateX, x, y })
      valuesX.push(x)
      valuesY.push(y)
    }

    if (valuesX.length < 3) {
      return NextResponse.json({
        correlation: 0,
        regression: { slope: 0, intercept: 0, r2: 0 },
        dataPoints: [],
        sampleSize: 0,
      })
    }

    return NextResponse.json({
      correlation: calculateCorrelation(valuesX, valuesY),
      regression: calculateRegression(valuesX, valuesY),
      dataPoints,
      sampleSize: valuesX.length,
    })
  } catch (error) {
    console.error('Error calculating local macro correlation:', error)
    return NextResponse.json({ error: 'Failed to calculate correlation' }, { status: 500 })
  }
}
