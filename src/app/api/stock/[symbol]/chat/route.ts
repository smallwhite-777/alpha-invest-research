import { NextRequest, NextResponse } from 'next/server'
import {
  buildLimitReachedPayload,
  buildQuotaInfo,
  checkAndConsumeQuota,
} from '@/lib/guest-quota'

interface StockContext {
  stockCode: string
  stockName: string
  priceData?: {
    latestPrice: number | null
    priceChange: number | null
    priceChangePct: number | null
    dates?: string[]
    closes?: number[]
  }
}

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5003'

const STOCK_CHAT_SYSTEM_PROMPT = `你是一位专业的股票分析师AI助手。你正在为用户分析一只特定的上市公司股票。

## 分析框架

### 股价分析
- 趋势判断：上涨/下跌/震荡
- 技术位置：支撑位、压力位
- 成交量配合：放量/缩量

### 基本面分析
- 行业地位和竞争优势
- 财务数据解读（营收、利润、ROE等）
- 估值水平（PE、PB）

### 风险提示
- 行业风险
- 公司特定风险
- 市场系统性风险

## 回答原则

1. **数据支撑**：分析要有数据支撑，不要空洞表述
2. **风险意识**：始终提示投资风险
3. **客观中立**：不给出具体买卖建议，提供分析参考
4. **简洁明了**：用要点和列表，避免冗长段落
5. **专业术语**：使用专业术语但要解释清楚

## 输出格式

使用 Markdown 格式，可以：
- **粗体**标注关键观点
- 列表罗列要点
- 表格展示数据对比
- > 引用重要提示`

async function fetchStockNews(stockCode: string): Promise<string> {
  try {
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/news/hot?count=10`)
    const data = await response.json()

    if (data.news && data.news.length > 0) {
      // Filter news related to the stock (simple keyword matching)
      const relatedNews = data.news.slice(0, 5).map((n: any) =>
        `- ${n.title} (来源: ${n.source})`
      ).join('\n')
      return relatedNews
    }
    return ''
  } catch {
    return ''
  }
}

function buildStockContextMessage(context: StockContext): string {
  const { stockCode, stockName, priceData } = context

  let msg = `## 当前分析股票

- **股票名称**: ${stockName}
- **股票代码**: ${stockCode}
`

  if (priceData?.latestPrice !== null && priceData?.latestPrice !== undefined) {
    msg += `\n## 实时行情

- **最新价**: ¥${priceData.latestPrice.toFixed(2)}`

    if (priceData.priceChange !== null && priceData.priceChangePct !== null) {
      const isUp = priceData.priceChange >= 0
      msg += `
- **涨跌**: ${isUp ? '+' : ''}${priceData.priceChange.toFixed(2)} (${isUp ? '+' : ''}${priceData.priceChangePct.toFixed(2)}%)`
    }
  }

  if (priceData?.closes && priceData.closes.length > 0) {
    const recentCloses = priceData.closes.slice(-5)
    const avgPrice = recentCloses.reduce((a, b) => a + b, 0) / recentCloses.length
    const maxPrice = Math.max(...priceData.closes.slice(-30))
    const minPrice = Math.min(...priceData.closes.slice(-30))

    msg += `

## 近期走势数据

- **近30日最高**: ¥${maxPrice.toFixed(2)}
- **近30日最低**: ¥${minPrice.toFixed(2)}
- **近5日均价**: ¥${avgPrice.toFixed(2)}
- **数据天数**: ${priceData.closes.length}个交易日
`
  }

  return msg
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const quota = await checkAndConsumeQuota('AI')
    if (!quota.allowed) {
      return NextResponse.json(buildLimitReachedPayload('AI', quota), { status: 401 })
    }
    const quotaInfo = buildQuotaInfo(quota, 'AI')

    const { symbol } = await params
    const body = await request.json()
    const { messages, stockContext } = body as {
      messages: { role: 'user' | 'assistant'; content: string }[]
      stockContext?: StockContext
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: '请提供对话消息' }, { status: 400 })
    }

    // Fetch related news
    const newsContext = await fetchStockNews(symbol)

    // Build system message with stock context
    let systemContent = STOCK_CHAT_SYSTEM_PROMPT

    if (stockContext) {
      systemContent += '\n\n' + buildStockContextMessage(stockContext)
    }

    if (newsContext) {
      systemContent += `\n\n## 相关新闻动态\n\n${newsContext}`
    }

    // Call AI API
    const apiKey = process.env.MINIMAX_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.SILICONFLOW_API_KEY
    const baseUrl = process.env.MINIMAX_API_KEY
      ? 'https://api.minimaxi.com/v1'
      : process.env.DEEPSEEK_API_KEY
        ? 'https://api.deepseek.com'
        : 'https://api.siliconflow.cn/v1'
    const model = process.env.MINIMAX_API_KEY
      ? 'MiniMax-M2.7'
      : process.env.DEEPSEEK_API_KEY
        ? 'deepseek-chat'
        : 'deepseek-ai/DeepSeek-V3'

    if (!apiKey) {
      // Mock response for demo
      const lastMsg = messages[messages.length - 1]
      const mockReply = `## ${stockContext?.stockName || symbol} 分析

基于当前数据，我为您提供以下分析：

### 股价走势
- 最新价: ¥${stockContext?.priceData?.latestPrice?.toFixed(2) || 'N/A'}
- 近期涨跌: ${stockContext?.priceData?.priceChangePct?.toFixed(2) || 'N/A'}%

### 分析建议
1. **技术面**: 需要结合K线图和成交量综合判断
2. **基本面**: 建议查看公司最新财报数据
3. **风险提示**: 股市有风险，投资需谨慎

> 注意：当前为演示模式（未配置AI API Key），配置后将提供深度分析。

您还想了解哪些方面？比如行业对比、估值分析、风险因素等。`

      return NextResponse.json({ result: mockReply, quota: quotaInfo })
    }

    // Build messages for AI
    const aiMessages = [
      { role: 'system', content: systemContent },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ]

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: aiMessages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[stock-chat] AI API error:', response.status, error)
      throw new Error(`AI API error: ${response.status}`)
    }

    const data = await response.json() as any
    const result = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ result, quota: quotaInfo })
  } catch (error) {
    console.error('[stock-chat] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '分析请求失败' },
      { status: 500 }
    )
  }
}