'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'

interface Source {
  display: string
  company_name: string
  stock_code: string
  broker: string
  date: string
  type: string
}

interface Step {
  name: string
  status: string
  duration_ms?: number
  error?: string
}

interface QueryResult {
  status: 'completed' | 'failed'
  result?: {
    content: string
    sources: Source[]
    metadata: Record<string, unknown>
    format?: string
  }
  steps?: Step[]
  total_duration_ms?: number
  error?: string
}

// Comprehensive Markdown to HTML converter with beautiful styling
function markdownToHtml(markdown: string): string {
  if (!markdown) return ''

  let html = markdown

  // Escape HTML first
  html = html.replace(/&/g, '&amp;')
  html = html.replace(/</g, '&lt;')
  html = html.replace(/>/g, '&gt;')

  // Tables - handle before other transformations
  html = html.replace(/^\|(.+)\|\s*$/gm, (match, content) => {
    const cells = content.split('|').map((c: string) => c.trim())
    return `<tr>${cells.map((c: string) => `<td class="border border-gray-300 px-3 py-2">${c}</td>`).join('')}</tr>`
  })
  html = html.replace(/(<tr>.*<\/tr>\s*)+/g, (match) => {
    return `<table class="min-w-full border-collapse border border-gray-300 my-4 text-sm"><tbody>${match}</tbody></table>`
  })

  // Headers with nice styling
  html = html.replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold text-gray-800 mt-5 mb-2">$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-800 mt-6 mb-3 pb-2 border-b border-gray-200">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b-2 border-blue-500">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-4">$1</h1>')

  // Bold and Italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 hover:underline" target="_blank" rel="noopener">$1</a>')

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-blue-400 bg-blue-50 pl-4 pr-3 py-2 my-3 text-gray-700 italic rounded-r">$1</blockquote>')

  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr class="my-6 border-t border-gray-300">')
  html = html.replace(/^\*\*\*+$/gm, '<hr class="my-6 border-t border-gray-300">')

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="ml-6 list-disc text-gray-700 my-1">$1</li>')

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-6 list-decimal text-gray-700 my-1">$1</li>')

  // Wrap consecutive list items
  html = html.replace(/(<li class="ml-6 list-disc[^>]*>.*?<\/li>\s*)+/g, (match) => `<ul class="my-3 space-y-1">${match}</ul>`)
  html = html.replace(/(<li class="ml-6 list-decimal[^>]*>.*?<\/li>\s*)+/g, (match) => `<ol class="my-3 space-y-1">${match}</ol>`)

  // Paragraphs - handle double newlines
  const parts = html.split('\n\n')
  html = parts.map(part => {
    part = part.trim()
    if (!part) return ''
    // Don't wrap if already a block element
    if (part.match(/^<(h[1-6]|ul|ol|table|blockquote|hr|div|p)/)) {
      return part
    }
    // Convert single newlines to <br>
    part = part.replace(/\n/g, '<br>')
    return `<p class="my-3 leading-relaxed text-gray-700">${part}</p>`
  }).join('\n')

  // Wrap in container with prose styling
  return `<div class="markdown-body prose prose-slate max-w-none text-gray-700">${html}</div>`
}

export default function ResearchPage() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [sidebarWidth, setSidebarWidth] = useState(50) // percentage
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle resize
  const handleMouseDown = useCallback(() => {
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const newWidth = ((containerRect.right - e.clientX) / containerRect.width) * 100
    setSidebarWidth(Math.min(Math.max(newWidth, 30), 70)) // Limit between 30% and 70%
  }, [isResizing])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || loading) return

    setLoading(true)
    setProgress('正在处理...')
    setResult(null)

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, provider: 'minimax' }),
      })

      const data: QueryResult = await response.json()
      setResult(data)

      if (data.status === 'completed') {
        setProgress(`完成 (${data.total_duration_ms?.toFixed(0)}ms)`)
      } else {
        setProgress(`失败: ${data.error}`)
      }
    } catch (error) {
      setResult({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Network error'
      })
      setProgress('网络错误')
    } finally {
      setLoading(false)
    }
  }, [query, loading])

  const htmlContent = useMemo(() => {
    if (result?.status === 'completed' && result.result?.content) {
      return markdownToHtml(result.result.content)
    }
    return ''
  }, [result])

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🎯 投研问答系统</h1>
            <p className="text-sm text-gray-500 mt-1">MiniMax M2.7 · 联网搜索 · 667家公司研报</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden" ref={containerRef}>
        {/* Left Panel - Query & Process */}
        <div
          className="flex flex-col bg-white border-r border-gray-200 overflow-hidden"
          style={{ width: result ? `${100 - sidebarWidth}%` : '100%' }}
        >
          {/* Query Input */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <form onSubmit={handleSubmit}>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="输入你的投研问题，例如：&#10;• 分析紫金矿业2025年的投资价值&#10;• 对比宁德时代和比亚迪的财务数据&#10;• 新能源行业未来发展趋势"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50 text-gray-800 placeholder-gray-400"
                rows={4}
                disabled={loading}
              />
              <div className="flex items-center justify-between mt-4">
                {progress && (
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    {loading && (
                      <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {progress}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="ml-auto px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow-md"
                >
                  {loading ? '分析中...' : '开始分析'}
                </button>
              </div>
            </form>
          </div>

          {/* Thinking Process - Scrollable */}
          <div className="flex-1 overflow-auto p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🧠</span> 思维链条
            </h3>

            {/* Steps */}
            {result?.steps && result.steps.length > 0 ? (
              <div className="space-y-3">
                {result.steps.map((step, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      step.status === 'completed' ? 'bg-green-50 border-green-200' :
                      step.status === 'running' ? 'bg-yellow-50 border-yellow-200' :
                      step.status === 'failed' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${
                          step.status === 'completed' ? 'bg-green-500' :
                          step.status === 'running' ? 'bg-yellow-500 animate-pulse' :
                          step.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                        }`} />
                        <span className="font-medium text-gray-800">{step.name}</span>
                      </div>
                      {step.duration_ms && (
                        <span className="text-sm text-gray-500">{step.duration_ms.toFixed(0)}ms</span>
                      )}
                    </div>
                    {step.status === 'completed' && (
                      <div className="mt-2 text-sm text-green-700 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        完成
                      </div>
                    )}
                    {step.error && (
                      <div className="mt-2 text-sm text-red-600">{step.error}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-center py-12">
                <div className="text-4xl mb-3">💭</div>
                <p>提交问题后将显示思维链条</p>
              </div>
            )}

            {/* Error */}
            {result?.status === 'failed' && (
              <div className="mt-6 bg-red-50 rounded-xl p-6 border border-red-200">
                <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <span>⚠️</span> 处理失败
                </h3>
                <p className="text-red-600">{result.error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Analysis Result */}
        {result && result.status === 'completed' && (
          <>
            {/* Resizer */}
            <div
              className={`w-2 bg-gray-200 hover:bg-blue-400 cursor-col-resize flex-shrink-0 transition-colors ${isResizing ? 'bg-blue-400' : ''}`}
              onMouseDown={handleMouseDown}
            />

            {/* Sidebar */}
            <div
              ref={sidebarRef}
              className="bg-white flex flex-col overflow-hidden shadow-lg"
              style={{ width: `${sidebarWidth}%` }}
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>📊</span> 深度分析
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                  {result.result?.sources.length || 0} 个信息来源
                </p>
              </div>

              {/* Sidebar Content - Scrollable */}
              <div className="flex-1 overflow-auto">
                {htmlContent ? (
                  <div className="p-6">
                    <div
                      className="markdown-content"
                      dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                  </div>
                ) : (
                  <div className="p-6 text-gray-400 text-center">
                    等待分析结果...
                  </div>
                )}
              </div>

              {/* Sources */}
              {result.result?.sources && result.result.sources.length > 0 && (
                <div className="border-t border-gray-200 p-4 bg-gray-50 flex-shrink-0 max-h-48 overflow-auto">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>📚</span> 信息来源
                  </h4>
                  <div className="space-y-2">
                    {result.result.sources.map((source, index) => (
                      <div key={index} className="text-sm bg-white rounded-lg p-2 border border-gray-200">
                        <span className="text-gray-700">{source.display}</span>
                        {source.type && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {source.type}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}