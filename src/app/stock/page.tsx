'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Search, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'

interface HotStock {
  code: string
  name: string
  price: number | null
  change: number | null
  change_pct: number | null
}

interface SearchResult {
  code: string
  name: string
}

export default function StockPage() {
  const [hotStocks, setHotStocks] = useState<HotStock[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  // Fetch hot stocks
  useEffect(() => {
    fetchHotStocks()
  }, [])

  const fetchHotStocks = async () => {
    try {
      const res = await fetch('/api/stock/hot?count=20')
      const data = await res.json()
      if (Array.isArray(data?.stocks) && data.stocks.length > 0) {
        setHotStocks(data.stocks)
        setFetchError(null)
      } else {
        setFetchError(data?.error || '行情数据源暂时不可用')
      }
    } catch (error) {
      console.error('Failed to fetch hot stocks:', error)
      setFetchError('行情数据源暂时不可用')
    } finally {
      setLoading(false)
    }
  }

  // Debounced search
  const searchStocks = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const res = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}&limit=10`)
      const data = await res.json()
      if (data.results) {
        setSearchResults(data.results)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearching(false)
    }
  }, [])

  // Trigger search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchStocks(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, searchStocks])

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-editorial text-xl tracking-tight text-foreground">
            股价数据
            <span className="block text-sm font-sans text-muted-foreground mt-0.5">
              实时行情查询
            </span>
          </h1>
        </div>

        {/* Search */}
        <div className="bg-surface-low p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入股票代码或名称..."
              className="pl-10 bg-background !rounded-none text-foreground text-base !border-0 focus-visible:ring-0"
              autoFocus
            />
          </div>

          {/* Search Results */}
          {(searchResults.length > 0 || searching) && (
            <div className="mt-3 pt-3 bg-surface-float">
              <div className="text-xs text-muted-foreground mb-2 px-3">
                {searching ? '搜索中...' : '搜索结果'}
              </div>
              {searchResults.length > 0 ? (
                <div>
                  {searchResults.map((stock, idx) => (
                    <Link
                      key={stock.code}
                      href={`/stock/${stock.code}`}
                      className={`flex items-center justify-between p-3 hover:bg-surface-high transition-colors ${
                        idx % 2 === 0 ? 'bg-surface-float' : 'bg-surface-low'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-500">
                            {stock.code.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{stock.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{stock.code}</div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              ) : searching ? (
                <div className="text-center py-4 text-muted-foreground">加载中...</div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">未找到相关股票</div>
              )}
            </div>
          )}
        </div>

        {/* Quick Access - Popular Stocks */}
        <div className="bg-surface-low p-5">
          <h3 className="font-editorial text-sm tracking-tight text-muted-foreground mb-4">
            热门股票
          </h3>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : fetchError || hotStocks.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-sm text-muted-foreground mb-2">{fetchError || '暂无热门数据'}</div>
              <div className="text-xs text-muted-foreground/70">行情后端 (alpha-backend.open1nvest.com) 当前未连通，稍后再试</div>
              <button
                onClick={() => {
                  setLoading(true)
                  fetchHotStocks()
                }}
                className="mt-4 px-3 py-1.5 text-xs border border-input bg-background hover:bg-surface-high transition-colors"
              >
                重试
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-surface-high">
              {hotStocks.slice(0, 12).map((stock, idx) => (
                <Link
                  key={stock.code}
                  href={`/stock/${stock.code}`}
                  className={`p-3 hover:bg-surface-high transition-colors ${
                    idx % 2 === 0 ? 'bg-surface-low' : 'bg-surface-float'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-foreground truncate">{stock.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{stock.code}</div>
                  {stock.price !== null && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono text-sm">{stock.price.toFixed(2)}</span>
                      {stock.change_pct !== null && (
                        <span className={`text-xs font-medium flex items-center gap-0.5 ${
                          stock.change_pct >= 0 ? 'text-up' : 'text-down'
                        }`}>
                          {stock.change_pct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
