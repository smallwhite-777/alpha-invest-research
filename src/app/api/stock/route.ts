import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/stock - List stocks with optional filtering
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sector = searchParams.get('sector')
  const symbol = searchParams.get('symbol')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (sector) {
    where.sectorCode = sector
  }

  if (symbol) {
    where.symbol = { contains: symbol, mode: 'insensitive' }
  }

  const [items, total] = await Promise.all([
    prisma.stock.findMany({
      where,
      orderBy: { symbol: 'asc' },
      skip,
      take: limit,
    }),
    prisma.stock.count({ where }),
  ])

  return NextResponse.json({
    items,
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  })
}
