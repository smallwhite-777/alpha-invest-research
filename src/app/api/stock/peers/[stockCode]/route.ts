import { NextRequest, NextResponse } from 'next/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5003'

// 同行对比数据代理
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stockCode: string }> }
) {
  const { stockCode } = await params

  const timeout = 60000 // 60秒超时

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/stock/peers/${encodeURIComponent(stockCode)}`,
      {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Backend error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error(`[peers proxy] Error for ${stockCode}:`, error)

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Request timeout' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch from backend' },
      { status: 500 }
    )
  }
}