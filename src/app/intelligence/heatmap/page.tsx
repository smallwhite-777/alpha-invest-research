'use client'

import useSWR from 'swr'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { SECTORS } from '@/lib/constants'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function HeatmapPage() {
  const { data: tags, error: tagsError } = useSWR('/api/intelligence/tags', fetcher)
  const { data: intelligence } = useSWR('/api/intelligence?limit=100', fetcher)

  // Calculate sector heatmap data
  const sectorData = SECTORS.map(sector => {
    const count = intelligence?.items?.filter((item: { sectors: { sectorCode: string }[] }) =>
      item.sectors?.some((s: { sectorCode: string }) => s.sectorCode === sector.code)
    ).length || 0
    return { ...sector, count }
  }).sort((a, b) => b.count - a.count)

  // Calculate tag cloud data with sizes
  const maxCount = tags?.[0]?.count || 1
  const minCount = tags?.[tags.length - 1]?.count || 1

  const getTagSize = (count: number) => {
    const normalized = (count - minCount) / (maxCount - minCount || 1)
    if (normalized > 0.8) return 'text-lg px-4 py-2'
    if (normalized > 0.6) return 'text-base px-3 py-1.5'
    if (normalized > 0.4) return 'text-sm px-3 py-1'
    return 'text-xs px-2 py-1'
  }

  return (
    <div className="h-full overflow-y-auto p-6">
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">情报热力图</h1>
        <p className="text-sm text-muted-foreground mt-1">标签云与行业热度分析</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Tag Cloud */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-sm font-medium text-foreground mb-4">标签云</h2>
          {tagsError ? (
            <p className="text-destructive">加载失败</p>
          ) : !tags ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 bg-muted rounded" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: { id: string; name: string; color?: string; count: number }) => (
                <Link
                  key={tag.id}
                  href={`/intelligence?tag=${encodeURIComponent(tag.name)}`}
                >
                  <Badge
                    variant="secondary"
                    className={`${getTagSize(tag.count)} bg-accent hover:bg-accent transition-all cursor-pointer`}
                    style={{
                      color: tag.color || '#888888',
                      borderColor: tag.color ? `${tag.color}40` : undefined,
                      borderWidth: tag.color ? '1px' : undefined,
                    }}
                  >
                    {tag.name}
                    <span className="ml-1 text-muted-foreground/60">({tag.count})</span>
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Sector Heatmap */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-sm font-medium text-foreground mb-4">行业热度</h2>
          {!intelligence ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 bg-muted rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sectorData.map((sector) => {
                const maxSectorCount = Math.max(...sectorData.map((s: { count: number }) => s.count))
                const percentage = maxSectorCount > 0 ? (sector.count / maxSectorCount) * 100 : 0

                return (
                  <Link
                    key={sector.code}
                    href={`/intelligence?sector=${sector.code}`}
                    className="block"
                  >
                    <div className="flex items-center gap-3 group cursor-pointer">
                      <div className="w-24 text-sm text-muted-foreground group-hover:text-foreground">
                        {sector.name}
                      </div>
                      <div className="flex-1 h-6 bg-accent rounded overflow-hidden">
                        <div
                          className="h-full rounded transition-all"
                          style={{
                            width: `${Math.max(percentage, 5)}%`,
                            backgroundColor: sector.color,
                            opacity: 0.6 + (percentage / 100) * 0.4,
                          }}
                        />
                      </div>
                      <div className="w-10 text-right text-sm text-muted-foreground">
                        {sector.count}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Timeline Heatmap */}
      <Card className="mt-6 p-6 bg-card border-border">
        <h2 className="text-sm font-medium text-foreground mb-4">情报时间分布</h2>
        {!intelligence ? (
          <div className="animate-pulse h-32 bg-muted rounded" />
        ) : (
          <TimelineHeatmap items={intelligence?.items || []} />
        )}
      </Card>
    </div>
    </div>
  )
}

function TimelineHeatmap({ items }: { items: Array<{ createdAt: string; category: string }> }) {
  // Group by date
  const dateMap = new Map<string, { count: number; categories: Record<string, number> }>()

  items.forEach(item => {
    const date = new Date(item.createdAt).toISOString().split('T')[0]
    if (!dateMap.has(date)) {
      dateMap.set(date, { count: 0, categories: {} })
    }
    const entry = dateMap.get(date)!
    entry.count++
    entry.categories[item.category] = (entry.categories[item.category] || 0) + 1
  })

  const sortedDates = Array.from(dateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30) // Last 30 days

  const maxCount = Math.max(...sortedDates.map(([, data]) => data.count), 1)

  const categoryColors: Record<string, string> = {
    INDUSTRY_TRACK: '#3b82f6',
    POLICY_RUMOR: '#f59e0b',
    MEETING_MINUTES: '#10b981',
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1 overflow-x-auto pb-2">
        {sortedDates.map(([date, data]) => {
          const intensity = data.count / maxCount
          const mainCategory = Object.entries(data.categories)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'INDUSTRY_TRACK'

          return (
            <div
              key={date}
              className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-xs"
              style={{
                backgroundColor: categoryColors[mainCategory] || '#3b82f6',
                opacity: 0.2 + intensity * 0.8,
              }}
              title={`${date}: ${data.count}条情报`}
            >
              {data.count > 1 && (
                <span className="text-white font-medium">{data.count}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: categoryColors.INDUSTRY_TRACK }} />
          产业链追踪
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: categoryColors.POLICY_RUMOR }} />
          政策传闻
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: categoryColors.MEETING_MINUTES }} />
          会议纪要
        </div>
      </div>
    </div>
  )
}
