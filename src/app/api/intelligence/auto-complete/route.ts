import { NextRequest, NextResponse } from 'next/server'
import { parseFile } from '@/lib/parsers'
import { INTELLIGENCE_CATEGORIES, SECTORS } from '@/lib/constants'

// 情报自动补全专用 prompt
const INTEL_AUTO_COMPLETE_PROMPT = `你是一位资深投资研究分析师。请基于以下情报内容，自动生成结构化的情报信息。

## 任务
分析给定的情报内容（可能是文字、研报摘录、新闻、产业链信息等），返回以下字段：

## 输出字段
1. **title**: 简洁有力的情报标题（15-25字，概括核心信息）
2. **summary**: 情报摘要（50-100字，包含关键信息点）
3. **category**: 分类，从以下选项中选一个：
   - INDUSTRY_TRACK: 产业链追踪（产能、新品、技术突破、供应链变化）
   - POLICY_RUMOR: 政策/传闻（政策动向、监管变化、市场传闻）
   - MEETING_MINUTES: 会议纪要（业绩会、调研会、专家会议）
   - RESEARCH_REPORT: 研究报告（券商研报、行业报告）
   - JOKE: 段子（市场趣闻、行业八卦）
   - NEWS: 新闻（一般性行业新闻）
4. **importance**: 重要程度 1-5（5最重要）。判断标准：
   - 5: 重大政策/事件，直接影响投资决策
   - 4: 重要产业变化或公司动态
   - 3: 一般行业信息
   - 2: 补充性信息
   - 1: 低优先级信息
5. **tags**: 3-5个关键词标签（如：AI、算力、英伟达、数据中心）
6. **relatedStocks**: 关联标的数组，每个包含 symbol（股票代码如600519）和 name（公司简称如贵州茅台）
7. **relatedSectors**: 关联行业数组，从以下代码中选：
   ${SECTORS.map(s => `${s.code}(${s.name})`).join('、')}

## 输出格式（仅JSON，无其他内容）
{
  "title": "...",
  "summary": "...",
  "category": "INDUSTRY_TRACK/POLICY_RUMOR/MEETING_MINUTES/RESEARCH_REPORT/JOKE/NEWS",
  "importance": 3,
  "tags": ["...", "..."],
  "relatedStocks": [{"symbol": "600519", "name": "贵州茅台"}],
  "relatedSectors": [{"code": "SEMICONDUCTOR", "name": "半导体"}]
}`

// POST /api/intelligence/auto-complete - AI auto-complete intelligence fields
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    let textContent = ''
    let fileNames: string[] = []

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData with files
      const formData = await request.formData()
      const rawContent = formData.get('content') as string || ''
      textContent = rawContent

      // Parse uploaded files
      const files = formData.getAll('files') as File[]
      const parseErrors: string[] = []
      for (const file of files) {
        try {
          console.log(`[auto-complete] Parsing file: ${file.name}, type: ${file.type}, size: ${file.size}`)
          const buffer = Buffer.from(await file.arrayBuffer())
          const parsed = await parseFile(buffer, file.name, file.type)
          textContent += `\n\n=== ${file.name} ===\n${parsed.content}`
          fileNames.push(file.name)
          console.log(`[auto-complete] Parsed ${file.name}: ${parsed.content.length} chars`)
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : '未知错误'
          console.error(`[auto-complete] Failed to parse file ${file.name}:`, errMsg)
          parseErrors.push(`${file.name}: ${errMsg}`)
        }
      }

      // If all files failed to parse and no text content, return specific error
      if (!textContent.trim() && parseErrors.length > 0) {
        return NextResponse.json(
          { error: `文件解析失败: ${parseErrors.join('; ')}` },
          { status: 400 }
        )
      }
    } else {
      // Handle JSON body (backward compatible)
      const body = await request.json()
      textContent = ''
      if (body.title) textContent += `标题：${body.title}\n\n`
      if (body.content) textContent += body.content
    }

    if (!textContent.trim()) {
      return NextResponse.json(
        { error: '请提供情报内容或上传附件' },
        { status: 400 }
      )
    }

    // Use AI to analyze - use the dedicated intelligence prompt
    // MiniMax is default, fallback to DeepSeek/SiliconFlow
    const hasApiKey = !!(process.env.MINIMAX_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.SILICONFLOW_API_KEY)

    let parsedResult: {
      title: string
      summary: string
      category: string
      importance: number
      tags: string[]
      relatedStocks: { symbol: string; name: string }[]
      relatedSectors: { code: string; name: string }[]
    }

    // Check if using mock provider (no API key configured)
    if (!hasApiKey) {
      // Generate intelligent mock based on content
      parsedResult = generateMockAutoComplete(textContent)
    } else {
      // Call real AI provider - MiniMax is default
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

      console.log(`[auto-complete] Calling AI: ${baseUrl}, model: ${model}, content length: ${textContent.length}`)

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: INTEL_AUTO_COMPLETE_PROMPT },
            {
              role: 'user',
              content: `请分析以下情报内容并自动补全信息：\n\n${textContent.substring(0, 10000)}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error(`[auto-complete] AI API error: ${response.status}`, error)
        throw new Error(`AI API error: ${response.status} - ${error}`)
      }

      const data = await response.json() as any
      const aiResponse = data.choices?.[0]?.message?.content

      if (!aiResponse) {
        console.error('[auto-complete] AI returned empty response, full data:', JSON.stringify(data))
        throw new Error('AI returned empty response')
      }

      console.log('[auto-complete] AI response received, parsing JSON...')

      // Parse JSON from response
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) ||
                         aiResponse.match(/```\n?([\s\S]*?)\n?```/) ||
                         aiResponse.match(/\{[\s\S]*\}/)

      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse
      parsedResult = JSON.parse(jsonStr)
    }

    // Validate and sanitize the result
    const validCategories = INTELLIGENCE_CATEGORIES.map(c => c.value)
    if (!validCategories.includes(parsedResult.category as typeof validCategories[number])) {
      parsedResult.category = 'NEWS'
    }

    parsedResult.importance = Math.max(1, Math.min(5, parsedResult.importance || 3))

    // Validate sectors against known list
    const validSectorCodes = SECTORS.map(s => s.code)
    parsedResult.relatedSectors = (parsedResult.relatedSectors || []).filter(
      s => validSectorCodes.includes(s.code as typeof validSectorCodes[number])
    )

    return NextResponse.json(parsedResult)
  } catch (error) {
    console.error('Auto-complete error:', error)
    return NextResponse.json(
      { error: 'AI分析失败，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * Generate intelligent mock auto-complete result based on content keywords
 */
function generateMockAutoComplete(content: string): {
  title: string
  summary: string
  category: string
  importance: number
  tags: string[]
  relatedStocks: { symbol: string; name: string }[]
  relatedSectors: { code: string; name: string }[]
} {
  const lowerContent = content.toLowerCase()

  // Detect topic and generate appropriate mock
  if (lowerContent.includes('英伟达') || lowerContent.includes('nvidia') || lowerContent.includes('算力') || lowerContent.includes('gpu')) {
    return {
      title: '英伟达AI算力需求持续超预期，数据中心业务高增长',
      summary: '英伟达数据中心业务受AI训练和推理需求驱动，营收持续超市场预期。H100/H200供不应求，下一代Blackwell架构预计将进一步扩大市场份额。',
      category: 'INDUSTRY_TRACK',
      importance: 4,
      tags: ['AI算力', '英伟达', 'GPU', '数据中心', 'Blackwell'],
      relatedStocks: [
        { symbol: 'NVDA', name: '英伟达' },
        { symbol: '002049', name: '紫光国微' },
      ],
      relatedSectors: [
        { code: 'SEMICONDUCTOR', name: '半导体' },
        { code: 'AI_COMPUTING', name: 'AI算力' },
      ],
    }
  }

  if (lowerContent.includes('政策') || lowerContent.includes('发改委') || lowerContent.includes('证监会') || lowerContent.includes('财政部')) {
    return {
      title: '重要政策信号释放，关注监管动向对市场影响',
      summary: '近期政策层面释放重要信号，可能对相关行业和市场情绪产生显著影响。需密切关注后续政策细则落地节奏。',
      category: 'POLICY_RUMOR',
      importance: 4,
      tags: ['政策', '监管', '市场影响'],
      relatedStocks: [],
      relatedSectors: [],
    }
  }

  if (lowerContent.includes('新能源') || lowerContent.includes('光伏') || lowerContent.includes('电池') || lowerContent.includes('储能')) {
    return {
      title: '新能源产业链价格企稳，下游需求回暖信号明确',
      summary: '新能源产业链经历前期调整后，主要环节价格出现企稳迹象，下游装机需求回暖，行业有望进入新一轮景气周期。',
      category: 'INDUSTRY_TRACK',
      importance: 3,
      tags: ['新能源', '光伏', '储能', '产业链'],
      relatedStocks: [
        { symbol: '300750', name: '宁德时代' },
        { symbol: '601012', name: '隆基绿能' },
      ],
      relatedSectors: [
        { code: 'NEW_ENERGY', name: '新能源' },
      ],
    }
  }

  if (lowerContent.includes('会议') || lowerContent.includes('业绩') || lowerContent.includes('财报') || lowerContent.includes('调研')) {
    return {
      title: '重点公司业绩会核心要点梳理',
      summary: '对近期重点公司业绩会/调研会的核心观点和关键数据进行梳理，提炼投资价值相关的增量信息。',
      category: 'MEETING_MINUTES',
      importance: 3,
      tags: ['业绩会', '调研', '财报分析'],
      relatedStocks: [],
      relatedSectors: [],
    }
  }

  if (lowerContent.includes('自动驾驶') || lowerContent.includes('智能驾驶') || lowerContent.includes('特斯拉') || lowerContent.includes('tesla')) {
    return {
      title: '智能驾驶技术突破加速，产业链迎来新机遇',
      summary: '智能驾驶领域近期出现重要技术突破和政策利好，头部企业加速推进L3/L4级自动驾驶商业化落地，产业链上下游有望受益。',
      category: 'INDUSTRY_TRACK',
      importance: 4,
      tags: ['自动驾驶', '智能驾驶', '产业链', 'L4'],
      relatedStocks: [
        { symbol: 'TSLA', name: '特斯拉' },
        { symbol: '002594', name: '比亚迪' },
      ],
      relatedSectors: [
        { code: 'AUTO_DRIVING', name: '自动驾驶' },
      ],
    }
  }

  // Default fallback
  const titleFromContent = content.trim().split('\n')[0].substring(0, 30)
  return {
    title: titleFromContent.length > 5 ? titleFromContent : '市场重要信息跟踪与分析',
    summary: `基于提供的情报内容分析：${content.substring(0, 80).replace(/\n/g, ' ')}...`,
    category: 'NEWS',
    importance: 3,
    tags: ['市场动态', '信息跟踪'],
    relatedStocks: [],
    relatedSectors: [],
  }
}
