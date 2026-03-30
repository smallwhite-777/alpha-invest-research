'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Bell, Sun, Moon, Plus, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface StockTicker {
  code: string
  name: string
  price: number | null
  change: number | null
  change_pct: number | null
}

// 热门搜索词
const HOT_SEARCHES = [
  { type: 'stock', text: '贵州茅台', icon: '📈' },
  { type: 'stock', text: '宁德时代', icon: '📈' },
  { type: 'intelligence', text: '半导体', icon: '🔍' },
  { type: 'stock', text: '比亚迪', icon: '📈' },
  { type: 'intelligence', text: 'AI', icon: '🔍' },
]

function TickerItem({ stock }: { stock: StockTicker }) {
  if (stock.price === null) return null
  const isUp = stock.change_pct !== null && stock.change_pct >= 0

  return (
    <Link
      href={`/stock/${stock.code}`}
      className="inline-flex items-center gap-1.5 whitespace-nowrap px-4 text-sm hover:opacity-70 transition-opacity"
    >
      <span className="text-muted-foreground">{stock.name}</span>
      <span className="text-foreground font-medium tabular-nums">{stock.price.toFixed(2)}</span>
      <span className={cn('font-medium tabular-nums', isUp ? 'text-up' : 'text-down')}>
        {isUp && stock.change_pct !== null ? '+' : ''}{stock.change_pct?.toFixed(2) || '-'}%
      </span>
    </Link>
  )
}

interface SearchResult {
  type: 'intelligence' | 'stock' | 'news'
  id: string
  title: string
  description?: string
  url: string
  metadata?: Record<string, any>
}

function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Debounced search with real API
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=5`)
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.results || [])
        }
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

  const typeLabels: Record<string, string> = {
    intelligence: '情报',
    stock: '股票',
    news: '新闻'
  }

  const typeColors: Record<string, string> = {
    intelligence: 'bg-blue-500/20 text-blue-400',
    stock: 'bg-green-500/20 text-green-400',
    news: 'bg-orange-500/20 text-orange-400'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">搜索情报、股票、新闻</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* 搜索输入框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入股票代码、公司名称或关键词..."
              className="pl-10 bg-background border-border text-foreground"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* 搜索结果或热门搜索 */}
          {isSearching ? (
            <div className="py-8 text-center text-muted-foreground">
              搜索中...
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {searchResults.map((result, i) => (
                <button
                  key={`${result.type}-${result.id}-${i}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-accent text-left"
                >
                  <Search className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{result.title}</div>
                    {result.description && (
                      <div className="text-sm text-muted-foreground truncate mt-0.5">
                        {result.description}
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded shrink-0',
                    typeColors[result.type] || 'bg-muted text-muted-foreground'
                  )}>
                    {typeLabels[result.type] || result.type}
                  </span>
                </button>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="py-8 text-center text-muted-foreground">
              未找到相关结果
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">热门搜索</p>
              <div className="flex flex-wrap gap-2">
                {HOT_SEARCHES.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onOpenChange(false)
                      if (item.type === 'stock') {
                        router.push(`/stock?search=${encodeURIComponent(item.text)}`)
                      } else {
                        router.push(`/intelligence?search=${encodeURIComponent(item.text)}`)
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                  </button>
                ))}
              </div>

              {/* 快捷操作 */}
              <div className="pt-4 border-t border-border space-y-2">
                <p className="text-xs text-muted-foreground">快捷操作</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onOpenChange(false)
                      router.push('/intelligence/create')
                    }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-chart-1/10 hover:bg-chart-1/20 text-chart-1 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">新建情报</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenChange(false)
                      router.push('/analyze')
                    }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-chart-2/10 hover:bg-chart-2/20 text-chart-2 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm">AI分析</span>
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
  const pathname = usePathname()
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [stocks, setStocks] = useState<StockTicker[]>([])

  useEffect(() => setMounted(true), [])

  // Fetch hot stocks
  useEffect(() => {
    fetchStocks()
    const interval = setInterval(fetchStocks, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const fetchStocks = async () => {
    try {
      const res = await fetch('/api/stock/hot?count=15')
      const data = await res.json()
      if (data.stocks) {
        setStocks(data.stocks)
      }
    } catch (error) {
      console.error('Failed to fetch stocks:', error)
    }
  }

  return (
    <div className="flex h-12 items-center border-b border-border bg-card/80 backdrop-blur-sm">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 px-5 shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          A
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">ALPHA.</span>
      </Link>

      {/* Scrolling ticker */}
      <div className="flex-1 overflow-hidden border-l border-border ml-1">
        <div className="animate-scroll-left flex items-center">
          {[...stocks, ...stocks].map((stock, i) => (
            <TickerItem key={`${stock.code}-${i}`} stock={stock} />
          ))}
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 border-l border-border px-3">
        {/* 搜索按钮 */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">搜索</span>
        </button>

        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={theme === 'dark' ? '切换亮色' : '切换暗色'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}

        <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Bell className="h-4 w-4" />
        </button>
      </div>

      {/* 搜索弹窗 */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}