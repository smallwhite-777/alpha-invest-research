import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/stock/watchlist - Get user's watchlist
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('userId') || 'default'

  try {
    const watchlist = await prisma.watchlistItem.findMany({
      where: { userId },
      include: {
        stock: true,
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(watchlist)
  } catch (error) {
    console.error('Error fetching watchlist:', error)
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 })
  }
}

// POST /api/stock/watchlist - Add stock to watchlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stockSymbol, userId = 'default', note } = body

    // Check if already in watchlist
    const existing = await prisma.watchlistItem.findUnique({
      where: {
        userId_stockSymbol: {
          userId,
          stockSymbol,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'Already in watchlist' }, { status: 400 })
    }

    // Get max sort order
    const maxOrder = await prisma.watchlistItem.findFirst({
      where: { userId },
      orderBy: { sortOrder: 'desc' },
    })

    const watchlistItem = await prisma.watchlistItem.create({
      data: {
        userId,
        stockSymbol,
        note,
        sortOrder: (maxOrder?.sortOrder || 0) + 1,
      },
      include: {
        stock: true,
      },
    })

    return NextResponse.json(watchlistItem)
  } catch (error) {
    console.error('Error adding to watchlist:', error)
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 })
  }
}
