import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5003'

interface SearchResult {
  type: 'intelligence' | 'stock' | 'news'
  id: string
  title: string
  description?: string
  url: string
  metadata?: Record<string, any>
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || searchParams.get('query') || ''
  const limit = parseInt(searchParams.get('limit') || '10', 10)

  if (!query || query.trim().length < 1) {
    return NextResponse.json({
      success: true,
      results: [],
      total: 0
    })
  }

  const searchTerm = query.trim()
  const results: SearchResult[] = []

  try {
    // 1. Search Intelligence (Prisma)
    const intelligenceResults = await prisma.intelligence.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm } },
          { content: { contains: searchTerm } },
          { summary: { contains: searchTerm } }
        ]
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })

    for (const item of intelligenceResults) {
      results.push({
        type: 'intelligence',
        id: item.id,
        title: item.title,
        description: item.summary || item.content?.slice(0, 150),
        url: `/intelligence/${item.id}`,
        metadata: {
          category: item.category,
          importance: item.importance,
          createdAt: item.createdAt
        }
      })
    }

    // 2. Search Stocks (Python Backend)
    try {
      const stockResponse = await fetch(
        `${PYTHON_BACKEND_URL}/api/stock/search?keyword=${encodeURIComponent(searchTerm)}&limit=${limit}`,
        { signal: AbortSignal.timeout(5000) }
      )

      if (stockResponse.ok) {
        const stockData = await stockResponse.json()
        if (stockData.stocks && Array.isArray(stockData.stocks)) {
          for (const stock of stockData.stocks) {
            results.push({
              type: 'stock',
              id: stock.code || stock.symbol,
              title: `${stock.name} (${stock.code || stock.symbol})`,
              description: stock.industry || stock.sectorName || 'A股',
              url: `/stock/${stock.code || stock.symbol}`,
              metadata: {
                market: stock.market,
                industry: stock.industry || stock.sectorName
              }
            })
          }
        }
      }
    } catch (stockError) {
      console.error('[search] Stock search failed:', stockError)
    }

    // 3. Search News (Python Backend)
    try {
      const newsResponse = await fetch(
        `${PYTHON_BACKEND_URL}/api/news/hot?count=${Math.min(limit, 5)}`,
        { signal: AbortSignal.timeout(5000) }
      )

      if (newsResponse.ok) {
        const newsData = await newsResponse.json()
        if (newsData.news && Array.isArray(newsData.news)) {
          // Filter news by search term
          const filteredNews = newsData.news.filter(
            (item: any) =>
              item.title?.includes(searchTerm) ||
              item.content?.includes(searchTerm)
          )

          for (const news of filteredNews.slice(0, limit)) {
            results.push({
              type: 'news',
              id: news.id || `news-${Date.now()}-${Math.random()}`,
              title: news.title,
              description: news.content?.slice(0, 150),
              url: `/news`,
              metadata: {
                source: news.source,
                time: news.time
              }
            })
          }
        }
      }
    } catch (newsError) {
      console.error('[search] News search failed:', newsError)
    }

    // Sort by relevance (title match first, then description match)
    results.sort((a, b) => {
      const aTitleMatch = a.title.includes(searchTerm) ? 0 : 1
      const bTitleMatch = b.title.includes(searchTerm) ? 0 : 1
      return aTitleMatch - bTitleMatch
    })

    return NextResponse.json({
      success: true,
      query: searchTerm,
      results: results.slice(0, limit * 3), // Return more results since we're combining types
      total: results.length,
      breakdown: {
        intelligence: results.filter(r => r.type === 'intelligence').length,
        stock: results.filter(r => r.type === 'stock').length,
        news: results.filter(r => r.type === 'news').length
      }
    })

  } catch (error) {
    console.error('[search] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Search failed',
      results: [],
      total: 0
    }, { status: 500 })
  }
}