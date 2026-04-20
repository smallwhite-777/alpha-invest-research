'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Clock, ExternalLink, RefreshCw, Search, TrendingUp } from 'lucide-react'

interface NewsItem {
  id: number | string
  title: string
  content: string
  source: string
  rank: number
  url: string
  publish_time: string | null
  meta_data: Record<string, unknown>
}

const SOURCE_LABELS: Record<string, string> = {
  cls: '财联社',
  wallstreetcn: '华尔街见闻',
  xueqiu: '雪球',
  weibo: '微博',
  zhihu: '知乎',
  thepaper: '澎湃新闻',
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchNews = async (silent = false) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const res = await fetch('/api/news/hot?count=20', { cache: 'no-store' })
      const data = await res.json()
      setNews(Array.isArray(data.news) ? data.news : [])
    } catch (error) {
      console.error('Failed to fetch news:', error)
      if (!silent) {
        setNews([])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchNews()
  }, [])

  const filteredNews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return news

    return news.filter((item) => {
      const title = item.title?.toLowerCase() || ''
      const content = item.content?.toLowerCase() || ''
      const source = (SOURCE_LABELS[item.source] || item.source || '').toLowerCase()
      return title.includes(query) || content.includes(query) || source.includes(query)
    })
  }, [news, searchQuery])

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '实时'

    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return '实时'

    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes} 分钟前`
    if (hours < 24) return `${hours} 小时前`
    return `${days} 天前`
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">实时新闻</h1>
              <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-500">
                <TrendingUp className="mr-1 h-3 w-3" />
                已接入实时抓取
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              OpenInvest 新闻流，聚合财联社等热点来源并定时刷新。
            </p>
          </div>

          <button
            onClick={() => fetchNews(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            刷新新闻
          </button>
        </div>

        <Card className="mb-6 border-border bg-card p-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索标题、来源或正文..."
              className="border-border bg-background pl-10 text-foreground"
            />
          </div>
        </Card>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">正在加载新闻...</div>
        ) : filteredNews.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">暂无匹配的新闻内容</div>
        ) : (
          <div className="space-y-4">
            {filteredNews.map((item, index) => (
              <Card
                key={item.id || index}
                className="border-border bg-card p-5 transition-all duration-200 hover:bg-accent/40"
              >
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-border text-xs text-muted-foreground">
                        {SOURCE_LABELS[item.source] || item.source}
                      </Badge>
                      <span className="text-xs text-muted-foreground">#{item.rank}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTime(item.publish_time)}
                      </span>
                    </div>

                    <h3 className="mb-2 line-clamp-2 text-base font-medium text-foreground">
                      {item.title}
                    </h3>

                    {item.content && (
                      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                        {item.content}
                      </p>
                    )}

                    <div className="text-xs text-muted-foreground">
                      来源：{SOURCE_LABELS[item.source] || item.source}
                    </div>
                  </div>

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground transition-colors hover:text-link"
                      aria-label={`打开新闻：${item.title}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
