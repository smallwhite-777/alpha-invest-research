'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { IntelligenceList } from '@/components/intelligence/IntelligenceList'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, FileText, Settings, TrendingUp, Users, BookOpen, Newspaper, MessageSquare, Factory, ChevronDown, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { INTELLIGENCE_CATEGORIES, SW_SECTORS } from '@/lib/constants'

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  INDUSTRY_TRACK: TrendingUp,
  POLICY_RUMOR: Settings,
  MEETING_MINUTES: Users,
  RESEARCH_REPORT: BookOpen,
  GOSSIP: MessageSquare,
  NEWS: Newspaper,
}

const CATEGORY_COLORS: Record<string, string> = {
  INDUSTRY_TRACK: 'text-chart-1 bg-chart-1/10',
  POLICY_RUMOR: 'text-chart-2 bg-chart-2/10',
  MEETING_MINUTES: 'text-chart-3 bg-chart-3/10',
  RESEARCH_REPORT: 'text-chart-4 bg-chart-4/10',
  GOSSIP: 'text-chart-5 bg-chart-5/10',
  NEWS: 'text-muted-foreground bg-muted',
}

function IntelligenceContent() {
  const searchParams = useSearchParams()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSector, setSelectedSector] = useState<string | null>(null)
  const [sectorExpanded, setSectorExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category)
  }

  return (
    <div className="h-full flex">
      {/* 左侧：分类目录（知识库风格） */}
      <aside className="w-56 shrink-0 border-r border-border bg-card/50 p-4">
        <div className="mb-4">
          <Link href="/intelligence/create">
            <Button className="w-full bg-chart-1 text-white hover:bg-chart-1/90">
              <Plus className="h-4 w-4 mr-2" />
              新建情报
            </Button>
          </Link>
        </div>

        {/* 搜索框 */}
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索情报..."
            className="pl-8 bg-background border-border text-foreground h-8 text-sm"
          />
        </div>

        {/* 分类目录 */}
        <nav className="space-y-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
              selectedCategory === null
                ? 'bg-accent text-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            )}
          >
            <FileText className="h-4 w-4" />
            <span>全部情报</span>
          </button>

          {INTELLIGENCE_CATEGORIES.map(cat => {
            const Icon = CATEGORY_ICONS[cat.value] || FileText
            const colorClass = CATEGORY_COLORS[cat.value] || 'text-muted-foreground bg-muted'
            const isSelected = selectedCategory === cat.value

            return (
              <button
                key={cat.value}
                onClick={() => handleCategoryClick(cat.value)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                  isSelected
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                )}
              >
                <span className={cn('p-1 rounded', colorClass.split(' ')[1])}>
                  <Icon className={cn('h-3 w-3', colorClass.split(' ')[0])} />
                </span>
                <span>{cat.label}</span>
              </button>
            )
          })}
        </nav>

        {/* 行业筛选 */}
        <div className="mt-4 pt-4 border-t border-border">
          <button
            onClick={() => setSectorExpanded(!sectorExpanded)}
            className="w-full flex items-center justify-between text-xs text-muted-foreground mb-2 hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Factory className="h-3.5 w-3.5" />
              行业筛选
            </span>
            {sectorExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>

          {sectorExpanded && (
            <nav className="max-h-52 overflow-y-auto space-y-0.5">
              {SW_SECTORS.map(s => (
                <button
                  key={s.code}
                  onClick={() => setSelectedSector(selectedSector === s.code ? null : s.code)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-left transition-colors',
                    selectedSector === s.code
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  )}
                >
                  {s.name}
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* 知识库统计 */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">知识库统计</p>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>情报总数</span>
              <span className="text-foreground">30</span>
            </div>
            <div className="flex justify-between">
              <span>本月新增</span>
              <span className="text-chart-1">5</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 中间：情报列表 */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl">
          {/* 当前筛选状态 */}
          {(selectedCategory || selectedSector) && (
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              {selectedCategory && (
                <Badge variant="secondary" className="bg-chart-1/10 text-chart-1 gap-1">
                  {INTELLIGENCE_CATEGORIES.find(c => c.value === selectedCategory)?.label}
                  <button onClick={() => setSelectedCategory(null)}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {selectedSector && (
                <Badge variant="secondary" className="bg-chart-4/10 text-chart-4 gap-1">
                  {SW_SECTORS.find(s => s.code === selectedSector)?.name || selectedSector}
                  <button onClick={() => setSelectedSector(null)}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              <button
                onClick={() => { setSelectedCategory(null); setSelectedSector(null) }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                清除全部
              </button>
            </div>
          )}

          {/* 情报列表 */}
          <IntelligenceList
            category={selectedCategory || undefined}
            sector={selectedSector || undefined}
            search={searchQuery || undefined}
          />
        </div>
      </main>
    </div>
  )
}

export default function IntelligencePage() {
  return (
    <Suspense fallback={
      <div className="h-full flex">
        <aside className="w-56 shrink-0 border-r border-border bg-card/50 p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </main>
      </div>
    }>
      <IntelligenceContent />
    </Suspense>
  )
}