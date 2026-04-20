'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, Moon, Plus, Search, Sparkles, Sun, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface StockTicker {
  code: string
  name: string
  price: number | null
  change: number | null
  change_pct: number | null
}

interface SearchResult {
  type: 'intelligence' | 'stock' | 'news'
  id: string
  title: string
  description?: string
  url: string
}

const HOT_SEARCHES = [
  { type: 'stock', text: '贵州茅台', icon: '股' },
  { type: 'stock', text: '宁德时代', icon: '股' },
  { type: 'intelligence', text: '半导体', icon: '研' },
  { type: 'stock', text: '比亚迪', icon: '股' },
  { type: 'intelligence', text: 'AI', icon: '研' },
] as const

function TickerItem({ stock }: { stock: StockTicker }) {
  if (stock.price === null) return null

  const isUp = (stock.change_pct ?? 0) >= 0

  return (
    <Link
      href={`/stock/${stock.code}`}
      className="inline-flex h-full items-center gap-1.5 whitespace-nowrap px-4 text-sm transition-opacity hover:opacity-70"
    >
      <span className="font-medium text-foreground/90">{stock.name}</span>
      <span className="tabular-nums text-foreground">{stock.price.toFixed(2)}</span>
      <span className={cn('tabular-nums font-medium', isUp ? 'text-up' : 'text-down')}>
        {isUp ? '+' : ''}
        {(stock.change_pct ?? 0).toFixed(2)}%
      </span>
    </Link>
  )
}

function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=5`)
        if (!response.ok) return
        const data = await response.json()
        setSearchResults(data.results || [])
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleResultClick = (result: SearchResult) => {
    onOpenChange(false)
    setSearchQuery('')
    router.push(result.url)
  }

  const typeLabels: Record<SearchResult['type'], string> = {
    intelligence: '情报',
    stock: '股票',
    news: '新闻',
  }

  const typeColors: Record<SearchResult['type'], string> = {
    intelligence: 'bg-blue-500/20 text-blue-400',
    stock: 'bg-green-500/20 text-green-400',
    news: 'bg-orange-500/20 text-orange-400',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">搜索情报、股票和新闻</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入股票代码、公司名称或关键词..."
              className="border-border bg-background pl-10 text-foreground"
              autoFocus
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="清空搜索"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {isSearching ? (
            <div className="py-8 text-center text-muted-foreground">搜索中...</div>
          ) : searchResults.length > 0 ? (
            <div className="max-h-[400px] space-y-2 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}-${index}`}
                  onClick={() => handleResultClick(result)}
                  className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-accent"
                >
                  <Search className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">{result.title}</div>
                    {result.description ? (
                      <div className="mt-0.5 truncate text-sm text-muted-foreground">
                        {result.description}
                      </div>
                    ) : null}
                  </div>
                  <span className={cn('shrink-0 rounded px-2 py-0.5 text-xs', typeColors[result.type])}>
                    {typeLabels[result.type]}
                  </span>
                </button>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="py-8 text-center text-muted-foreground">未找到相关结果</div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">热门搜索</p>
              <div className="flex flex-wrap gap-2">
                {HOT_SEARCHES.map((item, index) => (
                  <button
                    key={`${item.type}-${item.text}-${index}`}
                    onClick={() => {
                      onOpenChange(false)
                      if (item.type === 'stock') {
                        router.push(`/stock?search=${encodeURIComponent(item.text)}`)
                      } else {
                        router.push(`/intelligence?search=${encodeURIComponent(item.text)}`)
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">快捷操作</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onOpenChange(false)
                      router.push('/intelligence/create')
                    }}
                    className="flex items-center gap-2 rounded-lg bg-chart-1/10 p-3 text-chart-1 transition-colors hover:bg-chart-1/20"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">新建情报</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenChange(false)
                      router.push('/analyze')
                    }}
                    className="flex items-center gap-2 rounded-lg bg-chart-2/10 p-3 text-chart-2 transition-colors hover:bg-chart-2/20"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm">AI 分析</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function TopBar() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [stocks, setStocks] = useState<StockTicker[]>([])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMounted(true)
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const res = await fetch('/api/stock/hot?count=12')
        const data = await res.json()
        if (Array.isArray(data.stocks)) {
          setStocks(
            data.stocks.filter((stock: StockTicker) => stock.price !== null && stock.price !== undefined)
          )
        }
      } catch (error) {
        console.error('Failed to fetch stocks:', error)
      }
    }

    fetchStocks()
    const interval = setInterval(fetchStocks, 60000)
    return () => clearInterval(interval)
  }, [])

  const loopedStocks = useMemo(
    () => (stocks.length > 0 ? [...stocks, ...stocks] : []),
    [stocks]
  )

  return (
    <>
      <div className="flex h-16 min-h-16 items-stretch border-b border-border bg-card/90 backdrop-blur-sm">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 px-6 py-2"
          aria-label="OpenInvest 首页"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
            O
          </div>
          <div className="flex flex-col justify-center leading-none">
            <span className="translate-y-[1px] text-[14px] font-semibold tracking-[0.24em] text-foreground">
              OPENINVEST
            </span>
            <span className="mt-1.5 text-[10px] tracking-[0.18em] text-muted-foreground">
              INVESTMENT INTELLIGENCE
            </span>
          </div>
        </Link>

        <div className="min-w-0 flex flex-1 items-center border-l border-border">
          <div className="flex h-full min-w-0 flex-1 items-center overflow-hidden">
            {loopedStocks.length > 0 ? (
              <div className="animate-scroll-left flex h-full items-center py-1">
                {loopedStocks.map((stock, index) => (
                  <TickerItem key={`${stock.code}-${index}`} stock={stock} />
                ))}
              </div>
            ) : (
              <div className="px-4 text-sm text-muted-foreground">行情加载中...</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 border-l border-border px-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">搜索</span>
          </button>

          {mounted ? (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={theme === 'dark' ? '切换亮色' : '切换暗色'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          ) : null}

          <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
