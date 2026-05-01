'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { useTheme } from 'next-themes'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Sun, Moon, Plus, Sparkles, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NAV_ITEMS } from '@/lib/constants'
import { LogoSerifTerminal } from '@/components/ui/LogoSerifTerminal'
import { UserMenu } from '@/components/auth/UserMenu'
import { GuestQuotaBadge } from '@/components/auth/GuestQuotaBadge'

interface IndexQuote {
  code?: string
  name: string
  value: string
  change: number
  isPercent: boolean
}

interface IndicesResponse {
  success: boolean
  indices: IndexQuote[]
}

const indicesFetcher = async (url: string): Promise<IndicesResponse> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('indices fetch failed')
  return res.json()
}

const HOT_SEARCHES = [
  { type: 'stock', text: '贵州茅台' },
  { type: 'stock', text: '宁德时代' },
  { type: 'intelligence', text: '半导体' },
  { type: 'stock', text: '比亚迪' },
  { type: 'intelligence', text: 'AI' },
]

interface SearchResult {
  type: 'intelligence' | 'stock' | 'news'
  id: string
  title: string
  description?: string
  url: string
  metadata?: Record<string, unknown>
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
    news: '新闻',
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
                      <div className="text-sm text-muted-foreground truncate mt-0.5">{result.description}</div>
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
                    onClick={() => {
                      onOpenChange(false)
                      router.push('/intelligence/create')
                    }}
                    className="flex items-center gap-2 p-3 bg-surface-low hover:bg-surface-high transition-colors"
                  >
                    <Plus className="h-4 w-4 text-secondary" />
                    <span className="text-sm">新建情报</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenChange(false)
                      router.push('/analyze')
                    }}
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

function formatChange(q: IndexQuote): string {
  const abs = Math.abs(q.change)
  const sign = q.change >= 0 ? '+' : ''
  if (q.isPercent) {
    return `${sign}${q.change.toFixed(2)}%`
  }
  return `${sign}${q.change.toFixed(abs < 0.5 ? 3 : 2)}`
}

function useClock(): string {
  const [time, setTime] = useState<string>('')
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      const ss = String(d.getSeconds()).padStart(2, '0')
      setTime(`${hh}:${mm}:${ss}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

const NAVY = '#001629'
const CREAM = '#e4e2dd'
const SAGE = '#6fa888'
const MAROON = '#c65d65'

export function TopBar() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const time = useClock()
  const { data: indicesData } = useSWR<IndicesResponse>('/api/market/indices', indicesFetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  })
  const indices: IndexQuote[] = indicesData?.success ? indicesData.indices : []

  useEffect(() => setMounted(true), [])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    const hrefPath = href.split('?')[0]
    return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`)
  }

  return (
    <header
      className="shrink-0 flex items-center"
      style={{
        height: 56,
        background: NAVY,
        color: CREAM,
        borderBottom: '1px solid rgba(0,22,41,0.10)',
      }}
    >
      {/* Logo + Nav */}
      <div className="flex items-center" style={{ padding: '0 24px', gap: 28 }}>
        <Link href="/" className="flex items-center">
          <LogoSerifTerminal size={18} color={CREAM} />
        </Link>
        <nav className="flex items-center" style={{ fontSize: 12 }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors"
                style={{
                  padding: '6px 14px',
                  color: active ? CREAM : 'rgba(228,226,221,0.7)',
                  fontWeight: active ? 500 : 400,
                  background: active ? 'rgba(228,226,221,0.12)' : 'transparent',
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Index ticker — flat row, no scroll */}
      <div
        className="flex-1 overflow-hidden flex"
        style={{
          fontSize: 11,
          gap: 24,
          padding: '0 16px',
          whiteSpace: 'nowrap',
          color: 'rgba(228,226,221,0.85)',
        }}
      >
        {indices.length === 0 ? (
          <span style={{ opacity: 0.45, fontSize: 11 }} className="font-mono-data">
            行情加载中…
          </span>
        ) : (
          indices.map((q) => (
            <span key={q.code ?? q.name} className="font-mono-data">
              <span style={{ opacity: 0.6 }}>{q.name}</span>{' '}
              {q.value}{' '}
              <span style={{ color: q.change >= 0 ? SAGE : MAROON }}>{formatChange(q)}</span>
            </span>
          ))
        )}
      </div>

      {/* Right: clock + actions */}
      <div className="flex items-center" style={{ padding: '0 16px', gap: 8 }}>
        <span
          className="font-mono-data"
          style={{ fontSize: 11, color: 'rgba(228,226,221,0.6)', marginRight: 8 }}
        >
          {time || '--:--:--'} · 沪深 实时
        </span>

        <button
          onClick={() => setSearchOpen(true)}
          className="transition-colors"
          style={{
            padding: '6px 8px',
            color: 'rgba(228,226,221,0.7)',
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
          }}
          aria-label="搜索"
        >
          <Search className="h-4 w-4" />
        </button>

        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="transition-colors"
            style={{
              padding: '6px 8px',
              color: 'rgba(228,226,221,0.7)',
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
            }}
            aria-label="切换主题"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}

        <GuestQuotaBadge />
        <UserMenu />
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}
