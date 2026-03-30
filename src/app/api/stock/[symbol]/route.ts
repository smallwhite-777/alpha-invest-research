import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/stock/[symbol] - Get stock details with financials and valuations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  const decodedSymbol = decodeURIComponent(symbol)

  try {
    const [stock, financials, valuations, relatedIntelligence] = await Promise.all([
      prisma.stock.findUnique({
        where: { symbol: decodedSymbol },
      }),
      prisma.financialData.findMany({
        where: { stockSymbol: decodedSymbol },
        orderBy: { periodDate: 'desc' },
        take: 8,
      }),
      prisma.valuationData.findMany({
        where: { stockSymbol: decodedSymbol },
        orderBy: { date: 'desc' },
        take: 252, // ~1 year of daily data
      }),
      prisma.intelligenceStock.findMany({
        where: { stockSymbol: decodedSymbol },
        include: {
          intelligence: {
            include: {
              tags: { include: { tag: true } },
              sectors: true,
            },
          },
        },
        orderBy: { intelligence: { createdAt: 'desc' } },
        take: 5,
      }),
    ])

    if (!stock) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 })
    }

    return NextResponse.json({
      stock,
      financials,
      valuations,
      relatedIntelligence: relatedIntelligence.map(r => r.intelligence),
    })
  } catch (error) {
    console.error('Error fetching stock details:', error)
    return NextResponse.json({ error: 'Failed to fetch stock details' }, { status: 500 })
  }
}
