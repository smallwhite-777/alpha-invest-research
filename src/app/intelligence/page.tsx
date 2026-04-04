'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { IntelligenceList } from '@/components/intelligence/IntelligenceList'
import { Input } from '@/components/ui/input'
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
      {/* Sidebar · 分类导航 */}
      <aside className="w-56 shrink-0 bg-surface-low p-4">
        <div className="mb-6">
          <Link href="/intelligence/create">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-high hover:bg-surface-float text-foreground text-sm font-medium transition-colors">
              <Plus className="h-4 w-4" />
              新建情报
            </button>
          </Link>
        </div>

        {/* Search · 搜索 */}
        <div className="relative mb-6">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索情报..."
            className="pl-8 bg-surface text-foreground h-8 text-sm border-none"
          />
        </div>

        {/* Categories · 分类目录 */}
        <p className="text-[10px] uppercase tracking-widest text-secondary mb-2 px-3">分类</p>
        <nav className="space-y-0.5">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
              selectedCategory === null
                ? 'bg-surface-high text-foreground font-medium'
                : 'text-secondary hover:bg-surface-high hover:text-foreground'
            )}
          >
            <FileText className="h-4 w-4" />
            <span>全部情报</span>
          </button>

          {INTELLIGENCE_CATEGORIES.map(cat => {
            const Icon = CATEGORY_ICONS[cat.value] || FileText
            const isSelected = selectedCategory === cat.value

            return (
              <button
                key={cat.value}
                onClick={() => handleCategoryClick(cat.value)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                  isSelected
                    ? 'bg-surface-high text-foreground font-medium'
                    : 'text-secondary hover:bg-surface-high hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Sector Filter · 行业筛选 */}
        <div className="mt-6 pt-4">
          <button
            onClick={() => setSectorExpanded(!sectorExpanded)}
            className="w-full flex items-center justify-between text-[10px] uppercase tracking-widest text-secondary mb-2 px-3 hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Factory className="h-3.5 w-3.5" />
              行业
            </span>
            {sectorExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>

          {sectorExpanded && (
            <nav className="max-h-52 overflow-y-auto space-y-0">
              {SW_SECTORS.map((s, idx) => (
                <button
                  key={s.code}
                  onClick={() => setSelectedSector(selectedSector === s.code ? null : s.code)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors',
                    idx % 2 === 0 ? 'bg-surface-low' : 'bg-surface',
                    selectedSector === s.code
                      ? 'bg-surface-high text-foreground font-medium'
                      : 'text-secondary hover:bg-surface-high hover:text-foreground'
                  )}
                >
                  {s.name}
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* Stats · 知识库统计 */}
        <div className="mt-6 pt-4">
          <p className="text-[10px] uppercase tracking-widest text-secondary mb-3 px-3">统计</p>
          <div className="space-y-2 text-xs text-secondary px-3">
            <div className="flex justify-between">
              <span>总条目</span>
              <span className="text-foreground">30</span>
            </div>
            <div className="flex justify-between">
              <span>本月新增</span>
              <span className="text-up">5</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main · 情报列表 */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl">
          {/* Page heading */}
          <h1 className="font-editorial text-2xl text-foreground mb-1">情报中心</h1>
          <p className="text-sm text-secondary mb-8">来自一线的情报汇总</p>

          {/* Active filters · 当前筛选 */}
          {(selectedCategory || selectedSector) && (
            <div className="mb-6 flex items-center gap-2 flex-wrap">
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-high text-foreground text-xs">
                  {INTELLIGENCE_CATEGORIES.find(c => c.value === selectedCategory)?.label}
                  <button onClick={() => setSelectedCategory(null)}><X className="h-3 w-3 text-secondary hover:text-foreground" /></button>
                </span>
              )}
              {selectedSector && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-high text-foreground text-xs">
                  {SW_SECTORS.find(s => s.code === selectedSector)?.name || selectedSector}
                  <button onClick={() => setSelectedSector(null)}><X className="h-3 w-3 text-secondary hover:text-foreground" /></button>
                </span>
              )}
              <button
                onClick={() => { setSelectedCategory(null); setSelectedSector(null) }}
                className="text-xs text-secondary hover:text-foreground transition-colors"
              >
                清除
              </button>
            </div>
          )}

          {/* Intelligence list */}
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
        <aside className="w-56 shrink-0 bg-surface-low p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-surface-high" />
            <div className="h-20 bg-surface-high" />
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-surface-high w-1/3" />
            <div className="h-64 bg-surface-high" />
          </div>
        </main>
      </div>
    }>
      <IntelligenceContent />
    </Suspense>
  )
}
