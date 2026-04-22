// 财务分析模块类型定义

// ==================== 基础类型 ====================

/** 股票基本信息 */
export interface StockBasicInfo {
  stock_code: string
  stock_name: string
  industry: string
  sector: string
  market_cap: number // 亿元
  listing_date: string
  exchange: 'SH' | 'SZ' | 'HK'
}

// ==================== Module 1: 雷达评分 ====================

/** 6维度雷达评分 */
export interface RadarScores {
  profitability: number      // 盈利能力 (ROE, 净利率, 毛利率)
  growth: number             // 成长性 (营收增长, 利润增长)
  financial_health: number   // 财务健康 (负债率, 流动比率)
  valuation: number          // 估值吸引力 (PE/PB分位)
  cashflow_quality: number   // 现金流质量 (FCF/净利润)
  dividend: number           // 分红能力 (分红率, 股息率)
}

/** 雷达评分响应 */
export interface RadarResponse {
  success: boolean
  stock_code: string
  scores: RadarScores
  composite_score: number    // 综合评分 (0-100)
  industry_avg_scores: RadarScores
  score_breakdown: {
    profitability: { roe: number; net_margin: number; gross_margin: number }
    growth: { revenue_growth: number; profit_growth: number }
    financial_health: { debt_ratio: number; current_ratio: number }
    valuation: { pe_percentile: number; pb_percentile: number }
    cashflow_quality: { fcf_to_profit: number; ocf_to_profit: number }
    dividend: { dividend_ratio: number; dividend_yield: number }
  }
}

// ==================== Module 2: 杜邦分解 ====================

/** 三阶段杜邦分解 */
export interface DuPont3Stage {
  roe: number                // ROE (%)
  net_margin: number         // 净利率 (%)
  asset_turnover: number     // 资产周转率
  equity_multiplier: number  // 权益乘数
}

/** 五阶段杜邦分解 */
export interface DuPont5Stage {
  roe: number
  tax_burden: number         // 税负影响 (净利润/税前利润)
  interest_burden: number    // 利息负担 (税前利润/EBIT)
  operating_margin: number   // 经营利润率 (EBIT/营收)
  asset_turnover: number     // 资产周转率
  equity_multiplier: number  // 权益乘数
}

/** 杜邦分解历史数据 */
export interface DuPontHistory {
  year: string
  roe: number
  net_margin?: number
  asset_turnover?: number
  equity_multiplier?: number
  revenue?: number           // 营收 (亿元)
  net_profit?: number        // 净利润 (亿元)
}

/** 杜邦分解响应 */
export interface DuPontResponse {
  success: boolean
  stock_code: string
  dupont_3stage: DuPont3Stage
  dupont_5stage: DuPont5Stage
  history: DuPontHistory[]
  decomposition_contribution: {
    net_margin_contribution: number
    asset_turnover_contribution: number
    equity_multiplier_contribution: number
  }
}

// ==================== Module 3: DCF模型 ====================

/** DCF计算参数 */
export interface DCFParams {
  wacc_adjustment: number    // WACC调整值 (±2%)
  growth_adjustment: number  // 永续增长率调整 (±3%)
  projection_years: number   // 预测年数 (默认10)
}

/** FCF历史数据 */
export interface FCFData {
  year: string
  operating_cf: number       // 经营现金流 (亿元)
  capex: number              // 资本支出 (亿元)
  net_profit?: number        // 净利润 (亿元)
  fcf: number                // 自由现金流 (亿元)
  fcf_growth_rate?: number   // FCF增长率 (%)
}

/** DCF敏感性矩阵项 */
export interface SensitivityItem {
  wacc: number               // WACC值 (%)
  g: number                  // 永续增长率 (%)
  value: number              // 估值结果 (元)
}

/** DCF响应 */
export interface DCFResponse {
  success: boolean
  stock_code: string
  intrinsic_value: number    // 内在价值 (元)
  current_price: number      // 当前股价 (元)
  margin_of_safety: number   // 安全边际 (%)
  wacc_base: number          // 基准WACC (%)
  growth_base: number        // 基准增长率 (%)
  wacc_used?: number         // 实际使用的 WACC (%)
  growth_used?: number       // 实际使用的增长率 (%)
  wacc_adjustment?: number   // WACC 调整量
  growth_adjustment?: number // 增长率调整量
  fcf_projection: number[]   // FCF预测序列
  fcf_history: FCFData[]
  sensitivity_matrix: SensitivityItem[]
}

// ==================== Module 4: 估值指标 ====================

/** 估值指标 */
export interface ValuationMetrics {
  pe_ttm: number             // PE(TTM)
  pb: number                 // PB
  ps: number                 // PS
  peg: number                // PEG
  industry_pe: number        // 行业PE
  industry_pb: number        // 行业PB
  pe_percentile: number      // PE历史分位 (%)
  pb_percentile: number      // PB历史分位 (%)
}

/** PE历史数据 */
export interface PEHistoryData {
  date: string
  pe: number
  price: number
}

/** PE分位数 */
export interface PEPercentiles {
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
}

/** 目标价情景 */
export interface TargetPriceScenarios {
  optimistic: number         // 乐观目标价 (P90 PE × EPS)
  neutral: number            // 中性目标价 (P50 PE × EPS)
  pessimistic: number        // 悲观目标价 (P10 PE × EPS)
  upside_potential: {
    optimistic: number       // 乐观上涨空间 (%)
    neutral: number          // 中性上涨空间 (%)
    pessimistic: number      // 悲观上涨空间 (%)
  }
}

/** PE Band响应 */
export interface PEBandResponse {
  success: boolean
  stock_code: string
  pe_history: PEHistoryData[]
  pe_percentiles: PEPercentiles
  current_pe: number
  current_eps: number
  target_prices: TargetPriceScenarios
  graham_number: number      // Graham Number: √(22.5 × EPS × BVPS)
}

export interface ValuationApiResponse {
  success: boolean
  metrics?: {
    pe_ttm?: number
    pb?: number
    ps?: number
    market_cap?: string
    net_profit?: number
    revenue?: number
    net_assets?: number
    latest_price?: number
    industry_avg_pe?: number
    industry_avg_pb?: number
    data_source?: string
  }
  pe_percentile?: number
  pb_percentile?: number
  stock_info?: {
    industry?: string
    sector?: string
  }
}

// ==================== Module 5: 成长性分析 ====================

/** CAGR数据 */
export interface CAGRData {
  revenue_3yr?: number       // 营收3年CAGR (%)
  revenue_5yr?: number       // 营收5年CAGR (%)
  revenue_10yr?: number      // 营收10年CAGR (%)
  profit_3yr?: number        // 净利润3年CAGR (%)
  profit_5yr?: number        // 净利润5年CAGR (%)
  profit_10yr?: number       // 净利润10年CAGR (%)
  eps_3yr?: number           // EPS 3年CAGR (%)
  eps_5yr?: number           // EPS 5年CAGR (%)
}

/** 季度增长数据 */
export interface QuarterlyGrowth {
  quarter: string
  revenue_yoy?: number       // 营收同比 (%)
  revenue_qoq?: number       // 营收环比 (%)
  profit_yoy?: number        // 净利润同比 (%)
  profit_qoq?: number        // 净利润环比 (%)
}

/** 成长性响应 */
export interface GrowthResponse {
  success: boolean
  stock_code: string
  cagr: CAGRData
  quarterly_growth: QuarterlyGrowth[]
  sustainability_score: number  // 成长可持续性评分 (0-100)
  growth_quality: '高速增长' | '稳定增长' | '缓慢增长' | '负增长'
  history?: GrowthHistoryItem[]  // 年度历史数据
  data_source?: string
}

/** 成长性历史数据 */
export interface GrowthHistoryItem {
  year: string
  revenue: number           // 营收 (亿元)
  net_profit: number        // 净利润 (亿元)
  revenue_growth: number    // 营收增长率 (%)
  profit_growth: number     // 净利润增长率 (%)
}

// ==================== Module 6: 风险预警 ====================

/** 负债指标 */
export interface DebtRatios {
  asset_liability_ratio: number  // 资产负债率 (%)
  current_ratio: number          // 流动比率
  quick_ratio: number            // 速动比率
  debt_to_equity: number         // 产权比率
}

/** 财务造假检测 */
export interface FraudDetection {
  benford_score: number          // Benford定律符合度 (0-1)
  accrual_quality: number        // 应计质量 (0-1)
  m_score: number                // Beneish M-Score
  risk_level: '低风险' | '中风险' | '高风险'
}

/** 风险预警项 */
export interface RiskWarning {
  type: string                   // 风险类型
  severity: '高' | '中' | '低'   // 严重程度
  detail: string                 // 详细描述
  indicator: string              // 相关指标
}

/** 风险响应 */
export interface RiskResponse {
  success: boolean
  stock_code: string
  debt_ratios: DebtRatios
  fraud_detection: FraudDetection
  warnings: RiskWarning[]
  overall_risk_score?: number     // 综合风险评分 (0-100, 越低越安全)
  health_score?: number           // 财务健康评分 (0-100, 越高越健康)
  latest_year?: string            // 数据年份
  data_source?: string            // 数据来源
}

// ==================== Module 7: 同行对比 ====================

/** 同行公司数据 */
export interface PeerData {
  stock_code: string
  stock_name: string
  revenue: number                // 营收 (亿元)
  net_margin: number             // 净利率 (%)
  roe: number                    // ROE (%)
  pe: number                     // PE
  pb: number                     // PB
  market_cap: number             // 市值 (亿元)
}

/** 同行对比响应 */
export interface PeerComparisonResponse {
  success: boolean
  stock_code: string
  peers: PeerData[]
  industry_avg: {
    revenue: number
    net_margin: number
    roe: number
    pe: number
    pb: number
  }
}

// ==================== 历史快照 ====================

/** 历史快照响应 */
export interface HistoricalSnapshot {
  success: boolean
  stock_code: string
  snapshot_date: string          // 快照日期
  price: number                  // 当时股价
  pe: number                     // 当时PE
  pb: number                     // 当时PB
  financials: {
    revenue: number
    net_profit: number
    roe: number
    debt_ratio: number
  }
}

// ==================== 综合财务数据 ====================

/** 10年趋势数据 */
export interface TenYearTrend {
  year: string
  revenue: number                // 营收 (亿元)
  net_profit: number             // 净利润 (亿元)
  roe: number                    // ROE (%)
  eps?: number                   // EPS (元)
  dividend?: number              // 分红 (元/股)
}

/** 综合财务数据响应 */
export interface FinancialDataResponse {
  success: boolean
  stock_code: string
  stock_name: string
  basic_info: StockBasicInfo
  radar: RadarResponse
  dupont: DuPontResponse
  dcf: DCFResponse
  valuation: ValuationMetrics
  pe_band: PEBandResponse
  growth: GrowthResponse
  risk: RiskResponse
  ten_year_trend: TenYearTrend[]
  last_updated: string
}

// ==================== UI组件Props ====================

/** 财务分析模块Props */
export interface FinancialAnalysisProps {
  stockCode: string
  stockName?: string
  isDark?: boolean
  defaultTab?: 'overview' | 'roe' | 'dcf' | 'valuation' | 'growth' | 'risk'
  modulesData?: {
    radar?: RadarResponse
    dupont?: DuPontResponse
    dcf?: DCFResponse
    dcfParams?: DCFParams
    updateDCFParams?: (params: DCFParams) => void
    peBand?: PEBandResponse
    growth?: GrowthResponse
    risk?: RiskResponse
    valuation?: ValuationApiResponse
    isLoading?: boolean
    hasError?: unknown
  }
}

/** DCF计算器Props */
export interface DCFCalculatorProps {
  dcfData: DCFResponse
  onParamsChange: (params: DCFParams) => void
  isDark?: boolean
}

/** 雷达图Props */
export interface RadarChartProps {
  scores: RadarScores
  industryAvg?: RadarScores
  compositeScore?: number
  isDark?: boolean
}

/** 瀑布图Props */
export interface WaterfallChartProps {
  data: DuPont3Stage
  contributions: {
    net_margin_contribution: number
    asset_turnover_contribution: number
    equity_multiplier_contribution: number
  }
  isDark?: boolean
}
