import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/intelligence - List intelligence with filters
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category')
  const sector = searchParams.get('sector')
  const importance = searchParams.get('importance')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (category) {
    where.category = category
  }

  if (importance) {
    where.importance = parseInt(importance)
  }

  if (sector) {
    where.sectors = {
      some: { sectorCode: sector }
    }
  }

  // 搜索功能：标题、内容、摘要、标签
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
      { summary: { contains: search } },
      {
        tags: {
          some: {
            tag: {
              name: { contains: search }
            }
          }
        }
      },
      {
        stocks: {
          some: {
            OR: [
              { stockSymbol: { contains: search } },
              { stockName: { contains: search } }
            ]
          }
        }
      }
    ]
  }

  const [items, total] = await Promise.all([
    prisma.intelligence.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        sectors: true,
        stocks: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.intelligence.count({ where }),
  ])

  return NextResponse.json({
    items,
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  })
}

// POST /api/intelligence - Create intelligence
export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    title, content, summary, category, importance,
    tags, sectors, stocks, source, authorName,
    attachments,
  } = body

  const intelligence = await prisma.intelligence.create({
    data: {
      title,
      content: content || '',
      summary,
      category,
      importance: importance || 3,
      source,
      authorName: authorName || '匿名',
      tags: tags ? {
        create: await Promise.all(tags.map(async (tagName: string) => {
          let tag = await prisma.tag.findUnique({ where: { name: tagName } })
          if (!tag) {
            tag = await prisma.tag.create({ data: { name: tagName } })
          }
          return { tagId: tag.id }
        }))
      } : undefined,
      sectors: sectors ? {
        create: sectors.map((s: { code: string; name: string }) => ({
          sectorCode: s.code,
          sectorName: s.name,
        }))
      } : undefined,
      stocks: stocks ? {
        create: stocks.map((s: { symbol: string; name: string }) => ({
          stockSymbol: s.symbol,
          stockName: s.name,
        }))
      } : undefined,
      attachments: attachments && attachments.length > 0 ? {
        create: attachments.map((a: { fileName: string; fileUrl: string; fileType: string; fileSize: number }) => ({
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          fileType: a.fileType,
          fileSize: a.fileSize,
        }))
      } : undefined,
    },
    include: {
      tags: { include: { tag: true } },
      sectors: true,
      stocks: true,
      attachments: true,
    },
  })

  return NextResponse.json(intelligence)
}