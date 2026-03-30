'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { INTELLIGENCE_CATEGORIES, IMPORTANCE_LEVELS } from '@/lib/constants'
import type { Intelligence } from '@/types/intelligence'

interface IntelligenceListProps {
  category?: string
  sector?: string
  importance?: number
  search?: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function IntelligenceList({ category, sector, importance, search }: IntelligenceListProps) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (sector) params.set('sector', sector)
  if (importance) params.set('importance', importance.toString())
  if (search) params.set('search', search)
  params.set('limit', '20')

  const { data, error, isLoading } = useSWR(`/api/intelligence?${params.toString()}`, fetcher)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-4 bg-card border-border animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="text-destructive">加载失败</div>
  }

  if (!data?.items?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground/60">
        暂无情报数据
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.items.map((item: Intelligence) => (
        <IntelligenceCard key={item.id} intelligence={item} />
      ))}
    </div>
  )
}

function IntelligenceCard({ intelligence }: { intelligence: Intelligence }) {
  const categoryInfo = INTELLIGENCE_CATEGORIES.find(c => c.value === intelligence.category)
  const importanceInfo = IMPORTANCE_LEVELS.find(l => l.value === intelligence.importance)

  return (
    <Link href={`/intelligence/${intelligence.id}`}>
      <Card className="p-4 bg-card border-border hover:border-border transition-colors cursor-pointer">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-border text-muted-foreground">
              {categoryInfo?.label || intelligence.category}
            </Badge>
            {importanceInfo && intelligence.importance >= 4 && (
              <Badge className="text-xs" style={{ backgroundColor: importanceInfo.color + '20', color: importanceInfo.color }}>
                {importanceInfo.label}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground/60">
            {formatDistanceToNow(new Date(intelligence.createdAt), { addSuffix: true, locale: zhCN })}
          </span>
        </div>

        <h3 className="text-sm font-medium text-foreground mb-2 line-clamp-2">
          {intelligence.title}
        </h3>

        {intelligence.summary && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {intelligence.summary}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {intelligence.tags?.map((t: any, idx: number) => {
            const tagName = typeof t === 'string' ? t : t?.tag?.name || t?.name || ''
            const tagId = typeof t === 'string' ? t : t?.tag?.id || idx
            return (
              <Badge key={tagId} variant="secondary" className="text-xs bg-accent text-muted-foreground">
                {tagName}
              </Badge>
            )
          })}
        </div>

        {(intelligence as any).stocks?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(intelligence as any).stocks.map((s: any) => (
              <Badge key={s.stockSymbol || s.symbol} className="text-xs bg-link/20 text-link">
                {s.stockName || s.name || s.symbol}
              </Badge>
            ))}
          </div>
        )}
      </Card>
    </Link>
  )
}