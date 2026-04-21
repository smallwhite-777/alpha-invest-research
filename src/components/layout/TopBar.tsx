'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Bell, Sun, Moon, Plus, Sparkles, X, Home, Shield, BarChart3, Globe, Newspaper, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NAV_ITEMS } from '@/lib/constants'
import { LogoFlower } from '@/components/ui/LogoFlower'
import { LogoWordmark } from '@/components/ui/LogoWordmark'

const ICON_MAP: Record<string, any> = {
  Home, Shield, BarChart3, Globe, Newspaper, FileText, Search,
}

interface StockTicker {
  code: string
  name: string
  price: number | null
  change: number | null
  change_pct: number | null
}

const HOT_SEARCHES = [
  { type: 'stock', text: '贵州茅台' },
  { type: 'stock', text: '宁德时代' },
  { type: 'intelligence', text: '半导体' },
  { type: 'stock', text: '比亚迪' },
  { type: 'intelligence', text: 'AI' },
]

function TickerItem({ stock }: { stock: StockTicker }) {
  if (stock.price === null) return null
  const isUp = stock.change_pct !== null && stock.change_pct >= 0

  return (
    <Link
      href={`/stock/${stock.code}`}
      className="inline-flex items-center gap-2 whitespace-nowrap px-4 text-sm hover:opacity-70 transition-opacity"
    >
      <span className="text-muted-foreground text-xs">{stock.name}</span>
      <span className="text-foreground font-medium tabular-nums">{stock.price.toFixed(2)}</span>
      <span className={cn('font-medium tabular-nums text-xs', isUp ? 'text-up' : 'text-down')}>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-surface-float shadow-ambient">
        <DialogHeader>
          <DialogTitle className="font-editorial text-foreground">搜索</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入股票代码、公司名称或关键词..."
              className="pl-8 border-b-2 border-input"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {isSearching ? (
            <div className="py-8 text-center text-muted-foreground text-sm">搜索中...</div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {searchResults.map((result, i) => (
                <button
                  key={`${result.type}-${result.id}-${i}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-start gap-3 p-3 hover:bg-surface-low text-left transition-colors"
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
                  <span className="text-xs px-2 py-0.5 bg-surface-high text-muted-foreground shrink-0">
                    {typeLabels[result.type] || result.type}
                  </span>
                </button>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="py-8 text-center text-muted-foreground text-sm">未找到相关结果</div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">热门搜索</p>
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
                      className="px-3 py-1.5 bg-surface-high text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      {item.text}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <p className="text-xs text-muted-foreground">快捷操作</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { onOpenChange(false); router.push('/intelligence/create') }}
                    className="flex items-center gap-2 p-3 bg-surface-low hover:bg-surface-high transition-colors"
                  >
                    <Plus className="h-4 w-4 text-secondary" />
                    <span className="text-sm">新建情报</span>
                  </button>
                  <button
                    onClick={() => { onOpenChange(false); router.push('/analyze') }}
                    className="flex items-center gap-2 p-3 bg-surface-low hover:bg-surface-high transition-colors"
                  >
                    <Sparkles className="h-4 w-4 text-secondary" />
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
  const [searchOpen, setSearchOpen] = useState(false)
  const [stocks, setStocks] = useState<StockTicker[]>([])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    fetchStocks()
    const interval = setInterval(fetchStocks, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchStocks = async () => {
    try {
      const res = await fetch('/api/stock/hot?count=15')
      const data = await res.json()
      if (data.stocks) setStocks(data.stocks)
    } catch (error) {
      console.error('Failed to fetch stocks:', error)
    }
  }

  return (
    <header className="bg-surface-low shrink-0">
      {/* Single row: Logo + Nav + Ticker + Actions */}
      <div className="flex h-12 items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 px-5 shrink-0">
          <LogoFlower className="w-6 h-6 shrink-0 text-foreground" />
          <LogoWordmark className="h-4 shrink-0 text-foreground" />
        </Link>

        {/* Navigation - inline with logo */}
        <nav className="flex items-center gap-0 shrink-0">
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon]
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-all duration-150',
                  isActive
                    ? 'text-foreground font-medium bg-surface-high'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/60'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Scrolling ticker */}
        <div className="flex-1 overflow-hidden bg-surface mx-2">
          <div className="animate-scroll-left flex items-center h-12">
            {[...stocks, ...stocks].map((stock, i) => (
              <TickerItem key={`${stock.code}-${i}`} stock={stock} />
            ))}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 px-4">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">搜索</span>
          </button>

          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          <button className="p-2 text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground">
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}
