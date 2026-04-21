'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, TrendingUp, Clock, ExternalLink } from 'lucide-react'

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

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    try {
      const res = await fetch('/api/news/hot?count=20')
      const data = await res.json()
      if (data.news) {
        setNews(data.news)
      }
    } catch (error) {
      console.error('Failed to fetch news:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredNews = news.filter(item => {
    const matchesSearch = !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '实时'
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return '刚刚'
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    return `${days}天前`
  }

  const SOURCE_LABELS: Record<string, string> = {
    'cls': '财联社',
    'wallstreetcn': '华尔街见闻',
    'xueqiu': '雪球',
    'weibo': '微博',
    'zhihu': '知乎',
    'thepaper': '澎湃新闻',
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-editorial text-xl font-semibold text-foreground">实时新闻</h1>
            <p className="text-sm text-muted-foreground mt-1">AlphaEar 市场热点追踪</p>
          </div>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 rounded-none">
            <TrendingUp className="w-3 h-3 mr-1" />
            实时更新
          </Badge>
        </div>

        {/* Search */}
        <div className="p-4 mb-6 bg-surface-low">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索新闻..."
                className="pl-10 bg-surface rounded-none text-foreground"
              />
            </div>
          </div>
        </div>

        {/* News List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            加载中...
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            暂无新闻
          </div>
        ) : (
          <div className="space-y-1">
            {filteredNews.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-5 bg-surface-low hover:bg-surface-high transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs rounded-none text-muted-foreground/60">
                        {SOURCE_LABELS[item.source] || item.source}
                      </Badge>
                      <span className="text-xs text-muted-foreground/60">
                        #{item.rank}
                      </span>
                      <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(item.publish_time)}
                      </span>
                    </div>
                    <h3 className="text-base font-medium text-foreground mb-2 line-clamp-2">
                      {item.title}
                    </h3>
                    {item.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {item.content}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
                      <span>来源: {SOURCE_LABELS[item.source] || item.source}</span>
                    </div>
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-link transition-colors shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
