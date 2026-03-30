import { NextRequest, NextResponse } from 'next/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5003'

/**
 * 批量财务数据API
 * GET /api/financial/batch/[stockCode]?modules=radar,dupont,dcf,growth,risk
 *
 * 一次请求获取多个财务模块，减少网络开销
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stockCode: string }> }
) {
  const { stockCode } = await params
  const searchParams = request.nextUrl.searchParams
  const modules = searchParams.get('modules') || 'radar,dupont,dcf,growth,risk'

  try {
    // Call Python backend batch endpoint
    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/financial/batch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_codes: [stockCode],
          modules: modules.split(',').map(m => m.trim())
        }),
        signal: AbortSignal.timeout(30000)
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Backend error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extract the result for this stock code
    const result = data.results?.[stockCode] || {}

    return NextResponse.json({
      success: true,
      stock_code: stockCode,
      modules: modules.split(','),
      data: result,
      cached: data.cached || false
    })

  } catch (error) {
    console.error(`[financial batch] Error for ${stockCode}:`, error)

    // Fallback: fetch modules individually
    const moduleList = modules.split(',').map(m => m.trim())
    const results: Record<string, any> = {}

    await Promise.all(
      moduleList.map(async (module) => {
        try {
          const res = await fetch(
            `${PYTHON_BACKEND_URL}/api/financial/${module}/${encodeURIComponent(stockCode)}`,
            { signal: AbortSignal.timeout(15000) }
          )
          if (res.ok) {
            results[module] = await res.json()
          }
        } catch {
          results[module] = { success: false, error: 'Module fetch failed' }
        }
      })
    )

    return NextResponse.json({
      success: true,
      stock_code: stockCode,
      modules: moduleList,
      data: results,
      cached: false,
      fallback: true
    })
  }
}