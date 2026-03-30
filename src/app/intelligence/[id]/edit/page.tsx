'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { INTELLIGENCE_CATEGORIES, IMPORTANCE_LEVELS, SW_SECTORS } from '@/lib/constants'
import { ArrowLeft, X, Plus, Loader2, AlertCircle } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function EditIntelligencePage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [initialized, setInitialized] = useState(false)

  // Form fields
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [summary, setSummary] = useState('')
  const [category, setCategory] = useState('')
  const [importance, setImportance] = useState('3')
  const [source, setSource] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [selectedSectors, setSelectedSectors] = useState<{ code: string; name: string }[]>([])
  const [stocks, setStocks] = useState<{ symbol: string; name: string }[]>([])
  const [tagInput, setTagInput] = useState('')
  const [stockInput, setStockInput] = useState('')

  const { data: intelligence, isLoading } = useSWR(`/api/intelligence/${id}`, fetcher)

  // Initialize form with existing data
  useEffect(() => {
    if (intelligence && !initialized) {
      setTitle(intelligence.title || '')
      setContent(intelligence.content || '')
      setSummary(intelligence.summary || '')
      setCategory(intelligence.category || '')
      setImportance(intelligence.importance?.toString() || '3')
      setSource(intelligence.source || '')
      setAuthorName(intelligence.authorName || '')
      setTags(intelligence.tags?.map((t: { tag: { name: string } }) => t.tag.name) || [])
      setSelectedSectors(
        intelligence.sectors?.map((s: { sectorCode: string; sectorName: string }) => ({
          code: s.sectorCode,
          name: s.sectorName,
        })) || []
      )
      setStocks(
        intelligence.stocks?.map((s: { stockSymbol: string; stockName: string }) => ({
          symbol: s.stockSymbol,
          name: s.stockName,
        })) || []
      )
      setInitialized(true)
    }
  }, [intelligence, initialized])

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleAddStock = () => {
    const parts = stockInput.trim().split(/[\s,]+/)
    if (parts.length >= 1 && parts[0]) {
      const symbol = parts[0]
      const name = parts[1] || symbol
      if (!stocks.find(s => s.symbol === symbol)) {
        setStocks([...stocks, { symbol, name }])
        setStockInput('')
      }
    }
  }

  const toggleSector = (sector: { code: string; name: string }) => {
    if (selectedSectors.find(s => s.code === sector.code)) {
      setSelectedSectors(selectedSectors.filter(s => s.code !== sector.code))
    } else {
      setSelectedSectors([...selectedSectors, sector])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) {
      setError('标题不能为空')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/intelligence/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          summary: summary || undefined,
          category: category || 'NEWS',
          importance: parseInt(importance) || 3,
          source: source || undefined,
          authorName: authorName || '匿名',
          tags,
          sectors: selectedSectors,
          stocks,
        }),
      })

      if (response.ok) {
        router.push(`/intelligence/${id}`)
      } else {
        const err = await response.json().catch(() => ({}))
        setError(err.error || '更新失败')
      }
    } catch {
      setError('更新失败，请检查网络')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-card rounded w-1/3" />
            <div className="h-64 bg-card rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!intelligence) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl text-center py-12">
          <p className="text-destructive">情报不存在</p>
          <Button variant="outline" className="mt-4 border-border" onClick={() => router.push('/intelligence')}>
            返回列表
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/intelligence/${id}`}>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回详情
            </Button>
          </Link>
          <h1 className="text-xl font-semibold text-foreground">编辑情报</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              {/* 标题 */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground">标题 *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>

              {/* 正文 */}
              <div className="space-y-2">
                <Label htmlFor="content" className="text-foreground">正文内容</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="bg-background border-border text-foreground min-h-[200px]"
                />
              </div>

              {/* 摘要 */}
              <div className="space-y-2">
                <Label htmlFor="summary" className="text-foreground">摘要</Label>
                <Textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="bg-background border-border text-foreground min-h-[80px]"
                />
              </div>

              {/* 分类和重要程度 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">分类</Label>
                  <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue placeholder="选择分类" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {INTELLIGENCE_CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value} className="text-foreground">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">重要程度</Label>
                  <Select value={importance} onValueChange={(v) => v && setImportance(v)}>
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue placeholder="选择重要程度" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {IMPORTANCE_LEVELS.map(l => (
                        <SelectItem key={l.value} value={l.value.toString()} className="text-foreground">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                            {l.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 关联行业 */}
              <div className="space-y-2">
                <Label className="text-foreground">关联行业（申万一级）</Label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {SW_SECTORS.map(sector => (
                    <Badge
                      key={sector.code}
                      variant={selectedSectors.find(s => s.code === sector.code) ? 'default' : 'outline'}
                      className={`cursor-pointer text-xs ${
                        selectedSectors.find(s => s.code === sector.code)
                          ? 'bg-chart-1 text-white'
                          : 'border-border text-muted-foreground hover:border-chart-1'
                      }`}
                      onClick={() => toggleSector(sector)}
                    >
                      {sector.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 标签 */}
              <div className="space-y-2">
                <Label className="text-foreground">标签</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="输入标签，按回车添加"
                    className="bg-background border-border text-foreground"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag} className="border-border">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-chart-3/20 text-chart-3">
                      {tag}
                      <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setTags(tags.filter(t => t !== tag))} />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 关联标的 */}
              <div className="space-y-2">
                <Label className="text-foreground">关联标的</Label>
                <div className="flex gap-2">
                  <Input
                    value={stockInput}
                    onChange={(e) => setStockInput(e.target.value)}
                    placeholder="输入代码和名称，如：600519 贵州茅台"
                    className="bg-background border-border text-foreground"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStock())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddStock} className="border-border">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stocks.map(stock => (
                    <Badge key={stock.symbol} className="bg-chart-2/20 text-chart-2">
                      {stock.name} ({stock.symbol})
                      <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setStocks(stocks.filter(s => s.symbol !== stock.symbol))} />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 来源和录入人 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source" className="text-foreground">信息来源</Label>
                  <Input
                    id="source"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="如：专家访谈、产业链调研"
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author" className="text-foreground">录入人</Label>
                  <Input
                    id="author"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="您的姓名"
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={isSubmitting || !title}
              className="bg-chart-1 text-white hover:bg-chart-1/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : '保存修改'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/intelligence/${id}`)}
              className="border-border text-muted-foreground"
            >
              取消
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
