import { AIProvider, AnalysisResult, INVESTMENT_ANALYST_PROMPT, BASIC_ANALYST_PROMPT, CHAT_ANALYST_PROMPT, ChatMessage } from './types'
import { injectTimeContext } from '../time-context'

export class SiliconFlowProvider implements AIProvider {
  name = 'SiliconFlow'
  private apiKey: string
  private baseUrl = 'https://api.siliconflow.cn/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async analyze(content: string, fileNames: string[], mode: 'basic' | 'deep' = 'deep'): Promise<AnalysisResult> {
    // 根据模式选择 prompt 和 max_tokens，注入时间上下文
    const basePrompt = mode === 'basic' ? BASIC_ANALYST_PROMPT : INVESTMENT_ANALYST_PROMPT
    const systemPrompt = injectTimeContext(basePrompt)
    const maxTokens = mode === 'basic' ? 800 : 4000
    const contentLimit = mode === 'basic' ? 8000 : 15000

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3', // 或其他模型如 Qwen/Qwen2.5-72B-Instruct
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `请分析以下投资研究文档：

文件名：${fileNames.join(', ')}

文档内容：
${content.substring(0, contentLimit)}

请严格按照 JSON 格式返回分析结果。`,
          },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`SiliconFlow API 错误: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content

    if (!aiResponse) {
      throw new Error('SiliconFlow 返回结果为空')
    }

    return this.parseResponse(aiResponse, mode)
  }

  private parseResponse(response: string, mode: 'basic' | 'deep'): AnalysisResult {
    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                        response.match(/```\n?([\s\S]*?)\n?```/) ||
                        response.match(/\{[\s\S]*\}/)

      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response
      const parsed = JSON.parse(jsonStr)

      const baseResult = {
        summary: parsed.summary || '暂无摘要',
        keyPoints: parsed.keyPoints || [],
        sentiment: this.validateSentiment(parsed.sentiment),
        riskFactors: parsed.riskFactors || [],
        opportunities: parsed.opportunities || [],
        valuation: parsed.valuation || undefined,
        recommendation: this.validateRecommendation(parsed.recommendation),
      }

      // 基础模式只返回基础字段
      if (mode === 'basic') {
        return baseResult
      }

      // 深度模式返回完整字段
      return {
        ...baseResult,
        deepAnalysis: parsed.deepAnalysis || undefined,
        philosophyViews: parsed.philosophyViews || undefined,
        variantView: parsed.variantView || undefined,
        preMortem: parsed.preMortem || undefined,
      }
    } catch (error) {
      console.error('解析 SiliconFlow 响应失败:', error)
      return {
        summary: response.substring(0, 500) + '...',
        keyPoints: ['解析失败，返回原始内容'],
        sentiment: 'neutral',
        riskFactors: [],
        opportunities: [],
      }
    }
  }

  private validateSentiment(sentiment: string): 'positive' | 'neutral' | 'negative' {
    if (sentiment === 'positive' || sentiment === 'negative' || sentiment === 'neutral') {
      return sentiment
    }
    if (sentiment?.includes('涨') || sentiment?.includes('好')) return 'positive'
    if (sentiment?.includes('跌') || sentiment?.includes('差')) return 'negative'
    return 'neutral'
  }

  private validateRecommendation(rec: string): 'buy' | 'hold' | 'sell' | 'watch' | undefined {
    const valid = ['buy', 'hold', 'sell', 'watch']
    if (valid.includes(rec)) return rec as 'buy' | 'hold' | 'sell' | 'watch'
    if (rec?.includes('买')) return 'buy'
    if (rec?.includes('卖')) return 'sell'
    if (rec?.includes('观望') || rec?.includes('观察')) return 'watch'
    if (rec?.includes('持有')) return 'hold'
    return undefined
  }

  // 对话模式 - 支持连续追问
  async chat(messages: ChatMessage[], mode: 'basic' | 'deep' = 'deep'): Promise<string> {
    const maxTokens = mode === 'basic' ? 800 : 2000
    // 注入时间上下文
    const systemPrompt = injectTimeContext(CHAT_ANALYST_PROMPT)

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ],
        temperature: 0.5,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`SiliconFlow API 错误: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content

    if (!aiResponse) {
      throw new Error('SiliconFlow 返回结果为空')
    }

    return aiResponse
  }
}
