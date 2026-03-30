'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Send, Loader2, Bot, User, Sparkles, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'

interface StockAIChatProps {
  stockCode: string
  stockName: string
  priceData?: {
    latestPrice: number | null
    priceChange: number | null
    priceChangePct: number | null
    dates?: string[]
    closes?: number[]
  }
  // 页面上下文 - 包含当前网页的核心数据
  pageContext?: {
    // 当前页面类型
    pageType: 'stock-detail' | 'financial-analysis' | 'intelligence' | 'news'
    // 财务数据摘要
    financialSummary?: {
      marketCap?: string
      pe?: number
      pb?: number
      roe?: number
      netProfitMargin?: number
      revenueGrowth?: number
      debtRatio?: number
      compositeScore?: number
      latestYear?: string
    }
    // 风险指标
    riskIndicators?: {
      riskLevel?: string
      fraudScore?: number
      warnings?: string[]
      healthScore?: number
    }
    // 估值信息
    valuation?: {
      dcfValue?: number
      pePercentile?: number
      pbPercentile?: number
      industryPe?: number
      fairValue?: string
    }
    // 当前查看的分析维度
    activeTab?: string
    // 时间范围
    timeRange?: string
    // 其他补充信息
    additionalInfo?: Record<string, any>
  }
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  isLoading?: boolean
  timestamp: number
}

export function StockAIChat({ stockCode, stockName, priceData, pageContext }: StockAIChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [width, setWidth] = useState(400) // Default width in px
  const [isResizing, setIsResizing] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [contextSent, setContextSent] = useState(false) // 标记是否已发送上下文
  const sidebarRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = window.innerWidth - e.clientX
      const minWidth = 300
      const maxWidth = window.innerWidth * 0.5
      setWidth(Math.min(maxWidth, Math.max(minWidth, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // Initialize with welcome message and send page context
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `你好！我是 **${stockName}(${stockCode})** 的AI分析助手。

我可以帮你分析：
- 近期股价走势和技术指标
- 公司基本面和财务数据
- 相关新闻和市场动态
- 投资风险和机会

请问有什么想了解的？`,
        timestamp: Date.now()
      }
      setMessages([welcomeMessage])

      // 如果有页面上下文，自动发送给AI进行智能分析
      if (pageContext && !contextSent) {
        sendPageContextToAI()
      }
    }
  }, [isOpen, stockCode, stockName, messages.length])

  // 发送页面上下文到AI
  const sendPageContextToAI = async () => {
    if (!pageContext || contextSent) return

    setContextSent(true)
    setIsLoading(true)

    // 构建上下文摘要
    const contextSummary = buildContextSummary()

    // 添加系统上下文消息
    const contextMessage: Message = {
      id: 'context',
      role: 'assistant',
      content: `📊 **已获取当前页面数据**\n\n${contextSummary}`,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, contextMessage])

    // 发送到后端让AI分析
    const loadingId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant',
      content: '',
      isLoading: true,
      timestamp: Date.now()
    }])

    try {
      const response = await fetch(`/api/stock/${stockCode}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          stockContext: {
            stockCode,
            stockName,
            priceData,
            pageContext,
            action: 'analyze_page'
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '请求失败')
      }

      // 更新AI分析回复
      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { ...m, isLoading: false, content: data.result }
          : m
      ))
    } catch (error) {
      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { ...m, isLoading: false, content: `❌ 分析失败：${error instanceof Error ? error.message : '未知错误'}` }
          : m
      ))
    } finally {
      setIsLoading(false)
    }
  }

  // 构建页面上下文摘要
  const buildContextSummary = () => {
    if (!pageContext) return ''

    const lines: string[] = []

    // 财务摘要
    if (pageContext.financialSummary) {
      const fs = pageContext.financialSummary
      lines.push('**财务指标概览：**')
      if (fs.marketCap) lines.push(`- 市值：${fs.marketCap}`)
      if (fs.pe) lines.push(`- PE(TTM)：${fs.pe.toFixed(2)}倍`)
      if (fs.pb) lines.push(`- PB：${fs.pb.toFixed(2)}倍`)
      if (fs.roe) lines.push(`- ROE：${fs.roe.toFixed(2)}%`)
      if (fs.netProfitMargin) lines.push(`- 净利率：${fs.netProfitMargin.toFixed(2)}%`)
      if (fs.revenueGrowth) lines.push(`- 营收增长：${fs.revenueGrowth.toFixed(2)}%`)
      if (fs.debtRatio) lines.push(`- 资产负债率：${fs.debtRatio.toFixed(2)}%`)
      if (fs.compositeScore) lines.push(`- 综合评分：${fs.compositeScore}分`)
      if (fs.latestYear) lines.push(`- 数据年份：${fs.latestYear}`)
    }

    // 风险指标
    if (pageContext.riskIndicators) {
      const ri = pageContext.riskIndicators
      lines.push('\n**风险提示：**')
      if (ri.riskLevel) lines.push(`- 风险等级：${ri.riskLevel}`)
      if (ri.fraudScore !== undefined) lines.push(`- 财务造假风险评分：${ri.fraudScore.toFixed(2)}分`)
      if (ri.warnings && ri.warnings.length > 0) {
        lines.push(`- 警告事项：${ri.warnings.join('、')}`)
      }
    }

    // 估值信息
    if (pageContext.valuation) {
      const val = pageContext.valuation
      lines.push('\n**估值分析：**')
      if (val.dcfValue) lines.push(`- DCF估值：¥${val.dcfValue.toFixed(2)}`)
      if (val.pePercentile) lines.push(`- PE历史分位：${val.pePercentile.toFixed(1)}%`)
      if (val.pbPercentile) lines.push(`- PB历史分位：${val.pbPercentile.toFixed(1)}%`)
      if (val.fairValue) lines.push(`- 合理估值区间：${val.fairValue}`)
    }

    // 当前分析维度
    if (pageContext.activeTab) {
      lines.push(`\n**当前查看：**${pageContext.activeTab}模块`)
    }

    return lines.join('\n')
  }

  // Send message
  const handleSend = async () => {
    const trimmedInput = inputText.trim()
    if (!trimmedInput || isLoading) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    // Add loading message
    const loadingId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant',
      content: '',
      isLoading: true,
      timestamp: Date.now()
    }])

    try {
      const response = await fetch(`/api/stock/${stockCode}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages
            .filter(m => !m.isLoading && m.id !== 'welcome' && m.id !== 'context')
            .map(m => ({ role: m.role, content: m.content }))
            .concat([{ role: 'user', content: trimmedInput }]),
          stockContext: {
            stockCode,
            stockName,
            priceData,
            pageContext
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '请求失败')
      }

      // Update with AI response
      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { ...m, isLoading: false, content: data.result }
          : m
      ))
    } catch (error) {
      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { ...m, isLoading: false, content: `❌ 请求失败：${error instanceof Error ? error.message : '未知错误'}` }
          : m
      ))
    } finally {
      setIsLoading(false)
    }
  }

  // Quick questions - 根据是否有页面上下文调整
  const quickQuestions = pageContext ? [
    '分析当前财务指标',
    '估值是否合理？',
    '风险点有哪些？'
  ] : [
    '分析近期股价走势',
    '有哪些投资风险？',
    '公司基本面如何？'
  ]

  // 更智能的快速问题 - 基于页面内容生成
  const generateSmartQuestions = () => {
    if (!pageContext) return quickQuestions

    const questions: string[] = []

    // 基于财务数据生成问题
    if (pageContext.financialSummary?.roe) {
      questions.push(`ROE ${pageContext.financialSummary.roe.toFixed(1)}% 水平如何？`)
    }
    if (pageContext.financialSummary?.pe) {
      questions.push(`PE ${pageContext.financialSummary.pe.toFixed(1)}倍是否低估？`)
    }
    if (pageContext.riskIndicators?.riskLevel) {
      questions.push(`当前风险等级${pageContext.riskIndicators.riskLevel}意味着什么？`)
    }

    // 通用问题
    questions.push('综合分析这家公司')

    return questions.slice(0, 3)
  }

  const displayQuestions = contextSent ? generateSmartQuestions() : quickQuestions

  return (
    <>
      {/* AI Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300',
          'bg-primary text-primary-foreground hover:scale-105 hover:shadow-xl',
          isOpen && 'scale-0 opacity-0'
        )}
        title="AI分析助手"
      >
        <Bot className="h-6 w-6" />
      </button>

      {/* Chat Sidebar */}
      <div
        ref={sidebarRef}
        className={cn(
          'fixed top-0 right-0 h-full bg-card border-l border-border shadow-2xl z-50 transition-transform duration-300',
          'flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width: `${width}px` }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors',
            isResizing && 'bg-primary/30'
          )}
        />

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">AI分析助手</h3>
              <p className="text-xs text-muted-foreground">{stockName} · {stockCode}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={cn('flex gap-3', message.role === 'user' && 'flex-row-reverse')}>
              {/* Avatar */}
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                message.role === 'user' ? 'bg-accent' : 'bg-primary/10'
              )}>
                {message.role === 'user' ? (
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-primary" />
                )}
              </div>

              {/* Content */}
              <div className={cn('flex-1 min-w-0', message.role === 'user' && 'text-right')}>
                {message.isLoading ? (
                  <div className="inline-block rounded-2xl rounded-tl-sm border border-border/60 bg-card/50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">分析中...</span>
                    </div>
                  </div>
                ) : message.role === 'user' ? (
                  <div className="inline-block rounded-2xl rounded-tr-sm bg-accent px-4 py-2.5 text-sm text-foreground text-left max-w-[85%]">
                    {message.content}
                  </div>
                ) : (
                  <div className="bg-card/50 rounded-2xl rounded-tl-sm border border-border/50 p-4 max-w-[95%]">
                    <MarkdownRenderer content={message.content} />
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions / Context Actions */}
        {!contextSent && pageContext && messages.length <= 1 ? (
          <div className="px-4 pb-2 shrink-0">
            <button
              onClick={sendPageContextToAI}
              disabled={isLoading}
              className="w-full rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
            >
              <Eye className="h-4 w-4" />
              <span>发送当前页面数据给AI分析</span>
            </button>
          </div>
        ) : contextSent && messages.length <= 3 ? (
          <div className="px-4 pb-2 shrink-0">
            <div className="flex flex-wrap gap-2">
              {displayQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(q)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : messages.length <= 1 && (
          <div className="px-4 pb-2 shrink-0">
            <div className="flex flex-wrap gap-2">
              {displayQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(q)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border shrink-0">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="输入问题..."
              className="flex-1 resize-none border-0 bg-transparent p-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[36px] max-h-[100px]"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !inputText.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Overlay when open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}