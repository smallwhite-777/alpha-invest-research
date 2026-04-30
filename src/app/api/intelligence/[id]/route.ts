import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth-helpers'
import {
  buildLimitReachedPayload,
  buildQuotaInfo,
  checkAndConsumeQuota,
} from '@/lib/guest-quota'
import { getIntelligenceDetailById } from '@/lib/intelligence/services/get-intelligence-detail'

const DEEP_REPORT_CATEGORIES = new Set(['RESEARCH_REPORT', 'MEETING_MINUTES'])

// GET /api/intelligence/[id] - Get single intelligence
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const intelligence = await getIntelligenceDetailById(id)

    if (!intelligence) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const item = intelligence as { isExclusive?: boolean; category?: string }
    const user = await getCurrentUser()

    if (item.isExclusive && !user) {
      return NextResponse.json(
        { error: 'Unauthorized', requiresLogin: true, isExclusive: true },
        { status: 401 }
      )
    }

    let quotaPayload: ReturnType<typeof buildQuotaInfo> = null
    if (!user && item.category && DEEP_REPORT_CATEGORIES.has(item.category)) {
      const quota = await checkAndConsumeQuota('DEEP_REPORT')
      if (!quota.allowed) {
        return NextResponse.json(buildLimitReachedPayload('DEEP_REPORT', quota), { status: 401 })
      }
      quotaPayload = buildQuotaInfo(quota, 'DEEP_REPORT')
    }

    return NextResponse.json({ ...intelligence, quota: quotaPayload })
  } catch (error) {
    console.error('Error fetching intelligence:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

// PUT /api/intelligence/[id] - Update intelligence
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const adminUser = await requireAdmin()
    const body = await request.json()
    const { title, content, summary, category, importance, source, authorName, tags, sectors, stocks, isExclusive } = body

    // Update basic fields
    await prisma.intelligence.update({
      where: { id },
      data: {
        title,
        content,
        summary,
        category,
        importance,
        source,
        authorName,
        isExclusive: typeof isExclusive === 'boolean' ? isExclusive : undefined,
      },
    })

    void adminUser

    // Update tags if provided
    if (tags !== undefined) {
      await prisma.intelligenceTag.deleteMany({ where: { intelligenceId: id } })
      if (tags.length > 0) {
        for (const tagName of tags) {
          const tag = await prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          })
          await prisma.intelligenceTag.create({
            data: { intelligenceId: id, tagId: tag.id },
          })
        }
      }
    }

    // Update sectors if provided
    if (sectors !== undefined) {
      await prisma.intelligenceSector.deleteMany({ where: { intelligenceId: id } })
      if (sectors.length > 0) {
        await prisma.intelligenceSector.createMany({
          data: sectors.map((s: { code: string; name: string }) => ({
            intelligenceId: id,
            sectorCode: s.code,
            sectorName: s.name,
          })),
        })
      }
    }

    // Update stocks if provided
    if (stocks !== undefined) {
      await prisma.intelligenceStock.deleteMany({ where: { intelligenceId: id } })
      if (stocks.length > 0) {
        await prisma.intelligenceStock.createMany({
          data: stocks.map((s: { symbol: string; name: string }) => ({
            intelligenceId: id,
            stockSymbol: s.symbol,
            stockName: s.name,
          })),
        })
      }
    }

    // Fetch updated record
    const intelligence = await prisma.intelligence.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        sectors: true,
        stocks: true,
        attachments: true,
      },
    })

    return NextResponse.json(intelligence)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Error updating intelligence:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

// DELETE /api/intelligence/[id] - Delete intelligence
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await requireAdmin()

    // Explicitly delete related records first (libsql may not auto-cascade)
    await prisma.$transaction([
      prisma.intelligenceTag.deleteMany({ where: { intelligenceId: id } }),
      prisma.intelligenceSector.deleteMany({ where: { intelligenceId: id } }),
      prisma.intelligenceStock.deleteMany({ where: { intelligenceId: id } }),
      prisma.attachment.deleteMany({ where: { intelligenceId: id } }),
      prisma.intelligence.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Error deleting intelligence:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
