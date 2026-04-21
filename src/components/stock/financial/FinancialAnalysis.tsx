'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, AlertCircle } from 'lucide-react'

// 组件导入
import {
  CoreOverviewCard,
  DuPontDecomposition,
  DCFCalculator,
  ProfitValuation,
  GrowthAnalysis,
  FinancialHealth,
  TimeTravelSlider,
  PeerComparisonSelector,
  PDFExportButton
} from './index'

// Hooks
import { useAllFinancialModules } from '@/hooks/useFinancialData'

// Types
import type { PeerData, TenYearTrend, FinancialAnalysisProps } from '@/types/financial'

/**
 * 财务分析模块主容器组件
 * 整合7个子模块，提供完整的财务分析功能
 */
export function FinancialAnalysis({
  stockCode,
  stockName,
  isDark = false,
  defaultTab = 'overview'
}: FinancialAnalysisProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [selectedPeers, setSelectedPeers] = useState<string[]>([])
  const [selectedYear, setSelectedYear] = useState<string>()
  const [isExporting, setIsExporting] = useState(false)

  // 获取所有财务数据
  const {
    radar,
    dupont,
    dcf,
    dcfParams,
    updateDCFParams,
    peBand,
    growth,
    risk,
    valuation,
    isLoading,
    hasError
  } = useAllFinancialModules(stockCode)

  // 可用年份列表（用于时间穿越）
  const availableYears = useMemo(() => {
    if (!dupont?.history) return []
    return dupont.history.map(h => h.year ?? '').filter(Boolean)
  }, [dupont])

  // 同行数据
  const availablePeers: PeerData[] = useMemo(() => {
    return []
  }, [])

  // 处理PDF导出
  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      console.log('Exporting PDF for', stockCode)
    } catch (error) {
      console.error('PDF export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // 解析市值字符串
  const parseMarketCap = (marketCapStr?: string): number => {
    if (!marketCapStr) return 0
    const match = marketCapStr.match(/([\d.]+)亿/)
    if (match) return parseFloat(match[1])
    return 0
  }

  // 基本信息从valuation数据提取
  const basicInfo = useMemo(() => {
    const marketCapValue = parseMarketCap(valuation?.metrics?.market_cap)
    const exchange: 'SH' | 'SZ' | 'HK' = stockCode.startsWith('6') ? 'SH' :
               stockCode.startsWith('0') || stockCode.startsWith('3') ? 'SZ' : 'HK'
    return {
      stock_code: stockCode,
      stock_name: stockName || '',
      industry: (valuation as any)?.stock_info?.industry || '',
      sector: '',
      market_cap: marketCapValue,
      listing_date: '',
      exchange
    }
  }, [stockCode, stockName, valuation])

  // 10年趋势数据（从杜邦历史提取）
  const tenYearTrend: TenYearTrend[] = useMemo(() => {
    if (!dupont?.history) return []
    return dupont.history.map(h => ({
      year: h.year ?? '',
      revenue: h.revenue ?? 0,
      net_profit: h.net_profit ?? 0,
      roe: h.roe ?? 0
    }))
  }, [dupont])

  // 加载状态 - 只要有核心数据（雷达、杜邦）就显示，不等待全部
  const hasCoreData = radar || dupont
  const isInitialLoading = isLoading && !hasCoreData

  if (isInitialLoading) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="flex flex-col items-center justify-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-foreground font-medium">财务分析数据加载中...</p>
            <p className="text-sm text-muted-foreground mt-1">正在从本地财报数据库获取数据</p>
          </div>
        </div>
      </Card>
    )
  }

  // 如果有错误但无数据，显示错误
  if (hasError && !hasCoreData) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="w-10 h-10 text-yellow-500" />
          <div>
            <p className="text-foreground font-medium">财务数据加载失败</p>
            <p className="text-sm text-muted-foreground mt-2">请检查后端服务是否正常运行</p>
            <p className="text-xs text-muted-foreground mt-1">数据源: 本地财报数据库 ({stockCode})</p>
          </div>
        </div>
      </Card>
    )
  }

  // 计算综合评分
  const compositeScore = radar?.composite_score

  // Tab配置
  const tabConfig = [
    { value: 'overview', label: '核心概览', hasData: !!radar },
    { value: 'roe', label: 'ROE分析', hasData: !!dupont },
    { value: 'dcf', label: 'DCF估值', hasData: !!dcf },
    { value: 'valuation', label: '估值体系', hasData: !!valuation?.success || !!peBand },
    { value: 'growth', label: '成长性', hasData: !!growth },
    { value: 'risk', label: '风险预警', hasData: !!risk },
  ]

  return (
    <div className="space-y-4">
      {/* 标题和操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">财务分析</h2>
          {compositeScore !== undefined && (
            <Badge variant="outline" className="text-sm">
              综合评分: <span className="font-bold text-primary">{compositeScore}</span>
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <PDFExportButton
            stockCode={stockCode}
            stockName={stockName}
            onExport={handleExportPDF}
            isExporting={isExporting}
            isDark={isDark}
          />
        </div>
      </div>

      {/* 数据来源提示 */}
      {hasCoreData && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
          数据来源: 本地财报数据库 | 年报: {dupont?.history?.length ?? 0}年
          {growth?.quarterly_growth && ` | 季报: ${growth.quarterly_growth.length}季度`}
        </div>
      )}

      {/* 交互控件区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableYears.length > 0 && (
          <TimeTravelSlider
            availableYears={availableYears}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            isDark={isDark}
          />
        )}
        {availablePeers.length > 0 && (
          <PeerComparisonSelector
            availablePeers={availablePeers}
            selectedPeers={selectedPeers}
            onPeerSelect={setSelectedPeers}
            maxPeers={5}
            isDark={isDark}
          />
        )}
      </div>

      {/* 主内容区 - Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1 p-1 bg-muted/50">
          {tabConfig.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all"
            >
              {tab.label}
              {!tab.hasData && (
                <span className="ml-1 text-xs text-muted-foreground">(加载中)</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <CoreOverviewCard
            stockCode={stockCode}
            basicInfo={basicInfo}
            radarData={radar}
            tenYearTrend={tenYearTrend}
            isDark={isDark}
          />
        </TabsContent>

        <TabsContent value="roe" className="mt-0">
          <DuPontDecomposition
            data={dupont}
            isLoading={isLoading && !dupont}
            isDark={isDark}
          />
        </TabsContent>

        <TabsContent value="dcf" className="mt-0">
          <DCFCalculator
            data={dcf}
            onParamsChange={updateDCFParams}
            isDark={isDark}
          />
        </TabsContent>

        <TabsContent value="valuation" className="mt-0">
          <ProfitValuation
            valuationData={valuation?.success ? {
              pe_ttm: valuation.metrics?.pe_ttm ?? 0,
              pb: valuation.metrics?.pb ?? 0,
              ps: valuation.metrics?.ps ?? 0,
              peg: 0,
              pe_percentile: valuation.pe_percentile ?? 50,
              pb_percentile: valuation.pb_percentile ?? 50,
              industry_pe: valuation.metrics?.industry_avg_pe ?? 0,
              industry_pb: valuation.metrics?.industry_avg_pb ?? 0
            } : undefined}
            peBandData={peBand}
            isLoading={isLoading && !valuation && !peBand}
            isDark={isDark}
          />
        </TabsContent>

        <TabsContent value="growth" className="mt-0">
          <GrowthAnalysis
            data={growth}
            isLoading={isLoading && !growth}
            isDark={isDark}
          />
        </TabsContent>

        <TabsContent value="risk" className="mt-0">
          <FinancialHealth
            data={risk}
            isLoading={isLoading && !risk}
            isDark={isDark}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}