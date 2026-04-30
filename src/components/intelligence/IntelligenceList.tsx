'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { INTELLIGENCE_CATEGORIES, IMPORTANCE_LEVELS } from '@/lib/constants'
import type { Intelligence } from '@/types/intelligence'

type IntelligenceTagLike = string | { tag?: { id?: string; name?: string }; name?: string }
type IntelligenceStockLike = { stockSymbol?: string; symbol?: string; stockName?: string; name?: string }

interface IntelligenceListProps {
  category?: string
  sector?: string
  importance?: number
  search?: string
  recentDays?: number
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function IntelligenceList({ category, sector, importance, search, recentDays }: IntelligenceListProps) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (sector) params.set('sector', sector)
  if (importance) params.set('importance', importance.toString())
  if (search) params.set('search', search)
  if (recentDays) params.set('recent_days', recentDays.toString())
  params.set('limit', '20')

  const { data, error, isLoading } = useSWR(`/api/intelligence?${params.toString()}`, fetcher)

  if (isLoading) {
    return (
      <div className="space-y-0">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-5 bg-surface-low animate-pulse">
            <div className="h-4 bg-surface-high w-3/4 mb-2" />
            <div className="h-3 bg-surface-high w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="text-down text-sm py-8">加载失败</div>
  }

  if (!data?.items?.length) {
    return (
      <div className="text-center py-16 text-secondary">
        暂无情报数据
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {data.items.map((item: Intelligence, idx: number) => (
        <IntelligenceCard key={item.id} intelligence={item} index={idx} />
      ))}
    </div>
  )
}

function IntelligenceCard({ intelligence, index }: { intelligence: Intelligence; index: number }) {
  const categoryInfo = INTELLIGENCE_CATEGORIES.find(c => c.value === intelligence.category)
  const importanceInfo = IMPORTANCE_LEVELS.find(l => l.value === intelligence.importance)
  const isEven = index % 2 === 0
  const isExclusive = (intelligence as Intelligence & { isExclusive?: boolean }).isExclusive === true

  return (
    <Link href={`/intelligence/${intelligence.id}`}>
      <div className={`p-5 transition-colors cursor-pointer ${isEven ? 'bg-surface-low' : 'bg-surface'} hover:bg-surface-high`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-secondary bg-surface-high px-2 py-0.5">
              {categoryInfo?.label || intelligence.category}
            </span>
            {importanceInfo && intelligence.importance >= 4 && (
              <span className="text-[10px] uppercase tracking-wider text-down bg-surface-high px-2 py-0.5">
                {importanceInfo.label}
              </span>
            )}
            {isExclusive && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5" style={{ background: '#6fa888', color: '#001629' }}>
                <Lock className="h-2.5 w-2.5" />
                独家
              </span>
            )}
          </div>
          <span className="text-[11px] text-secondary">
            {formatDistanceToNow(new Date(intelligence.createdAt), { addSuffix: true, locale: zhCN })}
          </span>
        </div>

        <h3 className="text-sm font-medium text-foreground mb-2 line-clamp-2">
          {intelligence.title}
        </h3>

        {intelligence.summary && (
          <p className="text-xs text-secondary mb-3 line-clamp-2 leading-relaxed">
            {intelligence.summary}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {intelligence.tags?.map((t: IntelligenceTagLike, idx: number) => {
            const tagName = typeof t === 'string' ? t : t?.tag?.name || t?.name || ''
            const tagId = typeof t === 'string' ? t : t?.tag?.id || idx
            return (
              <span key={tagId} className="text-[10px] text-secondary bg-surface-high px-2 py-0.5">
                {tagName}
              </span>
            )
          })}
        </div>

        {((intelligence as Intelligence & { stocks?: IntelligenceStockLike[] }).stocks?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(intelligence as Intelligence & { stocks?: IntelligenceStockLike[] }).stocks?.map((s: IntelligenceStockLike) => (
              <span key={s.stockSymbol || s.symbol} className="text-[10px] text-up bg-surface-high px-2 py-0.5">
                {s.stockName || s.name || s.symbol}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
