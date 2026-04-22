// 财务分析模块统一导出

// Module 1: Core Overview
export { CoreOverviewCard } from './CoreOverview/CoreOverviewCard'
export { RadarChart } from './CoreOverview/RadarChart'
export { TrendCharts } from './CoreOverview/TrendCharts'
export { CompositeScore, ScoreDetail } from './CoreOverview/CompositeScore'

// Module 2: ROE Deep Analysis
export { DuPontDecomposition } from './ROEDeepAnalysis/DuPontDecomposition'

// Module 3: Cash Flow & DCF
export { DCFCalculator } from './CashFlowDCF/DCFCalculator'

// Module 4: Profit Valuation
export { ProfitValuation } from './ProfitValuation/ProfitValuation'

// Module 5: Growth Analysis
export { GrowthAnalysis } from './GrowthAnalysis/GrowthAnalysis'

// Module 6: Financial Health
export { FinancialHealth } from './FinancialHealth/FinancialHealth'

// Module 7: Visualization Controls
export { PeerComparisonSelector } from './VisualizationControls/PeerComparisonSelector'
export { PDFExportButton } from './VisualizationControls/PDFExportButton'

// Charts
export { BaseChart, getChartColors, createGradientColor, formatLargeNumber, formatPercent } from './charts/BaseChart'
export * from './charts/ChartUtils'
