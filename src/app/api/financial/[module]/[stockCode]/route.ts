import { NextRequest, NextResponse } from 'next/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5003'

// 财务数据代理 - 避免前端直接请求Python后端的CORS问题
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ module: string; stockCode: string }> }
) {
  const { module, stockCode } = await params

  const timeout = 30000 // 30秒超时

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/financial/${module}/${encodeURIComponent(stockCode)}`,
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
    console.error(`[financial proxy] Error for ${module}/${stockCode}:`, error)

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ module: string; stockCode: string }> }
) {
  const { module, stockCode } = await params
  const body = await request.json().catch(() => ({}))

  try {
    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/financial/${module}/${encodeURIComponent(stockCode)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch from backend' },
      { status: 500 }
    )
  }
}