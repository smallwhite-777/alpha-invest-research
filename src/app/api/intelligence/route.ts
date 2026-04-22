import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getLocalWsjIntelligenceItems, WSJ_SOURCE_NAME } from '@/lib/intelligence/wsj-events-import'
import { getIntelligenceFeedFromNewStore, hasNewIntelligenceStoreData } from '@/lib/intelligence/services/get-intelligence-feed'

// Mock data for when database is unavailable
const MOCK_INTELLIGENCE = [
  { id: '1', title: '半导体设备国产化率突破40%，北方华创订单饱满', content: '根据产业链调研，国内半导体设备国产化率已突破40%关口。北方华创近期订单饱满，刻蚀机、薄膜沉积设备出货量持续增长。', summary: '半导体设备国产替代加速', category: 'INDUSTRY_TRACK', importance: 5, source: '产业链调研', authorName: '研究员A', createdAt: '2026-04-01T08:00:00Z', updatedAt: '2026-04-01T08:00:00Z', tags: [{ tag: { name: '半导体' } }, { tag: { name: '国产替代' } }], sectors: [{ sectorCode: 'SW_SEMI', sectorName: '半导体' }], stocks: [{ stockSymbol: '002371', stockName: '北方华创' }] },
  { id: '2', title: '光伏组件价格企稳回升，一线厂商开工率提升', content: '近期光伏组件价格已企稳回升，隆基绿能、晶科能源等一线厂商开工率提升至80%以上，行业底部信号明显。', summary: '光伏行业触底回升信号', category: 'INDUSTRY_TRACK', importance: 4, source: '行业跟踪', authorName: '研究员B', createdAt: '2026-03-30T10:00:00Z', updatedAt: '2026-03-30T10:00:00Z', tags: [{ tag: { name: '光伏' } }, { tag: { name: '新能源' } }], sectors: [{ sectorCode: 'SW_SOLAR', sectorName: '光伏设备' }], stocks: [{ stockSymbol: '601012', stockName: '隆基绿能' }] },
  { id: '3', title: '央行MLF续作量缩价平，流动性预期维持宽松', content: 'MLF到期5000亿，续作3000亿，净回笼2000亿但市场反应平淡，预计后续仍有降准降息空间。', summary: 'MLF操作信号偏鸽', category: 'POLICY_RUMOR', importance: 4, source: '宏观研究', authorName: '研究员C', createdAt: '2026-03-28T14:00:00Z', updatedAt: '2026-03-28T14:00:00Z', tags: [{ tag: { name: '货币政策' } }, { tag: { name: 'MLF' } }], sectors: [], stocks: [] },
  { id: '4', title: '某头部私募调研纪要：AI Agent将重塑SaaS格局', content: '某百亿私募内部调研纪要流出，核心观点：AI Agent将在未来2年内重塑企业SaaS格局，关注金山办公、用友网络等标的。', summary: 'AI Agent重塑SaaS行业', category: 'MEETING_MINUTES', importance: 5, source: '会议纪要', authorName: '研究员D', createdAt: '2026-03-26T09:00:00Z', updatedAt: '2026-03-26T09:00:00Z', tags: [{ tag: { name: 'AI' } }, { tag: { name: 'SaaS' } }], sectors: [{ sectorCode: 'SW_SOFTWARE', sectorName: '软件开发' }], stocks: [{ stockSymbol: '688111', stockName: '金山办公' }] },
  { id: '5', title: '汽车以旧换新补贴延续，新能源车渗透率再创新高', content: '商务部确认汽车以旧换新补贴政策延续至2026年底，3月新能源车渗透率达52%，比亚迪月销突破40万辆。', summary: '新能源车政策利好持续', category: 'NEWS', importance: 3, source: '公开新闻', authorName: '研究员E', createdAt: '2026-03-25T16:00:00Z', updatedAt: '2026-03-25T16:00:00Z', tags: [{ tag: { name: '新能源车' } }, { tag: { name: '政策' } }], sectors: [{ sectorCode: 'SW_AUTO', sectorName: '汽车整车' }], stocks: [{ stockSymbol: '002594', stockName: '比亚迪' }] },
  { id: '6', title: '消费电子周期回暖，果链公司Q1业绩超预期', content: '立讯精密、歌尔股份等果链龙头Q1业绩预告超预期，消费电子补库周期启动，关注MR设备量产进度。', summary: '消费电子复苏周期开启', category: 'RESEARCH_REPORT', importance: 4, source: '券商研报', authorName: '研究员F', createdAt: '2026-03-23T11:00:00Z', updatedAt: '2026-03-23T11:00:00Z', tags: [{ tag: { name: '消费电子' } }, { tag: { name: 'MR' } }], sectors: [{ sectorCode: 'SW_ELEC', sectorName: '消费电子' }], stocks: [{ stockSymbol: '002475', stockName: '立讯精密' }] },
  { id: '7', title: '段子：某量化大佬说今年做多波动率是最确定的策略', content: '饭局传闻：某头部量化基金经理表示，今年全球宏观不确定性加大，做多波动率可能是最确定性的策略。', summary: '量化圈关于波动率的讨论', category: 'GOSSIP', importance: 2, source: '饭局', authorName: '匿名', createdAt: '2026-03-22T20:00:00Z', updatedAt: '2026-03-22T20:00:00Z', tags: [{ tag: { name: '量化' } }, { tag: { name: '波动率' } }], sectors: [], stocks: [] },
  { id: '8', title: '医药集采第十批即将启动，关注创新药标的', content: '第十批国家集采即将启动，涉及品种超50个。集采常态化背景下，创新药企业受影响较小，建议关注恒瑞医药等龙头。', summary: '集采常态化，聚焦创新药', category: 'POLICY_RUMOR', importance: 3, source: '政策跟踪', authorName: '研究员G', createdAt: '2026-03-20T13:00:00Z', updatedAt: '2026-03-20T13:00:00Z', tags: [{ tag: { name: '医药' } }, { tag: { name: '集采' } }], sectors: [{ sectorCode: 'SW_PHARMA', sectorName: '化学制药' }], stocks: [{ stockSymbol: '600276', stockName: '恒瑞医药' }] },
]

type IntelligenceLikeItem = {
  id: string
  category: string
  importance: number
  source?: string | null
  title: string
  content: string
  summary?: string | null
  createdAt: string | Date
  tags: Array<{ tag: { name: string } }>
  sectors: Array<{ sectorCode: string }>
}

function normalizeFingerprint(value: string | null | undefined) {
  return (value || '')
    .toLowerCase()
    .replace(/[“”"'`’‘]/g, '')
    .replace(/[，。；：、！!？?（）()\[\]\-—_]/g, '')
    .replace(/\s+/g, '')
}

function filterMockData<T extends IntelligenceLikeItem>(items: T[], params: { category?: string | null; search?: string | null; sector?: string | null; importance?: string | null; source?: string | null }) {
  let filtered = [...items]
  if (params.category) filtered = filtered.filter(i => i.category === params.category)
  if (params.importance) filtered = filtered.filter(i => i.importance >= parseInt(params.importance!))
  if (params.source) filtered = filtered.filter(i => i.source === params.source)
  if (params.search) {
    const q = params.search.toLowerCase()
    filtered = filtered.filter(i => i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q) || i.tags.some(t => t.tag.name.toLowerCase().includes(q)))
  }
  if (params.sector) filtered = filtered.filter(i => i.sectors.some(s => s.sectorCode === params.sector))
  return filtered
}

function filterByRecentDays<T extends { createdAt: string | Date }>(items: T[], recentDays?: string | null) {
  if (!recentDays) return items
  const days = parseInt(recentDays)
  if (!Number.isFinite(days) || days <= 0) return items

  const since = new Date()
  since.setDate(since.getDate() - days)

  return items.filter(item => new Date(item.createdAt) >= since)
}

function toSortableDate(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value
}

function sortByCreatedAtDesc<T extends { createdAt: string | Date }>(items: T[]) {
  return [...items].sort((left, right) => toSortableDate(right.createdAt).localeCompare(toSortableDate(left.createdAt)))
}

function dedupeIntelligenceItems<T extends IntelligenceLikeItem>(items: T[]) {
  const deduped = new Map<string, T>()

  for (const item of sortByCreatedAtDesc(items)) {
    const fingerprint = `${item.source || ''}::${normalizeFingerprint(item.title)}::${normalizeFingerprint(item.summary)}`
    if (!deduped.has(fingerprint)) {
      deduped.set(fingerprint, item)
    }
  }

  return Array.from(deduped.values())
}

// GET /api/intelligence - List intelligence with filters
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category')
  const sector = searchParams.get('sector')
  const importance = searchParams.get('importance')
  const source = searchParams.get('source')
  const search = searchParams.get('search')
  const recentDays = searchParams.get('recent_days')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit

  // Try database first, fallback to mock data
  try {
    if (await hasNewIntelligenceStoreData()) {
      const { items, total } = await getIntelligenceFeedFromNewStore({
        category,
        sector,
        importance,
        source,
        search,
        recentDays,
        skip,
        limit,
      })

      return NextResponse.json({
        items: dedupeIntelligenceItems(items),
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      })
    }

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (importance) where.importance = parseInt(importance)
    if (source) where.source = source
    if (recentDays) {
      const days = parseInt(recentDays)
      if (Number.isFinite(days) && days > 0) {
        const since = new Date()
        since.setDate(since.getDate() - days)
        where.createdAt = { gte: since }
      }
    }
    if (sector) where.sectors = { some: { sectorCode: sector } }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { summary: { contains: search } },
        { tags: { some: { tag: { name: { contains: search } } } } },
        { stocks: { some: { OR: [{ stockSymbol: { contains: search } }, { stockName: { contains: search } }] } } },
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
      items: dedupeIntelligenceItems(items as IntelligenceLikeItem[]),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.warn('Database unavailable, using mock data:', (error as Error).message)
    let fallbackItems = [...MOCK_INTELLIGENCE]

    try {
      const localWsjItems = await getLocalWsjIntelligenceItems({
        latestOnly: false,
        maxFiles: 5,
      })

      fallbackItems = source === WSJ_SOURCE_NAME
        ? localWsjItems
        : sortByCreatedAtDesc([
            ...localWsjItems,
            ...MOCK_INTELLIGENCE,
          ])
    } catch (localError) {
      console.warn('Local WSJ fallback unavailable:', (localError as Error).message)
    }

    const filtered = dedupeIntelligenceItems(
      filterByRecentDays(
        filterMockData(fallbackItems, { category, search, sector, importance, source }),
        recentDays
      )
    )
    const paged = filtered.slice(skip, skip + limit)
    return NextResponse.json({
      items: paged,
      total: filtered.length,
      page,
      pageSize: limit,
      totalPages: Math.ceil(filtered.length / limit),
    })
  }
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
