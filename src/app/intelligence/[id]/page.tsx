'use client'

import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { INTELLIGENCE_CATEGORIES, IMPORTANCE_LEVELS, SW_SECTORS } from '@/lib/constants'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ArrowLeft, Edit, Trash2, FileText, Download } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import useSWR from 'swr'

interface PageProps {
  params: Promise<{ id: string }>
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

// Get color for SW_SECTOR by code (deterministic)
const getSectorColor = (code: string) => {
  const colors = ['#3b82f6', '#00d4aa', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316']
  const index = code.charCodeAt(code.length - 1) % 10
  return colors[index]
}

export default function IntelligenceDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()

  const { data: intelligence, error, isLoading } = useSWR(
    `/api/intelligence/${id}`,
    fetcher
  )

  const { data: relatedData } = useSWR(
    intelligence?.stocks?.[0]?.stockSymbol
      ? `/api/intelligence?sector=${intelligence.sectors?.[0]?.sectorCode}&limit=5`
      : null,
    fetcher
  )

  const handleDelete = async () => {
    if (!confirm('确定要删除这条情报吗？')) return

    try {
      const response = await fetch(`/api/intelligence/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/intelligence')
      } else {
        alert('删除失败')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      alert('删除失败')
    }
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-card rounded w-1/2" />
          <div className="h-4 bg-card rounded w-1/4" />
          <div className="h-32 bg-card rounded" />
        </div>
      </div>
      </div>
    )
  }

  if (error || !intelligence) {
    return (
      <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl text-center py-12">
        <p className="text-destructive">加载失败</p>
        <Button
          variant="outline"
          className="mt-4 border-border"
          onClick={() => router.push('/intelligence')}
        >
          返回列表
        </Button>
      </div>
      </div>
    )
  }

  const categoryInfo = INTELLIGENCE_CATEGORIES.find(c => c.value === intelligence.category)
  const importanceInfo = IMPORTANCE_LEVELS.find(l => l.value === intelligence.importance)

  return (
    <div className="h-full overflow-y-auto p-6">
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/intelligence">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回
            </Button>
          </Link>
        </div>
        <div className="flex gap-2">
          <Link href={`/intelligence/${id}/edit`}>
            <Button variant="outline" size="sm" className="border-border">
              <Edit className="h-4 w-4 mr-1" />
              编辑
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="border-border text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            删除
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          <Card className="p-6 bg-card border-border">
            {/* Meta */}
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="border-border text-muted-foreground">
                {categoryInfo?.label || intelligence.category}
              </Badge>
              {importanceInfo && intelligence.importance >= 4 && (
                <Badge style={{ backgroundColor: importanceInfo.color + '20', color: importanceInfo.color }}>
                  {importanceInfo.label}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground/60">
                {formatDistanceToNow(new Date(intelligence.createdAt), { addSuffix: true, locale: zhCN })}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-xl font-semibold text-foreground mb-4">
              {intelligence.title}
            </h1>

            {/* Tags */}
            {intelligence.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {intelligence.tags.map((t: { tag: { id: string; name: string } }) => (
                  <Badge key={t.tag.id} variant="secondary" className="bg-accent text-muted-foreground">
                    {t.tag.name}
                  </Badge>
                ))}
              </div>
            )}

            <Separator className="my-4 bg-muted" />

            {/* Summary */}
            {intelligence.summary && (
              <div className="mb-6 p-4 bg-accent/50 rounded-lg">
                <p className="text-sm text-muted-foreground italic">
                  {intelligence.summary}
                </p>
              </div>
            )}

            {/* Content */}
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {intelligence.content}
              </ReactMarkdown>
            </div>

            {/* Attachments */}
            {intelligence.attachments?.length > 0 && (
              <>
                <Separator className="my-4 bg-muted" />
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">附件</h3>
                  <div className="space-y-2">
                    {intelligence.attachments.map((a: { id: string; fileName: string; fileUrl: string; fileType: string; fileSize: number }) => (
                      <a
                        key={a.id}
                        href={a.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-accent rounded-lg hover:bg-accent/80 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-4 w-4 text-chart-1 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate">{a.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {a.fileSize < 1024 * 1024
                                ? `${(a.fileSize / 1024).toFixed(1)} KB`
                                : `${(a.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                            </p>
                          </div>
                        </div>
                        <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator className="my-4 bg-muted" />

            {/* Footer */}
            <div className="flex items-center justify-between text-sm text-muted-foreground/60">
              <div>
                来源: {intelligence.source || '未标注'} | 录入: {intelligence.authorName}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Sectors */}
          {intelligence.sectors?.length > 0 && (
            <Card className="p-4 bg-card border-border">
              <h3 className="text-sm font-medium text-foreground mb-3">关联行业</h3>
              <div className="flex flex-col gap-2">
                {intelligence.sectors.map((s: { sectorCode: string; sectorName: string }) => {
                  const sectorColor = getSectorColor(s.sectorCode)
                  return (
                    <Badge
                      key={s.sectorCode}
                      className="justify-start"
                      style={{
                        backgroundColor: sectorColor + '20',
                        color: sectorColor,
                      }}
                    >
                      {s.sectorName}
                    </Badge>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Stocks */}
          {intelligence.stocks?.length > 0 && (
            <Card className="p-4 bg-card border-border">
              <h3 className="text-sm font-medium text-foreground mb-3">关联标的</h3>
              <div className="flex flex-col gap-2">
                {intelligence.stocks.map((s: { stockSymbol: string; stockName: string }) => (
                  <Link
                    key={s.stockSymbol}
                    href={`/stock/${s.stockSymbol}`}
                    className="flex items-center justify-between p-2 rounded bg-accent hover:bg-accent transition-colors"
                  >
                    <span className="text-sm text-foreground">{s.stockName}</span>
                    <span className="text-xs text-link">{s.stockSymbol}</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Related Intelligence */}
          {relatedData?.items?.filter((item: { id: string }) => item.id !== id).length > 0 && (
            <Card className="p-4 bg-card border-border">
              <h3 className="text-sm font-medium text-foreground mb-3">相关情报</h3>
              <div className="space-y-3">
                {relatedData.items
                  .filter((item: { id: string }) => item.id !== id)
                  .slice(0, 3)
                  .map((item: { id: string; title: string; createdAt: string }) => (
                    <Link
                      key={item.id}
                      href={`/intelligence/${item.id}`}
                      className="block"
                    >
                      <p className="text-sm text-muted-foreground hover:text-foreground line-clamp-2">
                        {item.title}
                      </p>
                      <span className="text-xs text-muted-foreground/60">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: zhCN })}
                      </span>
                    </Link>
                  ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
    </div>
  )
}
