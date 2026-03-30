import { DeepSeekProvider } from './deepseek'
import { SiliconFlowProvider } from './siliconflow'
import { MiniMaxProvider } from './minimax'
import { AIProvider, AnalysisResult, ChatMessage } from './types'

// 导出模板和验证器
export * from './templates'
export * from './validator'

// 模拟 AI 提供商（当没有配置真实 API 时使用）
class MockProvider implements AIProvider {
  name = 'Mock'
  async analyze(content: string, fileNames: string[], mode: 'basic' | 'deep' = 'deep'): Promise<AnalysisResult> {
    // 模拟处理延迟
    await new Promise((resolve) => setTimeout(resolve, mode === 'basic' ? 500 : 1500))

    // 基于文件名智能返回不同的模拟结果
    const names = fileNames.join(' ').toLowerCase()

    const baseResult: AnalysisResult = {
      summary: names.includes('nvidia') || names.includes('英伟达')
        ? '英伟达数据中心业务持续高增长，AI芯片需求强劲'
        : '基于文档内容的投资分析摘要',
      keyPoints: [
        '关键要点1：业务增长强劲',
        '关键要点2：估值处于合理区间',
        '关键要点3：风险因素可控',
      ],
      sentiment: 'positive',
      riskFactors: ['市场波动风险', '竞争加剧风险'],
      opportunities: ['AI增长机会', '市场份额扩大'],
      recommendation: 'hold',
    }

    // 基础模式只返回基础字段
    if (mode === 'basic') {
      return baseResult
    }

    // 深度模式返回完整字段
    return {
      ...baseResult,
      deepAnalysis: {
        business: {
          coreStrength: '技术领先，市场份额第一',
          newNarrative: 'AI基础设施需求持续增长',
        },
        keyMetrics: {
          metrics: ['收入增长率 50%', '毛利率 75%', '市场份额 80%'],
          trends: '各项指标持续向好',
        },
        valuationDeep: {
          methods: 'DCF、PE比较法',
          assumptions: '未来3年收入复合增长率30%',
          scenarios: { bull: '$500', base: '$400', bear: '$300' },
        },
        monitoring: {
          drivers: ['AI需求增长', '新产品发布'],
          risks: ['竞争加剧', '供应链风险'],
          triggers: ['跌破$350买入', '涨至$450减仓'],
        },
      },
      philosophyViews: {
        buffett: { view: '观望', reasoning: '估值偏高，等待更好入场点' },
        ark: { view: '看多', reasoning: 'AI长期增长潜力巨大' },
        tiger: { view: '看多', reasoning: '基本面强劲，业绩持续超预期' },
        klarman: { view: '观望', reasoning: '安全边际不足' },
        tepper: { view: '看多', reasoning: 'AI催化剂明确' },
        druck: { view: '看多', reasoning: '流动性环境有利' },
      },
      variantView: {
        consensus: '市场普遍看好AI增长前景',
        ourView: 'AI增长确定性高但估值已反映',
        whyDifferent: '更关注估值安全边际',
      },
      preMortem: [
        'AI需求不及预期，增速放缓',
        '竞争加剧导致利润率下滑',
      ],
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 800))
    const lastMessage = messages[messages.length - 1]?.content || ''
    return `这是对"${lastMessage.slice(0, 30)}..."的模拟回复。在实际配置API后，我将基于之前的分析内容为您提供深入解答。`
  }
}

export class AIService {
  private providers: Map<string, AIProvider> = new Map()
  private defaultProvider: string

  constructor() {
    // 初始化所有可用的提供商
    // MiniMax - 优先加载作为默认
    if (process.env.MINIMAX_API_KEY) {
      const model = process.env.MINIMAX_MODEL || 'MiniMax-M2.7'
      this.providers.set('minimax', new MiniMaxProvider(process.env.MINIMAX_API_KEY, model))
    }

    if (process.env.DEEPSEEK_API_KEY) {
      this.providers.set('deepseek', new DeepSeekProvider(process.env.DEEPSEEK_API_KEY))
    }

    if (process.env.SILICONFLOW_API_KEY) {
      this.providers.set('siliconflow', new SiliconFlowProvider(process.env.SILICONFLOW_API_KEY))
    }

    // 如果没有配置任何真实提供商，使用模拟提供商
    if (this.providers.size === 0) {
      console.warn('警告: 没有配置任何 AI 提供商，使用模拟数据进行演示')
      this.providers.set('mock', new MockProvider())
      this.defaultProvider = 'mock'
    } else {
      // 设置默认提供商 - MiniMax 优先
      const configuredDefault = process.env.DEFAULT_AI_PROVIDER
      if (configuredDefault && this.providers.has(configuredDefault)) {
        this.defaultProvider = configuredDefault
      } else if (this.providers.has('minimax')) {
        this.defaultProvider = 'minimax'
      } else if (this.providers.has('deepseek')) {
        this.defaultProvider = 'deepseek'
      } else if (this.providers.has('siliconflow')) {
        this.defaultProvider = 'siliconflow'
      } else {
        this.defaultProvider = this.providers.keys().next().value!
      }
    }
  }

  /**
   * 分析文档内容
   */
  async analyze(
    files: { name: string; content: string }[],
    mode: 'basic' | 'deep' = 'deep',
    provider?: string
  ): Promise<AnalysisResult> {
    const providerName = provider || this.defaultProvider
    const aiProvider = this.providers.get(providerName)

    if (!aiProvider) {
      throw new Error(`未找到 AI 提供商: ${providerName}`)
    }

    // 合并多个文件的内容
    const combinedContent = files
      .map((f) => `=== ${f.name} ===\n${f.content}`)
      .join('\n\n')

    const fileNames = files.map((f) => f.name)

    return aiProvider.analyze(combinedContent, fileNames, mode)
  }

  /**
   * 获取当前可用的提供商列表
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * 获取默认提供商名称
   */
  getDefaultProvider(): string {
    return this.defaultProvider
  }

  /**
   * 对话模式 - 支持连续追问
   */
  async chat(
    messages: ChatMessage[],
    mode: 'basic' | 'deep' = 'deep',
    provider?: string
  ): Promise<string> {
    const providerName = provider || this.defaultProvider
    const aiProvider = this.providers.get(providerName)

    if (!aiProvider) {
      throw new Error(`未找到 AI 提供商: ${providerName}`)
    }

    if (!aiProvider.chat) {
      throw new Error(`AI 提供商 ${providerName} 不支持对话模式`)
    }

    return aiProvider.chat(messages, mode)
  }
}

// 导出单例
export const aiService = new AIService()