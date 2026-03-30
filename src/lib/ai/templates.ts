/**
 * AI Analysis Templates
 * 专业分析模板 - 用于生成结构化、格式化的分析报告
 */

export type TemplateType = 'valuation' | 'peer_comparison' | 'risk_analysis' | 'forecast' | 'financial_summary'

export interface AnalysisTemplate {
  id: TemplateType
  name: string
  description: string
  prompt: string
  outputFormat: string
  requiredData: string[]
}

/**
 * 估值分析模板
 */
export const VALUATION_TEMPLATE: AnalysisTemplate = {
  id: 'valuation',
  name: '估值分析',
  description: 'DCF/PE/PB估值模型分析，包含敏感性分析',
  prompt: `请根据以下数据进行估值分析：

## 分析要点
1. 当前估值水平（PE、PB、PS）
2. 与行业平均值对比
3. 历史估值分位数分析
4. DCF估值测算（如有数据）
5. 估值结论与投资建议`,
  outputFormat: `
## 估值分析报告

### 当前估值水平
| 指标 | 当前值 | 行业平均 | 历史分位 | 评价 |
|------|--------|----------|----------|------|
| PE(TTM) | xx | xx | xx% | 低估/合理/高估 |
| PB | xx | xx | xx% | 低估/合理/高估 |
| PS | xx | xx | xx% | 低估/合理/高估 |
| 市值 | xx亿 | - | - | - |

### DCF估值测算（敏感性分析）
| WACC | 永续增长率 | 目标价 | 较现价涨幅 |
|------|-----------|-------|----------|
| 8% | 2% | xx元 | xx% |
| 9% | 2% | xx元 | xx% |
| 10% | 2% | xx元 | xx% |

### 估值结论
- **估值水平**: [低估/合理/高估]
- **投资建议**: [买入/持有/卖出]
- **风险提示**: xxx`,
  requiredData: ['pe_ttm', 'pb', 'ps', 'market_cap', 'net_profit', 'revenue', 'industry_avg_pe', 'industry_avg_pb']
}

/**
 * 竞品对比模板
 */
export const PEER_COMPARISON_TEMPLATE: AnalysisTemplate = {
  id: 'peer_comparison',
  name: '竞品对比',
  description: '同行业公司对比分析，包含优劣势分析',
  prompt: `请根据以下数据进行同行竞品对比分析：

## 分析要点
1. 规模对比（营收、净利润、市值）
2. 效率对比（ROE、毛利率、净利率）
3. 增长对比（营收增速、利润增速）
4. 估值对比（PE、PB）
5. 竞争优势与劣势分析`,
  outputFormat: `
## 竞品对比分析报告

### 核心指标对比
| 公司 | 营收(亿) | 净利润(亿) | ROE | 毛利率 | PE | PB |
|------|---------|-----------|-----|--------|-----|-----|
| A公司 | xx | xx | xx% | xx% | xx | xx |
| B公司 | xx | xx | xx% | xx% | xx | xx |
| C公司 | xx | xx | xx% | xx% | xx | xx |
| **行业平均** | xx | xx | xx% | xx% | xx | xx |

### 规模分析
- **最大营收**: xx公司 (xx亿)
- **最大利润**: xx公司 (xx亿)
- **市场份额**: xx公司领先

### 效率分析
- **最高ROE**: xx公司 (xx%)
- **最高毛利率**: xx公司 (xx%)

### 竞争优势
**xx公司优势**:
1. xxx
2. xxx

**xx公司劣势**:
1. xxx
2. xxx

### 投资建议
- **首选标的**: xx公司（原因：xxx）
- **稳健选择**: xx公司（原因：xxx）`,
  requiredData: ['revenue', 'net_profit', 'roe', 'gross_margin', 'pe', 'pb', 'peer_data']
}

/**
 * 风险分析模板
 */
export const RISK_ANALYSIS_TEMPLATE: AnalysisTemplate = {
  id: 'risk_analysis',
  name: '风险分析',
  description: '识别潜在风险因素，提供风险矩阵和应对建议',
  prompt: `请根据以下数据进行风险分析：

## 分析要点
1. 财务风险（负债率、现金流、盈利波动）
2. 经营风险（行业周期、竞争格局）
3. 政策风险（监管变化、政策影响）
4. 市场风险（估值风险、流动性风险）
5. 风险评级与应对建议`,
  outputFormat: `
## 风险分析报告

### 风险矩阵
| 风险类型 | 风险等级 | 影响程度 | 发生概率 | 应对措施 |
|----------|----------|----------|----------|----------|
| 财务风险 | 高/中/低 | 大/中/小 | 高/中/低 | xxx |
| 经营风险 | 高/中/低 | 大/中/小 | 高/中/低 | xxx |
| 政策风险 | 高/中/低 | 大/中/小 | 高/中/低 | xxx |
| 市场风险 | 高/中/低 | 大/中/小 | 高/中/低 | xxx |

### 财务风险分析
- **资产负债率**: xx%（风险等级：高/中/低）
- **经营现金流**: xx亿（风险等级：充足/紧张）
- **盈利稳定性**: [稳定/波动大]

### 经营风险分析
- **行业周期**: [上行/下行/平稳]
- **竞争格局**: [垄断/寡头/分散]
- **核心风险**: xxx

### 政策风险分析
- **监管环境**: [宽松/收紧]
- **政策影响**: xxx

### 综合风险评级
- **总体风险**: [低风险/中等风险/高风险]
- **建议仓位**: [重仓/标配/轻仓/回避]`,
  requiredData: ['debt_ratio', 'cash_flow', 'profit_stability', 'industry_cycle', 'competition']
}

/**
 * 业绩预测模板
 */
export const FORECAST_TEMPLATE: AnalysisTemplate = {
  id: 'forecast',
  name: '业绩预测',
  description: '未来业绩预测，包含预测表格和假设说明',
  prompt: `请根据以下数据进行业绩预测分析：

## 分析要点
1. 历史业绩趋势分析
2. 行业增长趋势
3. 关键假设说明
4. 未来3年业绩预测
5. 预测可靠性评估`,
  outputFormat: `
## 业绩预测报告

### 历史业绩回顾
| 年份 | 营收(亿) | 净利润(亿) | 增速 |
|------|---------|-----------|------|
| 2022 | xx | xx | xx% |
| 2023 | xx | xx | xx% |
| 2024 | xx | xx | xx% |

### 业绩预测
| 年份 | 营收(亿) | 净利润(亿) | 增速 | 假设说明 |
|------|---------|-----------|------|----------|
| 2025E | xx | xx | xx% | xxx |
| 2026E | xx | xx | xx% | xxx |
| 2027E | xx | xx | xx% | xxx |

### 关键假设
1. **营收假设**: xxx
2. **毛利率假设**: xxx
3. **费用率假设**: xxx
4. **税率假设**: xxx

### 预测可靠性
- **预测可信度**: [高/中/低]
- **核心假设风险**: xxx
- **不确定性因素**: xxx

### 投资建议
基于业绩预测，给予[买入/持有/卖出]建议`,
  requiredData: ['historical_revenue', 'historical_profit', 'growth_rate', 'margin_trend']
}

/**
 * 财务摘要模板
 */
export const FINANCIAL_SUMMARY_TEMPLATE: AnalysisTemplate = {
  id: 'financial_summary',
  name: '财务摘要',
  description: '核心财务数据对比表格',
  prompt: `请生成财务数据摘要表格：`,
  outputFormat: `
### 核心财务数据对比

| 指标 | 2023年 | 2024年 | 同比变化 |
|------|--------|--------|----------|
| 营业收入 | xx亿元 | xx亿元 | +xx% |
| 归母净利润 | xx亿元 | xx亿元 | +xx% |
| 毛利率 | xx% | xx% | +xxpct |
| ROE | xx% | xx% | +xxpct |
| 经营性现金流 | xx亿元 | xx亿元 | +xx% |
| 资产负债率 | xx% | xx% | -xxpct |

### 主要产品/业务数据

| 产品/业务 | 2023年 | 2024年 | 同比变化 |
|------|--------|--------|----------|
| 主要产品1 | xx万吨 | xx万吨 | +xx% |
| 主要产品2 | xx吨 | xx吨 | +xx% |
`,
  requiredData: ['revenue', 'net_profit', 'gross_margin', 'roe', 'cash_flow', 'debt_ratio']
}

/**
 * 所有模板集合
 */
export const ANALYSIS_TEMPLATES: Record<TemplateType, AnalysisTemplate> = {
  valuation: VALUATION_TEMPLATE,
  peer_comparison: PEER_COMPARISON_TEMPLATE,
  risk_analysis: RISK_ANALYSIS_TEMPLATE,
  forecast: FORECAST_TEMPLATE,
  financial_summary: FINANCIAL_SUMMARY_TEMPLATE
}

/**
 * 根据问题类型推荐模板
 */
export function suggestTemplate(question: string): TemplateType | null {
  if (question.includes('估值') || question.includes('PE') || question.includes('PB') ||
      question.includes('市盈率') || question.includes('市净率') || question.includes('贵') ||
      question.includes('便宜') || question.includes('DCF')) {
    return 'valuation'
  }

  if (question.includes('同行') || question.includes('竞品') || question.includes('对比') ||
      question.includes('比较') || question.includes('竞争对手')) {
    return 'peer_comparison'
  }

  if (question.includes('风险') || question.includes('危险') || question.includes('隐患')) {
    return 'risk_analysis'
  }

  if (question.includes('预测') || question.includes('展望') || question.includes('未来') ||
      question.includes('预期') || question.includes('增速')) {
    return 'forecast'
  }

  if (question.includes('财务') || question.includes('业绩') || question.includes('年报') ||
      question.includes('数据')) {
    return 'financial_summary'
  }

  return null
}

/**
 * 获取模板的系统提示词增强
 */
export function getTemplateSystemPrompt(templateType: TemplateType): string {
  const template = ANALYSIS_TEMPLATES[templateType]
  if (!template) return ''

  return `
## 当前分析模板: ${template.name}

请按照以下格式输出分析结果：

${template.outputFormat}

**重要**: 所有数据必须精确标注来源，不要编造数据。如果缺少某项数据，标注为"数据缺失"。
`
}

/**
 * 模板列表（供前端选择）
 */
export const TEMPLATE_LIST = Object.values(ANALYSIS_TEMPLATES).map(t => ({
  id: t.id,
  name: t.name,
  description: t.description,
  requiredData: t.requiredData
}))