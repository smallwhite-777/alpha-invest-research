'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, Loader2, AlertCircle, ChevronDown, ChevronUp, History, Trash2, Zap, Brain, Send, User, Bot, Plus, MoreHorizontal, ChevronRight, Database, BookOpen, CheckCircle2, Clock, XCircle, Loader } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'

interface UploadedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
}

interface AnalysisResult {
  summary: string
  keyPoints: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  riskFactors: string[]
  opportunities: string[]
  valuation?: {
    method: string
    targetPrice?: string
    currentPrice?: string
    peRatio?: string
    pbRatio?: string
  }
  recommendation?: 'buy' | 'hold' | 'sell' | 'watch'
  deepAnalysis?: {
    business?: { coreStrength: string; newNarrative: string }
    keyMetrics?: { metrics: string[]; trends: string }
    valuationDeep?: { methods: string; assumptions: string; scenarios: any }
    monitoring?: { drivers: string[]; risks: string[]; triggers: string[] }
  }
  philosophyViews?: {
    buffett: { view: string; reasoning: string }
    ark: { view: string; reasoning: string }
    tiger: { view: string; reasoning: string }
    klarman: { view: string; reasoning: string }
    tepper: { view: string; reasoning: string }
    druck: { view: string; reasoning: string }
  }
  variantView?: { consensus: string; ourView: string; whyDifferent: string }
  preMortem?: string[]
}

// 消息类型
interface Message {
  id: string
  role: 'user' | 'assistant'
  content?: string
  files?: { name: string; size: number }[]
  result?: AnalysisResult
  analysisMode?: 'basic' | 'deep'
  sources?: { id: string; title: string; type?: string }[]
  steps?: { name: string; status: string; duration_ms?: number; error?: string }[]  // 思维链条步骤
  total_duration_ms?: number  // 总耗时
  timestamp: number
  isLoading?: boolean  // 新增：标记是否正在加载
}

// 对话会话
interface Conversation {
  id: string
  title: string
  messages: Message[]
  timestamp: number
}

// 折叠面板组件
function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="bg-surface-low overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-surface-high transition-colors"
      >
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {isOpen && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

// 思维链条可视化组件
function ThinkingChain({ steps, totalDuration }: { steps?: { name: string; status: string; duration_ms?: number; error?: string }[]; totalDuration?: number }) {
  if (!steps || steps.length === 0) return null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case 'running':
        return <Loader className="h-4 w-4 text-amber-500 animate-spin" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-rose-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10'
      case 'running':
        return 'bg-amber-500/10'
      case 'failed':
        return 'bg-rose-500/10'
      default:
        return 'bg-surface-high'
    }
  }

  return (
    <div className="bg-surface-low p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2 font-editorial">
          <Brain className="h-4 w-4 text-primary" />
          思维链条
        </h4>
        {totalDuration && (
          <span className="text-xs text-muted-foreground">
            总耗时: {totalDuration.toFixed(0)}ms
          </span>
        )}
      </div>
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-2.5 ${getStatusColor(step.status)} transition-colors`}
          >
            <div className="flex items-center gap-2.5">
              {getStatusIcon(step.status)}
              <span className="text-sm text-foreground">{step.name}</span>
            </div>
            {step.duration_ms && (
              <span className="text-xs text-muted-foreground">{step.duration_ms.toFixed(0)}ms</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// 渲染分析结果
function AnalysisResultCard({ result, mode }: { result: AnalysisResult; mode?: 'basic' | 'deep' }) {
  const getRecommendationLabel = (rec?: string) => {
    switch (rec) {
      case 'buy': return { text: '买入 BUY', color: 'bg-emerald-500/10 text-emerald-500' }
      case 'hold': return { text: '持有 HOLD', color: 'bg-blue-500/10 text-blue-500' }
      case 'sell': return { text: '卖出 SELL', color: 'bg-rose-500/10 text-rose-500' }
      case 'watch': return { text: '观望 WATCH', color: 'bg-amber-500/10 text-amber-500' }
      default: return { text: '暂无建议', color: 'bg-surface-high text-muted-foreground' }
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-surface-low p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn(
            'inline-flex items-center px-2.5 py-0.5 text-xs font-medium',
            result.sentiment === 'positive' && 'bg-emerald-500/10 text-emerald-500',
            result.sentiment === 'neutral' && 'bg-amber-500/10 text-amber-500',
            result.sentiment === 'negative' && 'bg-rose-500/10 text-rose-500'
          )}>
            {result.sentiment === 'positive' && '看涨 BULLISH'}
            {result.sentiment === 'neutral' && '中性 NEUTRAL'}
            {result.sentiment === 'negative' && '看跌 BEARISH'}
          </span>
          <span className={cn('inline-flex items-center px-2.5 py-0.5 text-xs font-medium', getRecommendationLabel(result.recommendation).color)}>
            {getRecommendationLabel(result.recommendation).text}
          </span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
      </div>

      {/* Key Points */}
      {result.keyPoints && result.keyPoints.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide font-editorial">关键要点</h4>
          <div className="grid gap-2">
            {result.keyPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-3 text-sm text-foreground p-3 bg-surface-high">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-primary/10 text-xs font-medium text-primary">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Valuation */}
      {result.valuation && (
        <div className="bg-surface-low p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 font-editorial">估值分析</h4>
          <div className="grid grid-cols-2 gap-3">
            {result.valuation.method && (
              <div>
                <p className="text-xs text-muted-foreground">估值方法</p>
                <p className="text-sm font-medium text-foreground">{result.valuation.method}</p>
              </div>
            )}
            {result.valuation.currentPrice && (
              <div>
                <p className="text-xs text-muted-foreground">当前价格</p>
                <p className="text-sm font-medium text-foreground">{result.valuation.currentPrice}</p>
              </div>
            )}
            {result.valuation.targetPrice && (
              <div>
                <p className="text-xs text-muted-foreground">目标价格</p>
                <p className="text-sm font-medium text-emerald-500">{result.valuation.targetPrice}</p>
              </div>
            )}
            {result.valuation.peRatio && (
              <div>
                <p className="text-xs text-muted-foreground">PE 比率</p>
                <p className="text-sm font-medium text-foreground">{result.valuation.peRatio}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk & Opportunities */}
      <div className="grid grid-cols-2 gap-3">
        {result.riskFactors && result.riskFactors.length > 0 && (
          <div className="bg-rose-500/5 p-3">
            <h4 className="text-xs font-medium text-rose-500 mb-2">风险提示</h4>
            <ul className="space-y-1">
              {result.riskFactors.slice(0, 3).map((risk, index) => (
                <li key={index} className="text-xs text-foreground flex items-start gap-1.5">
                  <span className="text-rose-400 mt-0.5">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.opportunities && result.opportunities.length > 0 && (
          <div className="bg-emerald-500/5 p-3">
            <h4 className="text-xs font-medium text-emerald-500 mb-2">投资机会</h4>
            <ul className="space-y-1">
              {result.opportunities.slice(0, 3).map((opp, index) => (
                <li key={index} className="text-xs text-foreground flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  <span>{opp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Deep Analysis Sections */}
      {result.deepAnalysis && mode === 'deep' && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-surface-high" />
            <span className="text-xs font-medium text-muted-foreground font-editorial">深度分析</span>
            <div className="h-px flex-1 bg-surface-high" />
          </div>

          {/* Business */}
          {result.deepAnalysis.business && (
            <CollapsibleSection title="业务竞争力" defaultOpen>
              <div className="space-y-2 text-sm">
                {result.deepAnalysis.business.coreStrength && (
                  <div><span className="text-muted-foreground">核心优势：</span>{result.deepAnalysis.business.coreStrength}</div>
                )}
                {result.deepAnalysis.business.newNarrative && (
                  <div><span className="text-muted-foreground">新增长点：</span>{result.deepAnalysis.business.newNarrative}</div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Key Metrics */}
          {result.deepAnalysis.keyMetrics && (
            <CollapsibleSection title="关键指标">
              <div className="space-y-2 text-sm">
                {result.deepAnalysis.keyMetrics.metrics?.map((metric, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-primary">{idx + 1}.</span>
                    <span>{metric}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Valuation Deep */}
          {result.deepAnalysis.valuationDeep && (
            <CollapsibleSection title="估值深度">
              <div className="space-y-2 text-sm">
                {result.deepAnalysis.valuationDeep.methods && (
                  <div><span className="text-muted-foreground">估值方法：</span>{result.deepAnalysis.valuationDeep.methods}</div>
                )}
                {result.deepAnalysis.valuationDeep.assumptions && (
                  <div><span className="text-muted-foreground">核心假设：</span>{result.deepAnalysis.valuationDeep.assumptions}</div>
                )}
                {result.deepAnalysis.valuationDeep.scenarios && (
                  <div>
                    <span className="text-muted-foreground">情景分析：</span>
                    {typeof result.deepAnalysis.valuationDeep.scenarios === 'string' ? (
                      <span>{result.deepAnalysis.valuationDeep.scenarios}</span>
                    ) : (
                      <div className="mt-1 space-y-1">
                        {(result.deepAnalysis.valuationDeep.scenarios as any).bull && (
                          <div className="text-emerald-600 text-xs">Bull: {(result.deepAnalysis.valuationDeep.scenarios as any).bull}</div>
                        )}
                        {(result.deepAnalysis.valuationDeep.scenarios as any).base && (
                          <div className="text-blue-600 text-xs">Base: {(result.deepAnalysis.valuationDeep.scenarios as any).base}</div>
                        )}
                        {(result.deepAnalysis.valuationDeep.scenarios as any).bear && (
                          <div className="text-rose-600 text-xs">Bear: {(result.deepAnalysis.valuationDeep.scenarios as any).bear}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Monitoring */}
          {result.deepAnalysis.monitoring && (
            <CollapsibleSection title="监控清单" defaultOpen>
              <div className="space-y-3 text-sm">
                {result.deepAnalysis.monitoring.drivers && result.deepAnalysis.monitoring.drivers.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">关键驱动因素：</div>
                    <ul className="space-y-1 ml-2">
                      {result.deepAnalysis.monitoring.drivers.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs"><span className="text-emerald-500">•</span><span>{d}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.deepAnalysis.monitoring.risks && result.deepAnalysis.monitoring.risks.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">风险信号：</div>
                    <ul className="space-y-1 ml-2">
                      {result.deepAnalysis.monitoring.risks.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs"><span className="text-rose-500">•</span><span>{r}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}

      {/* Philosophy Views */}
      {result.philosophyViews && mode === 'deep' && (
        <CollapsibleSection title="6大投资哲学视角">
          <div className="space-y-2 text-xs">
            {Object.entries(result.philosophyViews).map(([key, view]) => {
              const labels: Record<string, string> = {
                buffett: '巴菲特', ark: 'ARK', tiger: 'Tiger Cubs',
                klarman: 'Klarman', tepper: 'Tepper', druck: 'Druckenmiller'
              }
              return (
                <div key={key} className="p-2 bg-surface-high">
                  <div className="font-medium text-primary">{labels[key]}</div>
                  <div className="text-muted-foreground mt-0.5">{view.view}</div>
                </div>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Variant View */}
      {result.variantView && mode === 'deep' && (
        <CollapsibleSection title="差异观点">
          <div className="space-y-2 text-sm">
            <div className="p-2 bg-rose-500/5">
              <div className="text-rose-500 text-xs font-medium">市场共识</div>
              <div className="text-xs mt-0.5">{result.variantView.consensus}</div>
            </div>
            <div className="p-2 bg-emerald-500/5">
              <div className="text-emerald-500 text-xs font-medium">我们的观点</div>
              <div className="text-xs mt-0.5">{result.variantView.ourView}</div>
            </div>
            {result.variantView.whyDifferent && (
              <div className="p-2 bg-surface-high">
                <div className="text-primary text-xs font-medium">差异原因</div>
                <div className="text-xs mt-0.5">{result.variantView.whyDifferent}</div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Pre-Mortem */}
      {result.preMortem && result.preMortem.length > 0 && mode === 'deep' && (
        <CollapsibleSection title="事前验尸">
          <ul className="space-y-2 text-xs">
            {result.preMortem.map((path, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center bg-rose-500/10 text-xs font-medium text-rose-500">{i + 1}</span>
                <span>{path}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  )
}

// 格式化消息组件 - 使用统一的MarkdownRenderer
function FormattedMessage({ content }: { content: string }) {
  return <MarkdownRenderer content={content} />
}

export default function AnalyzePage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([])
  const [analysisMode, setAnalysisMode] = useState<'basic' | 'deep'>('basic')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const modeDropdownRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 从 localStorage 加载历史
  useEffect(() => {
    const saved = localStorage.getItem('conversations')
    if (saved) {
      try {
        setConversations(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load conversations:', e)
      }
    }
  }, [])

  // 保存到 localStorage
  const saveConversations = useCallback((newConversations: Conversation[]) => {
    setConversations(newConversations)
    localStorage.setItem('conversations', JSON.stringify(newConversations))
  }, [])

  // 关闭下拉菜单当点击外部
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setShowModeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 新建对话
  const newChat = useCallback(() => {
    const newId = Date.now().toString()
    const newConversation: Conversation = {
      id: newId,
      title: '新对话',
      messages: [],
      timestamp: Date.now(),
    }
    // 新对话放在最前面
    const updatedConversations = [newConversation, ...conversations]
    saveConversations(updatedConversations)
    setCurrentConversationId(newId)
    setMessages([])
    setPendingFiles([])
    setInputText('')
    setError(null)
  }, [conversations, saveConversations])

  // 加载对话
  const loadConversation = useCallback((conversation: Conversation) => {
    setCurrentConversationId(conversation.id)
    setMessages(conversation.messages)
    setPendingFiles([])
    setInputText('')
    setError(null)
    setShowHistory(false)
  }, [])

  // 删除对话
  const deleteConversation = useCallback((id: string) => {
    const newConversations = conversations.filter(c => c.id !== id)
    saveConversations(newConversations)
    if (currentConversationId === id) {
      setCurrentConversationId(null)
      setMessages([])
      setPendingFiles([])
    }
  }, [conversations, currentConversationId, saveConversations])

  // 更新对话标题
  const updateConversationTitle = useCallback((conversationId: string, title: string) => {
    const newConversations = conversations.map(c =>
      c.id === conversationId ? { ...c, title } : c
    )
    saveConversations(newConversations)
  }, [conversations, saveConversations])

  // 文件上传处理
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
    }))
    setPendingFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'text/*': ['.txt', '.md', '.csv'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    noClick: true,
    noKeyboard: true,
  })

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id))
  }

  // 分析函数（支持文件分析和纯文字聊天）
  const handleAnalyze = async () => {
    console.log('[handleAnalyze] === FUNCTION CALLED ===')
    const trimmedInput = inputText.trim()
    console.log('[handleAnalyze] trimmedInput:', trimmedInput, 'pendingFiles:', pendingFiles.length)

    if (!trimmedInput && pendingFiles.length === 0) {
      console.log('[handleAnalyze] No input, returning')
      return
    }

    console.log('[handleAnalyze] Starting with input:', trimmedInput)
    // 删除 alert 弹窗，直接发送
    setIsAnalyzing(true)
    setError(null)

    // 立即添加用户消息到界面
    const userMessageId = Date.now().toString()
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: trimmedInput || undefined,
      files: pendingFiles.length > 0 ? pendingFiles.map(f => ({ name: f.name, size: f.size })) : undefined,
      analysisMode,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMessage])

    // 添加加载中的AI消息占位
    const loadingMessageId = (Date.now() + 1).toString()
    const loadingMessage: Message = {
      id: loadingMessageId,
      role: 'assistant',
      isLoading: true,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, loadingMessage])

    // 清空输入
    setInputText('')

    try {
      // 判断是文件分析还是纯文字聊天
      if (pendingFiles.length > 0) {
        // 文件分析模式
        const formData = new FormData()
        pendingFiles.forEach((file) => {
          formData.append('files', file.file)
        })
        formData.append('mode', analysisMode)

        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        })

        // 安全解析JSON
        let data
        try {
          const text = await response.text()
          data = text ? JSON.parse(text) : {}
        } catch (parseError) {
          console.error('[handleAnalyze] JSON parse error:', parseError)
          throw new Error('服务器响应格式错误')
        }

        console.log('[handleAnalyze] File analysis response:', data)

        if (!response.ok) {
          throw new Error(data.error || '分析请求失败')
        }

        // 更新AI消息（替换加载状态）
        setMessages(prev => prev.map(msg =>
          msg.id === loadingMessageId
            ? { ...msg, isLoading: false, result: data.result, analysisMode }
            : msg
        ))
        setPendingFiles([])
      } else {
        // 纯文字聊天模式
        const chatMessages: { role: 'user' | 'assistant'; content: string }[] = []

        // 添加历史对话（排除加载中的消息）
        for (const msg of messages) {
          if (msg.role === 'user' && msg.content && !msg.isLoading) {
            chatMessages.push({ role: 'user', content: msg.content })
          } else if (msg.role === 'assistant' && msg.content && !msg.isLoading) {
            chatMessages.push({ role: 'assistant', content: msg.content })
          }
        }
        // 添加当前问题
        chatMessages.push({ role: 'user', content: trimmedInput })

        console.log('[handleAnalyze] Sending chat request with messages:', chatMessages.length)

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: chatMessages,
            mode: analysisMode,
            use_workflow: true,  // 使用Python后端工作流获取思维链条
          }),
        })

        // 安全解析JSON
        let data
        try {
          const text = await response.text()
          data = text ? JSON.parse(text) : {}
        } catch (parseError) {
          console.error('[handleAnalyze] JSON parse error:', parseError)
          throw new Error('服务器响应格式错误')
        }

        console.log('[handleAnalyze] Chat response:', data)

        if (!response.ok) {
          throw new Error(data.error || '聊天请求失败')
        }

        // 更新AI消息（替换加载状态）
        setMessages(prev => prev.map(msg =>
          msg.id === loadingMessageId
            ? { ...msg, isLoading: false, content: data.result, sources: data.sources || [], steps: data.steps || [], total_duration_ms: data.total_duration_ms }
            : msg
        ))
      }

    } catch (err) {
      console.error('[handleAnalyze] Error:', err)
      setError(err instanceof Error ? err.message : '请求过程中出现错误')

      // 更新为错误消息
      setMessages(prev => prev.map(msg =>
        msg.id === loadingMessageId
          ? { ...msg, isLoading: false, content: 'Request failed: ' + (err instanceof Error ? err.message : '未知错误') }
          : msg
      ))
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 构建纯文字聊天的上下文
  const buildChatContextForTextChat = (allMessages: Message[], currentQuestion: string) => {
    const chatMessages: { role: 'system' | 'user' | 'assistant', content: string }[] = []

    // 添加系统提示
    chatMessages.push({
      role: 'system',
      content: `你是一位资深投资研究分析师，可以回答用户关于投资、股票、市场、财务分析等方面的问题。

回答原则：
1. 提供专业、客观的投资分析建议
2. 如果用户询问具体公司或股票，给出基于基本面的分析
3. 如果不确定，诚实说明，不要编造具体数据
4. 投资建议要 actionable，说明理由
5. 风险提示要清晰`,
    })

    // 添加历史对话
    for (const msg of allMessages) {
      if (msg.role === 'user' && msg.content) {
        chatMessages.push({ role: 'user', content: msg.content })
      } else if (msg.role === 'assistant' && msg.content) {
        chatMessages.push({ role: 'assistant', content: msg.content })
      }
    }

    // 添加当前问题
    chatMessages.push({ role: 'user', content: currentQuestion })

    return chatMessages
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="h-full flex">
      {/* 侧边栏 - 历史记录 (始终显示，有历史时展示) */}
      {conversations.length > 0 && (
        <div className="w-64 bg-surface-low flex flex-col shrink-0">
          <div className="p-3 bg-surface-high flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm font-editorial">
              <History className="h-4 w-4" />
              历史对话
            </h2>
            <button
              onClick={newChat}
              className="p-1.5 hover:bg-surface-float transition-colors"
              title="新建对话"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {/* 已按时间倒序存储，直接显示 */}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => loadConversation(conv)}
                className={cn(
                  'group p-3 cursor-pointer transition-colors',
                  currentConversationId === conv.id
                    ? 'bg-primary/10'
                    : 'hover:bg-surface-high'
                )}
              >
                <div className="font-medium text-sm text-foreground truncate">
                  {conv.title}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formatTime(conv.timestamp)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteConversation(conv.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-surface-low px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {conversations.length === 0 && (
              <button
                onClick={newChat}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                新对话
              </button>
            )}
            {currentConversationId && messages.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {conversations.find(c => c.id === currentConversationId)?.title || '对话'}
              </span>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4" {...getRootProps()}>
          <input {...getInputProps()} />

          {messages.length === 0 ? (
            // 欢迎界面
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto">
              <div className="text-center space-y-6">
                <div className="flex h-16 w-16 items-center justify-center bg-primary/10 mx-auto">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2 font-editorial">智能投研助手</h1>
                  <p className="text-muted-foreground">上传研报获取AI分析 -- 基于知识库情报提问 -- 思维链条可视化</p>
                </div>

                {/* 快速示例 */}
                <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                  <button
                    onClick={() => setInputText('最近有哪些值得关注的产业链变化？')}
                    className="px-3 py-1.5 bg-surface-high text-xs text-foreground hover:bg-surface-float transition-colors"
                  >
                    产业链变化
                  </button>
                  <button
                    onClick={() => setInputText('半导体行业近期有什么重要动态？')}
                    className="px-3 py-1.5 bg-surface-high text-xs text-foreground hover:bg-surface-float transition-colors"
                  >
                    半导体动态
                  </button>
                  <button
                    onClick={() => setInputText('有哪些高重要性的情报需要关注？')}
                    className="px-3 py-1.5 bg-surface-high text-xs text-foreground hover:bg-surface-float transition-colors"
                  >
                    重要情报
                  </button>
                  <button
                    onClick={() => setInputText('帮我梳理一下新能源相关的信息')}
                    className="px-3 py-1.5 bg-surface-high text-xs text-foreground hover:bg-surface-float transition-colors"
                  >
                    新能源梳理
                  </button>
                  <button
                    onClick={() => setInputText('AI行业有哪些值得关注的公司？')}
                    className="px-3 py-1.5 bg-surface-high text-xs text-foreground hover:bg-surface-float transition-colors"
                  >
                    AI行业分析
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Upload className="h-3.5 w-3.5" />
                    拖拽文件上传研报
                  </span>
                  <span className="text-muted-foreground/40">|</span>
                  <span className="flex items-center gap-1">
                    <Database className="h-3.5 w-3.5" />
                    自动检索知识库情报
                  </span>
                </div>
              </div>
            </div>
          ) : (
            // 对话列表
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={cn('flex gap-4', message.role === 'user' ? 'flex-row-reverse' : '')}>
                  {/* Avatar */}
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center',
                    message.role === 'user' ? 'bg-surface-high' : 'bg-primary/10'
                  )}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Bot className="h-4 w-4 text-primary" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={cn('flex-1 space-y-2', message.role === 'user' ? 'text-right' : '')}>
                    {/* User message */}
                    {message.role === 'user' && (
                      <div className="inline-block">
                        {message.content && (
                          <div className="bg-surface-high px-4 py-2.5 text-sm text-foreground inline-block text-left">
                            {message.content}
                          </div>
                        )}
                        {message.files && message.files.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2 justify-end">
                            {message.files.map((file, idx) => (
                              <div key={idx} className="inline-flex items-center gap-1.5 bg-surface-low px-2.5 py-1.5 text-xs">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="truncate max-w-[120px]">{file.name}</span>
                                <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {message.analysisMode && (
                          <div className="mt-1.5">
                            <span className={cn(
                              'inline-flex items-center gap-1 text-xs px-2 py-0.5',
                              message.analysisMode === 'deep'
                                ? 'bg-purple-500/10 text-purple-500'
                                : 'bg-blue-500/10 text-blue-500'
                            )}>
                              {message.analysisMode === 'deep' ? <Brain className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                              {message.analysisMode === 'deep' ? '深度分析' : '快速分析'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Assistant message */}
                    {message.role === 'assistant' && message.result && (
                      <div className="bg-surface-low p-4">
                        <AnalysisResultCard result={message.result} mode={message.analysisMode} />
                      </div>
                    )}

                    {/* Loading state */}
                    {message.role === 'assistant' && message.isLoading && (
                      <div className="bg-surface-low px-5 py-6">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="h-5 w-5 border-2 border-primary/30"></div>
                            <div className="absolute inset-0 h-5 w-5 border-2 border-primary border-t-transparent animate-spin"></div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-foreground">正在分析中...</span>
                            <span className="text-xs text-muted-foreground">AI 正在检索知识库并生成回复</span>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-1">
                          <div className="h-2 w-2 bg-primary/40 animate-pulse" style={{ animationDelay: '0ms' }}></div>
                          <div className="h-2 w-2 bg-primary/40 animate-pulse" style={{ animationDelay: '150ms' }}></div>
                          <div className="h-2 w-2 bg-primary/40 animate-pulse" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    )}

                    {/* Assistant text reply (for follow-up questions / knowledge base) */}
                    {message.role === 'assistant' && message.content && !message.result && !message.isLoading && (
                      <div className="space-y-3">
                        {/* Thinking Chain Visualization */}
                        {message.steps && message.steps.length > 0 && (
                          <ThinkingChain steps={message.steps} totalDuration={message.total_duration_ms} />
                        )}
                        <div className="bg-surface-low px-5 py-4">
                          <FormattedMessage content={message.content} />
                        </div>
                        {/* Knowledge base sources */}
                        {message.sources && message.sources.length > 0 && (
                          <div className="bg-surface-high px-3 py-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Database className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">参考来源</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {message.sources.slice(0, 6).map((s, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 bg-surface-low px-2 py-1 text-xs text-muted-foreground hover:text-foreground cursor-default transition-colors"
                                  title={s.title}
                                >
                                  {s.type === 'annual_report' && <FileText className="h-3 w-3" />}
                                  {s.title.length > 25 ? s.title.substring(0, 25) + '...' : s.title}
                                </span>
                              ))}
                              {message.sources.length > 6 && (
                                <span className="text-xs text-muted-foreground/60 py-1">
                                  +{message.sources.length - 6} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-surface-low px-6 py-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            {/* Error */}
            {error && (
              <div className="mb-3 flex items-center gap-2 bg-destructive/10 p-3 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Pending Files */}
            {pendingFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {pendingFiles.map((file) => (
                  <div key={file.id} className="inline-flex items-center gap-1.5 bg-surface-high px-2.5 py-1.5 text-xs">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <button
                      onClick={() => removePendingFile(file.id)}
                      className="ml-1 p-0.5 hover:bg-surface-float"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Box */}
            <div className="relative">
              <div className="flex items-end gap-2 bg-surface-high p-3">
                {/* Mode Selector Dropdown */}
                <div ref={modeDropdownRef} className="relative shrink-0">
                  <button
                    onClick={() => setShowModeDropdown(!showModeDropdown)}
                    className={cn(
                      'flex h-9 shrink-0 items-center gap-1.5 px-2.5 text-xs font-medium transition-colors',
                      analysisMode === 'deep'
                        ? 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20'
                        : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
                    )}
                    title={analysisMode === 'deep' ? '深度分析' : '快速分析'}
                  >
                    {analysisMode === 'deep' ? <Brain className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                    <span className="hidden sm:inline">{analysisMode === 'deep' ? 'Deep' : 'Quick'}</span>
                    <ChevronDown className={cn('h-3 w-3 transition-transform', showModeDropdown && 'rotate-180')} />
                  </button>

                  {/* Dropdown Menu */}
                  {showModeDropdown && (
                    <div className="absolute bottom-full left-0 mb-2 w-40 bg-surface-float z-50 overflow-hidden">
                      <button
                        onClick={() => {
                          setAnalysisMode('basic')
                          setShowModeDropdown(false)
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-left',
                          analysisMode === 'basic'
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'hover:bg-surface-high'
                        )}
                      >
                        <Zap className="h-4 w-4" />
                        <div className="flex-1">
                          <div className="font-medium">快速分析</div>
                          <div className="text-xs text-muted-foreground">适用于新闻简报</div>
                        </div>
                        {analysisMode === 'basic' && <div className="w-1.5 h-1.5 bg-blue-500" />}
                      </button>
                      <div className="h-px bg-surface-high" />
                      <button
                        onClick={() => {
                          setAnalysisMode('deep')
                          setShowModeDropdown(false)
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-left',
                          analysisMode === 'deep'
                            ? 'bg-purple-500/10 text-purple-500'
                            : 'hover:bg-surface-high'
                        )}
                      >
                        <Brain className="h-4 w-4" />
                        <div className="flex-1">
                          <div className="font-medium">深度分析</div>
                          <div className="text-xs text-muted-foreground">适用于研究报告</div>
                        </div>
                        {analysisMode === 'deep' && <div className="w-1.5 h-1.5 bg-purple-500" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <button
                  onClick={open}
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground hover:bg-surface-float hover:text-foreground transition-colors"
                  title="上传文件"
                >
                  <Upload className="h-5 w-5" />
                </button>

                {/* Text Input */}
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAnalyze()
                    }
                  }}
                  placeholder="输入问题或上传文件..."
                  className="flex-1 resize-none border-0 bg-transparent p-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 min-h-[40px] max-h-[120px]"
                  rows={1}
                  style={{ height: 'auto' }}
                />

                {/* Send Button */}
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || (!inputText.trim() && pendingFiles.length === 0)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Drag Overlay - 全屏覆盖 */}
              {isDragActive && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                  <div className="border-2 border-dashed border-primary bg-primary/5 px-12 py-8">
                    <Upload className="h-12 w-12 text-primary mx-auto mb-3" />
                    <p className="text-lg font-medium text-primary font-editorial">松开鼠标上传文件</p>
                  </div>
                </div>
              )}
            </div>

            {/* Hint */}
            <p className="mt-2 text-center text-xs text-muted-foreground">
              PDF, Word, TXT, Markdown -- Enter to send, Shift+Enter for newline -- Text queries auto-retrieve knowledge base
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
