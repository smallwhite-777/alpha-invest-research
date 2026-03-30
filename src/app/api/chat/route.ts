import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { suggestTemplate, getTemplateSystemPrompt } from '@/lib/ai/templates'

// Python backend URL for annual report search
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5003'

// Flag to use Python backend workflow instead of frontend LLM calls
// Set USE_PYTHON_WORKFLOW=true to enable unified AI entry point
const USE_PYTHON_WORKFLOW = process.env.USE_PYTHON_WORKFLOW === 'true'

const CHAT_SYSTEM_PROMPT = `你是 ALPHA 投研平台的 AI 分析师助手。你同时具备两种能力：
1. 基于用户上传的文档进行分析讨论
2. 基于投研情报数据库中的数据回答问题、分析趋势

## 回答原则
1. **基于数据**：分析必须基于提供的情报内容或对话上下文，不要编造数据
2. **精确引用**：所有数据必须精确到小数点后1-2位，不要使用模糊表述如"约"、"左右"
3. **数据来源**：每个关键数据点需在括号中标注来源，如"营业收入3036亿元(年报)"
4. **投资视角**：从投资研究的角度提供分析
5. **结构化**：按标准格式输出，确保数据完整

## 工具使用
你拥有以下工具来获取更精确的数据：
- **search_annual_reports**: 搜索公司年报txt文件，获取原始财务数据
- **search_intelligence_db**: 搜索投研情报数据库
- **get_financial_metrics**: 获取特定公司的财务指标
- **get_realtime_price**: 获取股票实时价格和历史走势（90天）
- **get_stock_news**: 获取财经热点新闻
- **get_peer_comparison**: 获取同行业公司对比数据
- **get_valuation_metrics**: 获取估值指标（PE/PB/PS等）

**重要**：当用户询问以下问题时，你应该**主动**调用相应工具：
- 估值分析 → 调用 get_valuation_metrics
- 股价走势 → 调用 get_realtime_price
- 同行对比 → 调用 get_peer_comparison
- 新闻消息 → 调用 get_stock_news
- 财务分析 → 调用 search_annual_reports + get_financial_metrics

当现有上下文不足以回答问题时，你应该主动调用工具获取数据。

## 数据精度要求
- **禁止估算**：不要使用"约100亿"、"大概50%"等模糊表述
- **精确数值**：必须使用年报或研报中的精确数值，如"3036.40亿元"
- **数据验证**：如果上下文中的数据看起来不合理（如利润大于营收），请验证后再使用
- **年份匹配**：确保数据年份正确，2023年数据标注2023，2024年数据标注2024

## 财务分析输出格式
当用户询问公司业绩或财务分析时，**必须**按以下格式输出：

### 核心财务数据对比

| 指标 | 2023年 | 2024年 | 同比变化 |
|------|--------|--------|----------|
| 营业收入 | xx亿元(年报) | xx亿元(年报) | +xx% |
| 归母净利润 | xx亿元(年报) | xx亿元(年报) | +xx% |
| 毛利率 | xx%(年报) | xx%(年报) | +xxpct |
| ROE | xx%(年报) | xx%(年报) | +xxpct |
| 经营性现金流 | xx亿元(年报) | xx亿元(年报) | +xx% |
| 资产负债率 | xx%(年报) | xx%(年报) | -xxpct |

**注意**：以上为标准指标，根据公司行业特点可能需要补充其他关键指标。所有数据必须精确，并标注来源。

### 主要产品/业务数据

根据公司所属行业，输出主要产品或业务的关键数据：
- **制造业**：产品产量、销量、产能利用率
- **资源类**：矿产产量、储量、开采量
- **科技类**：用户数、ARPU、GMV等运营指标
- **金融类**：资产规模、存贷款余额、不良率

**格式示例**：
| 产品/业务 | 2023年 | 2024年 | 同比变化 |
|------|--------|--------|----------|
| 主要产品1 | xx万吨(年报) | xx万吨(年报) | +xx% |
| 主要产品2 | xx吨(年报) | xx吨(年报) | +xx% |

### 关键发现

1. **发现标题** - 详细说明（引用具体数据支撑）
2. **发现标题** - 详细说明（引用具体数据支撑）
3. **发现标题** - 详细说明（引用具体数据支撑）

### 业务结构

- 业务A: 占比 xx%（来源）
- 业务B: 占比 xx%（来源）

### 一句话总结

用一句话概括核心投资逻辑，包含关键数据。

## 估值分析输出格式
当用户询问估值相关问题时，使用工具获取数据后按以下格式输出：

| 指标 | 当前值 | 行业平均 | 历史分位 | 评价 |
|------|--------|----------|----------|------|
| PE(TTM) | xx | xx | xx% | 低估/合理/高估 |
| PB | xx | xx | xx% | 低估/合理/高估 |

## 回答格式
使用 Markdown 格式回答，可以用：
- **粗体**标注关键观点
- 列表罗列要点
- > 引用情报原文
- 适当分段增加可读性`

// ========== Plan C: Tool Definitions ==========
const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_annual_reports',
      description: '搜索公司年报txt文件，获取原始财务数据。支持按公司名称、股票代码、年份搜索。',
      parameters: {
        type: 'object',
        properties: {
          company_name: {
            type: 'string',
            description: '公司名称（如：牧原股份、贵州茅台）'
          },
          stock_code: {
            type: 'string',
            description: '股票代码（如：002714、600519）'
          },
          year: {
            type: 'string',
            description: '年份（如：2024、2023）'
          },
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: '额外关键词（如：["营业收入", "净利润"]）'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_intelligence_db',
      description: '搜索投研情报数据库，获取研报、新闻、分析等情报。',
      parameters: {
        type: 'object',
        properties: {
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: '搜索关键词列表'
          },
          category: {
            type: 'string',
            enum: ['FINANCIAL_REPORT', 'RESEARCH_REPORT', 'NEWS', 'MACRO', 'INDUSTRY'],
            description: '情报分类'
          },
          limit: {
            type: 'number',
            description: '返回结果数量限制，默认10'
          }
        },
        required: ['keywords']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_financial_metrics',
      description: '获取特定公司的财务指标数据，如营收、利润、ROE等。',
      parameters: {
        type: 'object',
        properties: {
          company_name: {
            type: 'string',
            description: '公司名称'
          },
          stock_code: {
            type: 'string',
            description: '股票代码'
          },
          metrics: {
            type: 'array',
            items: { type: 'string' },
            description: '要获取的指标名称（如：["营收", "净利润", "ROE", "毛利率"]）'
          },
          year: {
            type: 'string',
            description: '年份'
          }
        },
        required: ['company_name']
      }
    }
  },
  // ========== 新增工具 ==========
  {
    type: 'function' as const,
    function: {
      name: 'get_realtime_price',
      description: '获取股票实时价格和历史走势数据。返回最近90天的开盘价、收盘价、最高价、最低价和成交量。',
      parameters: {
        type: 'object',
        properties: {
          stock_code: {
            type: 'string',
            description: '股票代码（如：600519、000858）'
          },
          company_name: {
            type: 'string',
            description: '公司名称（可选，用于辅助搜索）'
          },
          start_date: {
            type: 'string',
            description: '起始日期 YYYY-MM-DD（可选，默认90天前）'
          },
          end_date: {
            type: 'string',
            description: '结束日期 YYYY-MM-DD（可选，默认今天）'
          }
        },
        required: ['stock_code']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_stock_news',
      description: '获取财经热点新闻和市场动态。返回最新的财经新闻列表。',
      parameters: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            enum: ['cls', 'weibo', 'wallstreet', 'eastmoney'],
            description: '新闻来源（cls=财联社, weibo=微博热搜, wallstreet=华尔街见闻）'
          },
          count: {
            type: 'number',
            description: '返回新闻数量，默认10'
          },
          keyword: {
            type: 'string',
            description: '搜索关键词（可选）'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_peer_comparison',
      description: '获取同行业公司对比数据。返回同行公司的营收、净利润、ROE等关键指标对比。',
      parameters: {
        type: 'object',
        properties: {
          stock_code: {
            type: 'string',
            description: '股票代码（如：600519）'
          },
          company_name: {
            type: 'string',
            description: '公司名称（可选）'
          },
          industry: {
            type: 'string',
            description: '行业名称（可选，如：白酒、银行、汽车）'
          }
        },
        required: ['stock_code']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_valuation_metrics',
      description: '获取股票估值指标，包括PE(TTM)、PB、PS、市值等。同时提供行业平均值和历史分位数。',
      parameters: {
        type: 'object',
        properties: {
          stock_code: {
            type: 'string',
            description: '股票代码（如：600519）'
          },
          company_name: {
            type: 'string',
            description: '公司名称（可选）'
          }
        },
        required: ['stock_code']
      }
    }
  }
]

// ========== 工具调用策略：根据问题类型推荐工具 ==========
function suggestTools(question: string): string[] {
  const suggestions: string[] = []

  // 估值相关问题
  if (question.includes('估值') || question.includes('PE') || question.includes('PB') ||
      question.includes('市盈率') || question.includes('市净率') || question.includes('贵') ||
      question.includes('便宜') || question.includes('价值')) {
    suggestions.push('get_valuation_metrics')
  }

  // 股价/走势相关问题
  if (question.includes('股价') || question.includes('走势') || question.includes('涨跌') ||
      question.includes('价格') || question.includes('最新价') || question.includes('行情')) {
    suggestions.push('get_realtime_price')
  }

  // 新闻/消息相关问题
  if (question.includes('新闻') || question.includes('消息') || question.includes('利好') ||
      question.includes('利空') || question.includes('公告') || question.includes('热点')) {
    suggestions.push('get_stock_news')
  }

  // 同行/竞品对比
  if (question.includes('同行') || question.includes('竞品') || question.includes('对比') ||
      question.includes('比较') || question.includes('行业') || question.includes('竞争对手')) {
    suggestions.push('get_peer_comparison')
  }

  // 财务分析问题
  if (question.includes('财务') || question.includes('营收') || question.includes('利润') ||
      question.includes('业绩') || question.includes('年报') || question.includes('指标')) {
    suggestions.push('search_annual_reports')
    suggestions.push('get_financial_metrics')
  }

  return suggestions
}

// Extract keywords from question for DB search
function extractKeywords(question: string): string[] {
  const stopWords = ['的', '了', '是', '在', '有', '和', '与', '对', '从', '到', '被', '把', '让', '给',
    '吗', '呢', '吧', '啊', '什么', '怎么', '如何', '哪些', '哪个', '为什么', '请', '帮我',
    '分析', '一下', '告诉', '关于', '目前', '现在', '最近', '情况', '怎样', '能否', '可以']

  const cleaned = question
    .replace(/[，。！？、；：""''（）【】《》…—\s,.\\?!;:'"()\[\]<>]/g, ' ')
    .split(' ')
    .filter(w => w.length >= 2 && !stopWords.includes(w))

  return [...new Set(cleaned)]
}

// ========== 新增：调用Python后端精确搜索年报txt ==========
interface AnnualReportSearchResult {
  context: string
  sources: Array<{ file_path: string; company_name: string; stock_code: string }>
  metrics: Array<{ name: string; value: string; year: string }>
}

async function fetchAnnualReportData(keywords: string[], question: string): Promise<AnnualReportSearchResult> {
  try {
    // 提取年份
    const yearMatch = question.match(/(20\d{2})/)
    const yearFilter = yearMatch ? yearMatch[1] : undefined

    const response = await fetch(`${PYTHON_BACKEND_URL}/api/precise-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords,
        question,
        year_filter: yearFilter,
        max_results: 5
      }),
      signal: AbortSignal.timeout(30000) // 30秒超时
    })

    if (!response.ok) {
      console.error('[chat] Python backend error:', response.status)
      return { context: '', sources: [], metrics: [] }
    }

    const data = await response.json() as AnnualReportSearchResult
    return data
  } catch (error) {
    console.error('[chat] Failed to fetch annual report data:', error)
    return { context: '', sources: [], metrics: [] }
  }
}

// 构建年报上下文
function buildAnnualReportContext(result: AnnualReportSearchResult): string {
  if (!result.context && result.metrics.length === 0) return ''

  const parts: string[] = []

  // 添加自动提取的财务指标（优先级最高）
  if (result.metrics.length > 0) {
    parts.push('## 自动提取的财务指标\n')
    for (const m of result.metrics) {
      parts.push(`- **${m.name}**: ${m.value} (${m.year}年)`)
    }
    parts.push('')
  }

  // 添加年报原始内容
  if (result.context) {
    parts.push('## 年报原始数据\n')
    parts.push(result.context)
  }

  return parts.join('\n')
}

// Fetch relevant intelligence from database
async function fetchRelevantIntelligence(keywords: string[], _question: string) {
  const orConditions: any[] = []

  for (const keyword of keywords.slice(0, 5)) {
    orConditions.push(
      { title: { contains: keyword } },
      { content: { contains: keyword } },
      { summary: { contains: keyword } },
      { tags: { some: { tag: { name: { contains: keyword } } } } },
      { stocks: { some: { stockName: { contains: keyword } } } },
    )
  }

  let matched: any[] = []
  if (orConditions.length > 0) {
    matched = await prisma.intelligence.findMany({
      where: { OR: orConditions },
      include: {
        tags: { include: { tag: true } },
        sectors: true,
        stocks: true,
      },
      orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
      take: 15,
    })
  }

  // 只有当关键词匹配为空时，才返回最近的高重要性情报作为推荐
  // 修复：不再无条件返回固定的高重要性情报
  if (matched.length === 0) {
    const recent = await prisma.intelligence.findMany({
      where: { importance: { gte: 3 } },
      include: {
        tags: { include: { tag: true } },
        sectors: true,
        stocks: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,  // 减少到5条
    })
    return recent
  }

  return matched
}

// Build text context from intelligence items
function buildContext(items: any[]): string {
  if (items.length === 0) return ''

  return items.map((item, idx) => {
    const tags = item.tags?.map((t: any) => t.tag.name).join('、') || ''
    const stocks = item.stocks?.map((s: any) => `${s.stockName}(${s.stockSymbol})`).join('、') || ''
    const sectors = item.sectors?.map((s: any) => s.sectorName).join('、') || ''

    return `### 情报 ${idx + 1}: ${item.title}
- 分类: ${item.category} | 重要性: ${item.importance}/5 | 时间: ${item.createdAt}
- 标签: ${tags || '无'} | 行业: ${sectors || '无'} | 标的: ${stocks || '无'}
- 摘要: ${item.summary || '无'}
- 内容: ${item.content.substring(0, 500)}${item.content.length > 500 ? '...' : ''}`
  }).join('\n\n')
}

// Get knowledge base statistics
async function getKnowledgeStats() {
  const [total, categories, sectors] = await Promise.all([
    prisma.intelligence.count(),
    prisma.intelligence.groupBy({ by: ['category'], _count: true }),
    prisma.intelligenceSector.groupBy({ by: ['sectorCode'], _count: true }),
  ])

  return {
    total,
    categories: categories.length,
    sectors: sectors.length,
  }
}

// ========== Plan C: Tool Execution Functions ==========
interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

interface ToolResult {
  tool_call_id: string
  role: 'tool'
  content: string
}

// Helper function to safely parse JSON response
async function safeJsonParse(response: Response): Promise<any> {
  try {
    const text = await response.text()
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

async function executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
  const { name, arguments: argsStr } = toolCall.function
  const args = JSON.parse(argsStr)

  let content = ''

  try {
    switch (name) {
      case 'search_annual_reports': {
        const keywords: string[] = []
        if (args.company_name) keywords.push(args.company_name)
        if (args.stock_code) keywords.push(args.stock_code)
        if (args.keywords) keywords.push(...args.keywords)

        const result = await fetchAnnualReportData(keywords, args.company_name || '')

        if (!result.context && result.metrics.length === 0) {
          content = '未找到相关年报数据。请检查公司名称或股票代码是否正确。'
        } else {
          const parts: string[] = []
          if (result.metrics.length > 0) {
            parts.push('## 提取的财务指标')
            result.metrics.forEach(m => {
              parts.push(`- **${m.name}**: ${m.value} (${m.year}年)`)
            })
          }
          if (result.context) {
            parts.push('## 年报内容摘要')
            parts.push(result.context.substring(0, 3000))
          }
          parts.push(`\n**数据来源**: ${result.sources.map(s => `${s.company_name}(${s.stock_code})`).join(', ')}`)
          content = parts.join('\n')
        }
        break
      }

      case 'search_intelligence_db': {
        const keywords = args.keywords || []
        const category = args.category
        const limit = args.limit || 10

        const orConditions: any[] = []
        for (const keyword of keywords.slice(0, 5)) {
          orConditions.push(
            { title: { contains: keyword } },
            { content: { contains: keyword } },
            { summary: { contains: keyword } }
          )
        }

        const where: any = orConditions.length > 0 ? { OR: orConditions } : {}
        if (category) {
          where.category = category
        }

        const items = await prisma.intelligence.findMany({
          where,
          include: {
            tags: { include: { tag: true } },
            stocks: true,
          },
          orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
          take: limit,
        })

        if (items.length === 0) {
          content = '未找到相关情报数据。'
        } else {
          const parts: string[] = [`找到 ${items.length} 条相关情报：`]
          items.forEach((item, idx) => {
            const stocks = item.stocks?.map((s: any) => s.stockName).join('、') || '无'
            parts.push(`\n### ${idx + 1}. ${item.title}`)
            parts.push(`- 分类: ${item.category} | 重要性: ${item.importance}/5`)
            parts.push(`- 标的: ${stocks}`)
            parts.push(`- 摘要: ${item.summary || item.content?.substring(0, 200) || '无'}`)
          })
          content = parts.join('\n')
        }
        break
      }

      case 'get_financial_metrics': {
        const { company_name, stock_code, metrics, year } = args
        const keywords: string[] = [company_name]
        if (stock_code) keywords.push(stock_code)
        if (metrics) keywords.push(...metrics)

        const result = await fetchAnnualReportData(keywords, `${company_name} ${year || ''}`)

        if (result.metrics.length === 0) {
          content = `未找到 ${company_name} 的财务指标数据。`
        } else {
          let filteredMetrics = result.metrics
          if (metrics && metrics.length > 0) {
            // Filter to requested metrics
            filteredMetrics = result.metrics.filter(m =>
              metrics.some((req: string) => m.name.includes(req))
            )
          }
          if (year) {
            filteredMetrics = filteredMetrics.filter(m => m.year === year)
          }

          const parts: string[] = [`## ${company_name} 财务指标`]
          filteredMetrics.forEach(m => {
            parts.push(`- **${m.name}**: ${m.value} (${m.year}年)`)
          })
          parts.push(`\n**数据来源**: 年报txt文件`)
          content = parts.join('\n')
        }
        break
      }

      // ========== 新增工具执行 ==========
      case 'get_realtime_price': {
        const { stock_code, start_date, end_date } = args

        try {
          const response = await fetch(`${PYTHON_BACKEND_URL}/api/stock/price/${stock_code}?start_date=${start_date || ''}&end_date=${end_date || ''}`, {
            signal: AbortSignal.timeout(15000)
          })

          if (!response.ok) {
            content = `获取股价失败: ${response.status}`
            break
          }

          const data = await safeJsonParse(response)

          if (!data?.success || !data.data) {
            content = `无法获取 ${stock_code} 的股价数据`
            break
          }

          const { dates, close, open, high, low, volume } = data.data
          const summary = data.summary || {}

          const parts: string[] = [`## ${stock_code} 股价数据`]

          if (dates && dates.length > 0) {
            parts.push(`\n### 最新数据`)
            parts.push(`- 最新价: **${close[close.length - 1]}元** (${dates[dates.length - 1]})`)
            parts.push(`- 昨收: ${close[close.length - 2]}元`)
            parts.push(`- 涨跌幅: ${summary.change_pct ? `${summary.change_pct.toFixed(2)}%` : '未知'}`)

            parts.push(`\n### 近期走势`)
            parts.push(`- 最高价: ${Math.max(...high).toFixed(2)}元`)
            parts.push(`- 最低价: ${Math.min(...low).toFixed(2)}元`)
            parts.push(`- 平均成交量: ${summary.avg_volume ? `${(summary.avg_volume / 10000).toFixed(0)}万手` : '未知'}`)

            parts.push(`\n### 数据范围`)
            parts.push(`- 起始: ${dates[0]}`)
            parts.push(`- 结束: ${dates[dates.length - 1]}`)
            parts.push(`- 数据点: ${dates.length}天`)
          }

          parts.push(`\n**数据来源**: AKShare实时行情`)
          content = parts.join('\n')
        } catch (error) {
          content = `获取股价出错: ${error instanceof Error ? error.message : '网络错误'}`
        }
        break
      }

      case 'get_stock_news': {
        const { source = 'cls', count = 10, keyword } = args

        try {
          let url = `${PYTHON_BACKEND_URL}/api/news/hot?source=${source}&count=${count}`
          if (keyword) {
            // Use trends endpoint for keyword search
            url = `${PYTHON_BACKEND_URL}/api/news/trends?sources=${source}`
          }

          const response = await fetch(url, {
            signal: AbortSignal.timeout(15000)
          })

          if (!response.ok) {
            content = `获取新闻失败: ${response.status}`
            break
          }

          const data = await safeJsonParse(response)
          const news = keyword ? (data?.trends?.[source] || []) : (data?.news || [])

          if (!news || news.length === 0) {
            content = `未找到相关新闻`
            break
          }

          const parts: string[] = [`## ${keyword ? `${keyword}相关新闻` : '财经热点新闻'}`]
          parts.push(`来源: ${source}\n`)

          news.slice(0, count).forEach((item: any, idx: number) => {
            const title = item.title || item.content || '未知标题'
            const time = item.time || item.pub_time || ''
            parts.push(`${idx + 1}. **${title.substring(0, 50)}${title.length > 50 ? '...' : ''}`)
            if (time) parts.push(`   时间: ${time}`)
          })

          parts.push(`\n**数据来源**: ${source === 'cls' ? '财联社' : source}`)
          content = parts.join('\n')
        } catch (error) {
          content = `获取新闻出错: ${error instanceof Error ? error.message : '网络错误'}`
        }
        break
      }

      case 'get_peer_comparison': {
        const { stock_code, industry } = args

        try {
          const response = await fetch(`${PYTHON_BACKEND_URL}/api/stock/peers/${stock_code}?industry=${industry || ''}`, {
            signal: AbortSignal.timeout(20000)
          })

          if (!response.ok) {
            content = `获取同行对比失败: ${response.status}`
            break
          }

          const data = await safeJsonParse(response)

          if (!data?.success || !data.peers || data.peers.length === 0) {
            content = data?.message || `未找到 ${stock_code} 的同行对比数据`
            break
          }

          const parts: string[] = [`## ${stock_code} 同行对比分析`]
          parts.push(`行业: ${data.industry}\n`)

          // Build comparison table
          parts.push('### 同行公司对比')
          parts.push('| 公司 | 营收 | 净利润 | ROE | 毛利率 |')
          parts.push('|------|------|--------|-----|--------|')

          data.peers.forEach((peer: any) => {
            const name = peer.name || peer.code
            const revenue = peer.revenue || '-'
            const netProfit = peer.net_profit || '-'
            const roe = peer.roe || '-'
            const grossMargin = peer.gross_margin || '-'
            parts.push(`| ${name} | ${revenue} | ${netProfit} | ${roe} | ${grossMargin} |`)
          })

          parts.push(`\n**对比公司数**: ${data.peers.length}`)
          parts.push(`**数据来源**: 年报 + AKShare`)
          content = parts.join('\n')
        } catch (error) {
          content = `获取同行对比出错: ${error instanceof Error ? error.message : '网络错误'}`
        }
        break
      }

      case 'get_valuation_metrics': {
        const { stock_code } = args

        try {
          const response = await fetch(`${PYTHON_BACKEND_URL}/api/stock/valuation/${stock_code}`, {
            signal: AbortSignal.timeout(20000)
          })

          if (!response.ok) {
            content = `获取估值指标失败: ${response.status}`
            break
          }

          const data = await safeJsonParse(response)

          if (!data?.success) {
            content = `无法获取 ${stock_code} 的估值数据`
            break
          }

          const metrics = data.metrics || {}
          const parts: string[] = [`## ${stock_code} 估值分析`]

          parts.push('\n### 当前估值水平')
          parts.push('| 指标 | 当前值 | 行业平均 | 历史分位 |')
          parts.push('|------|--------|----------|----------|')

          parts.push(`| PE(TTM) | ${metrics.pe_ttm || '-'} | ${metrics.industry_avg_pe || '-'} | ${data.pe_percentile ? `${data.pe_percentile}%` : '-'} |`)
          parts.push(`| PB | ${metrics.pb || '-'} | ${metrics.industry_avg_pb || '-'} | ${data.pb_percentile ? `${data.pb_percentile}%` : '-'} |`)
          parts.push(`| PS | ${metrics.ps || '-'} | - | - |`)
          parts.push(`| 市值 | ${metrics.market_cap || '-'} | - | - |`)

          if (metrics.net_profit) {
            parts.push('\n### 财务基础数据')
            parts.push(`- 净利润: ${metrics.net_profit}亿元`)
            parts.push(`- 营业收入: ${metrics.revenue ? `${metrics.revenue}亿元` : '-'}`)
            parts.push(`- 净资产: ${metrics.net_assets ? `${metrics.net_assets}亿元` : '-'}`)
            parts.push(`- 最新股价: ${metrics.latest_price ? `${metrics.latest_price}元` : '-'}`)
          }

          // Valuation analysis
          if (metrics.pe_ttm && metrics.industry_avg_pe) {
            parts.push('\n### 估值分析')
            if (metrics.pe_ttm < metrics.industry_avg_pe) {
              parts.push(`- PE低于行业平均，估值相对**便宜**`)
            } else {
              parts.push(`- PE高于行业平均，估值相对**偏贵**`)
            }
            if (data.pe_percentile && data.pe_percentile < 30) {
              parts.push(`- 历史分位较低(${data.pe_percentile}%)，处于**低位估值区间**`)
            } else if (data.pe_percentile && data.pe_percentile > 70) {
              parts.push(`- 历史分位较高(${data.pe_percentile}%)，处于**高位估值区间**`)
            }
          }

          parts.push(`\n**数据来源**: ${metrics.data_source || '年报 + AKShare'}`)
          content = parts.join('\n')
        } catch (error) {
          content = `获取估值指标出错: ${error instanceof Error ? error.message : '网络错误'}`
        }
        break
      }

      default:
        content = `未知工具: ${name}`
    }
  } catch (error) {
    content = `工具执行错误: ${error instanceof Error ? error.message : '未知错误'}`
  }

  return {
    tool_call_id: toolCall.id,
    role: 'tool' as const,
    content
  }
}

// Check if provider supports tool calling
function supportsToolCalling(baseUrl: string): boolean {
  // MiniMax, DeepSeek, OpenAI-compatible APIs support tools
  return baseUrl.includes('minimaxi.com') ||
         baseUrl.includes('deepseek.com') ||
         baseUrl.includes('openai.com') ||
         baseUrl.includes('siliconflow.cn')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, mode = 'deep', enable_tools = true } = body as {
      messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
      mode: 'basic' | 'deep'
      enable_tools?: boolean
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: '请提供对话消息' }, { status: 400 })
    }

    // Extract the latest user question
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    const question = lastUserMsg?.content || ''

    // ========== Unified AI Entry Point: Use Python Backend Workflow ==========
    if (USE_PYTHON_WORKFLOW) {
      console.log('[chat] Using Python backend workflow for unified AI entry point')

      try {
        const response = await fetch(`${PYTHON_BACKEND_URL}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: question }),
          signal: AbortSignal.timeout(60000) // 60 second timeout for LLM calls
        })

        if (!response.ok) {
          throw new Error(`Python backend returned ${response.status}`)
        }

        const data = await response.json()

        if (data.status === 'completed') {
          return NextResponse.json({
            result: data.result?.content || '',
            sources: data.result?.sources || [],
            stats: {
              duration_ms: data.total_duration_ms,
              steps: data.steps?.map((s: any) => s.name).join(' → ')
            },
            workflow: 'python_backend'
          })
        } else {
          throw new Error(data.error || 'Python workflow failed')
        }
      } catch (workflowError) {
        console.error('[chat] Python workflow failed, falling back to frontend AI:', workflowError)
        // Fall through to frontend AI logic below
      }
    }

    // ========== Frontend AI Logic (original implementation) ==========

    // ========== Step 1: 提取关键词 ==========
    const keywords = extractKeywords(question)

    // ========== Step 2: 数据库检索 ==========
    const relevantIntel = await fetchRelevantIntelligence(keywords, question)
    const dbContext = buildContext(relevantIntel)

    // ========== Step 3: 年报txt精确搜索 ==========
    const annualReportResult = await fetchAnnualReportData(keywords, question)
    const annualReportContext = buildAnnualReportContext(annualReportResult)

    // ========== Step 4: 合并上下文 ==========
    const combinedContextParts: string[] = []
    if (annualReportContext) {
      combinedContextParts.push('### 年报财务数据（来自原始年报txt文件）\n' + annualReportContext)
    }
    if (dbContext) {
      combinedContextParts.push('### 投研情报数据库\n' + dbContext)
    }
    const combinedContext = combinedContextParts.join('\n\n---\n\n')

    // ========== Step 5: 工具智能推荐 - 提取股票代码并预获取数据 ==========
    const suggestedTools = suggestTools(question)
    const preFetchResults: string[] = []

    // Try to extract stock code from question
    const stockCodeMatch = question.match(/(6\d{5}|0\d{5}|3\d{5}|2\d{5})/)
    const stockCode = stockCodeMatch ? stockCodeMatch[1] : null

    // Helper function to safely parse JSON response
    const safeJsonParse = async (response: Response): Promise<any> => {
      try {
        const text = await response.text()
        return text ? JSON.parse(text) : null
      } catch {
        return null
      }
    }

    // Pre-fetch data for suggested tools if stock code found
    if (stockCode && suggestedTools.length > 0) {
      console.log(`[chat] Suggested tools: ${suggestedTools.join(', ')} for stock ${stockCode}`)

      // Pre-fetch valuation if suggested
      if (suggestedTools.includes('get_valuation_metrics')) {
        try {
          const valResponse = await fetch(`${PYTHON_BACKEND_URL}/api/stock/valuation/${stockCode}`, {
            signal: AbortSignal.timeout(10000)
          })
          if (valResponse.ok) {
            const valData = await safeJsonParse(valResponse)
            if (valData?.success) {
              preFetchResults.push(`### 预获取估值数据\n- PE(TTM): ${valData.metrics?.pe_ttm || '-'}\n- PB: ${valData.metrics?.pb || '-'}\n- 市值: ${valData.metrics?.market_cap || '-'}`)
            }
          }
        } catch { /* ignore pre-fetch errors */ }
      }

      // Pre-fetch price if suggested
      if (suggestedTools.includes('get_realtime_price')) {
        try {
          const priceResponse = await fetch(`${PYTHON_BACKEND_URL}/api/stock/price/${stockCode}`, {
            signal: AbortSignal.timeout(10000)
          })
          if (priceResponse.ok) {
            const priceData = await safeJsonParse(priceResponse)
            if (priceData?.success && priceData.data?.close) {
              const closes = priceData.data.close
              preFetchResults.push(`### 预获取股价数据\n- 最新价: ${closes[closes.length - 1]}元`)
            }
          }
        } catch { /* ignore pre-fetch errors */ }
      }

      // Pre-fetch peers if suggested
      if (suggestedTools.includes('get_peer_comparison')) {
        try {
          const peersResponse = await fetch(`${PYTHON_BACKEND_URL}/api/stock/peers/${stockCode}`, {
            signal: AbortSignal.timeout(10000)
          })
          if (peersResponse.ok) {
            const peersData = await safeJsonParse(peersResponse)
            if (peersData?.success && peersData.peers?.length > 0) {
              preFetchResults.push(`### 预获取同行数据\n- 行业: ${peersData.industry}\n- 同行数: ${peersData.peers.length}`)
            }
          }
        } catch { /* ignore pre-fetch errors */ }
      }
    }

    // Add pre-fetch results to context
    if (preFetchResults.length > 0) {
      combinedContextParts.push('### 智能预获取数据（基于问题类型）\n' + preFetchResults.join('\n'))
    }

    const stats = await getKnowledgeStats()

    // Call AI - MiniMax is default, fallback to DeepSeek/SiliconFlow
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
      // Mock response
      const mockReply = relevantIntel.length > 0 || annualReportResult.context
        ? `基于知识库中的数据：\n\n${relevantIntel.slice(0, 3).map((i, idx) => `${idx + 1}. **${i.title}**`).join('\n')}\n\n> 注意：当前为演示模式（未配置AI API Key），配置后将提供深度分析。`
        : `这是对"${question.slice(0, 30)}..."的模拟回复。配置API后将基于知识库提供深入分析。`

      return NextResponse.json({
        result: mockReply,
        sources: [
          ...relevantIntel.map(i => ({ id: i.id, title: i.title, type: 'database' as const })),
          ...annualReportResult.sources.map(s => ({ id: s.file_path, title: s.file_path, type: 'annual_report' as const }))
        ],
        stats,
        annual_report_found: annualReportResult.context.length > 0,
      })
    }

    // ========== Plan C: Build messages with tool support ==========
    const aiMessages: Array<{ role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string }> = [
      { role: 'system', content: CHAT_SYSTEM_PROMPT },
    ]

    // Add initial context if available
    if (combinedContext) {
      aiMessages.push({
        role: 'user',
        content: `以下是投研情报数据库中的相关情报：\n\n${combinedContext}\n\n---\n数据库统计：共${stats.total}条情报，涵盖${stats.categories}个分类，${stats.sectors}个行业。\n\n如果这些信息不足以回答问题，请使用工具获取更多数据。`,
      })
      aiMessages.push({
        role: 'assistant',
        content: '好的，我已了解这些情报内容。如果需要更多数据，我会使用工具获取。请问有什么需要分析的？',
      })
    }

    // Add conversation history
    for (const msg of messages) {
      if (msg.role !== 'system') {
        aiMessages.push({ role: msg.role, content: msg.content })
      }
    }

    const maxTokens = mode === 'basic' ? 800 : 2000
    const canUseTools = enable_tools && supportsToolCalling(baseUrl)

    // ========== Plan C: Multi-turn tool calling loop ==========
    const toolResults: ToolResult[] = []
    const sources = [
      ...relevantIntel.map(i => ({ id: i.id, title: i.title, type: 'database' as const })),
      ...annualReportResult.sources.map(s => ({ id: s.file_path, title: `${s.company_name}(${s.stock_code})年报`, type: 'annual_report' as const }))
    ]

    let finalResponse = ''
    let iteration = 0
    const maxIterations = 5 // Prevent infinite loops

    while (iteration < maxIterations) {
      iteration++

      const requestBody: any = {
        model,
        messages: aiMessages,
        temperature: 0.5,
        max_tokens: maxTokens,
      }

      // Add tools if supported and enabled
      if (canUseTools) {
        requestBody.tools = TOOLS
        requestBody.tool_choice = 'auto'
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('[chat] AI API error:', response.status, error)
        throw new Error(`AI API error: ${response.status}`)
      }

      const data = await response.json() as any
      const message = data.choices?.[0]?.message

      if (!message) {
        throw new Error('AI returned empty response')
      }

      // Check if LLM wants to call tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`[chat] Tool calls requested: ${message.tool_calls.map((t: any) => t.function.name).join(', ')}`)

        // Add assistant message with tool calls
        aiMessages.push({
          role: 'assistant',
          content: message.content || null,
          tool_calls: message.tool_calls
        })

        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          const result = await executeToolCall(toolCall)
          toolResults.push(result)
          aiMessages.push(result)

          // Add to sources if it's an annual report search
          if (toolCall.function.name === 'search_annual_reports') {
            try {
              const args = JSON.parse(toolCall.function.arguments)
              if (args.company_name) {
                sources.push({
                  id: `tool-${toolCall.id}`,
                  title: `${args.company_name}年报（Tool调用）`,
                  type: 'annual_report' as const
                })
              }
            } catch { /* ignore */ }
          }
        }

        // Continue the loop to get final response
        continue
      }

      // No tool calls - this is the final response
      finalResponse = message.content || ''
      break
    }

    if (!finalResponse) {
      finalResponse = '抱歉，我无法完成分析。请稍后重试。'
    }

    return NextResponse.json({
      result: finalResponse,
      sources,
      stats,
      annual_report_found: annualReportResult.context.length > 0,
      tool_calls_made: toolResults.length,
    })
  } catch (error) {
    console.error('[chat] Error:', error)
    const errorMessage = error instanceof Error ? error.message : '对话过程中出现错误'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
