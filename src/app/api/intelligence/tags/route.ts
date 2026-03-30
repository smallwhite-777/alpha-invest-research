import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/intelligence/tags - Get tag statistics
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        intelligences: {
          select: {
            intelligenceId: true,
          },
        },
      },
      orderBy: {
        intelligences: {
          _count: 'desc',
        },
      },
      take: 50,
    })

    const formattedTags = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      count: tag.intelligences.length,
    }))

    return NextResponse.json(formattedTags)
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}
