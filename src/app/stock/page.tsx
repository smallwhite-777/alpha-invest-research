'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
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
      if (data.stocks) {
        setHotStocks(data.stocks)
      }
    } catch (error) {
      console.error('Failed to fetch hot stocks:', error)
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
          <h1 className="text-xl font-semibold text-foreground">股价数据</h1>
          <p className="text-sm text-muted-foreground mt-1">AlphaEar-Stock 实时行情查询</p>
        </div>

        {/* Search */}
        <Card className="p-4 mb-6 bg-card border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入股票代码或名称搜索..."
              className="pl-10 bg-background border-border text-foreground text-base"
              autoFocus
            />
          </div>

          {/* Search Results */}
          {(searchResults.length > 0 || searching) && (
            <div className="mt-3 border-t border-border pt-3">
              <div className="text-xs text-muted-foreground mb-2">
                {searching ? '搜索中...' : '搜索结果'}
              </div>
              {searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((stock) => (
                    <Link
                      key={stock.code}
                      href={`/stock/${stock.code}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-500">
                            {stock.code.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{stock.name}</div>
                          <div className="text-xs text-muted-foreground">{stock.code}</div>
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
        </Card>

        {/* Quick Access - Popular Stocks */}
        <Card className="p-5 bg-card border-border">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">热门股票</h3>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {hotStocks.slice(0, 12).map((stock) => (
                <Link
                  key={stock.code}
                  href={`/stock/${stock.code}`}
                  className="p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-foreground truncate">{stock.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{stock.code}</div>
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
        </Card>
      </div>
    </div>
  )
}