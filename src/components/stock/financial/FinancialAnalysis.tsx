'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAllFinancialModules } from '@/hooks/useFinancialData'
import type { FinancialAnalysisProps, PeerData, TenYearTrend } from '@/types/financial'
import {
  CoreOverviewCard,
  DCFCalculator,
  DuPontDecomposition,
  FinancialHealth,
  GrowthAnalysis,
  PDFExportButton,
  PeerComparisonSelector,
  ProfitValuation,
} from './index'

export function FinancialAnalysis({
  stockCode,
  stockName,
  isDark = false,
  defaultTab = 'overview',
  modulesData,
}: FinancialAnalysisProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [selectedPeers, setSelectedPeers] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)

  const fetchedModules = useAllFinancialModules(stockCode)
  const {
    radar,
    dupont,
    dcf,
    updateDCFParams,
    peBand,
    growth,
    risk,
    valuation,
    isLoading,
    hasError,
  } = modulesData ?? fetchedModules

  const availablePeers: PeerData[] = useMemo(() => [], [])

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

  const parseMarketCap = (marketCapStr?: string): number => {
    if (!marketCapStr) return 0

    const yiMatch = marketCapStr.match(/([\d.]+)\s*亿/)
    if (yiMatch) return Number.parseFloat(yiMatch[1])

    const wanYiMatch = marketCapStr.match(/([\d.]+)\s*万亿/)
    if (wanYiMatch) return Number.parseFloat(wanYiMatch[1]) * 10000

    const numericValue = Number.parseFloat(marketCapStr.replace(/[^\d.]/g, ''))
    if (Number.isFinite(numericValue)) return numericValue

    return 0
  }

  const basicInfo = useMemo(() => {
    const marketCapValue = parseMarketCap(valuation?.metrics?.market_cap)
    const exchange: 'SH' | 'SZ' | 'HK' = stockCode.startsWith('6')
      ? 'SH'
      : stockCode.startsWith('0') || stockCode.startsWith('3')
        ? 'SZ'
        : 'HK'

    return {
      stock_code: stockCode,
      stock_name: stockName || '',
      industry: valuation?.stock_info?.industry || '',
      sector: '',
      market_cap: marketCapValue,
      listing_date: '',
      exchange,
    }
  }, [stockCode, stockName, valuation])

  const tenYearTrend: TenYearTrend[] = useMemo(() => {
    if (!dupont?.history) return []
    return dupont.history.map((item) => ({
      year: item.year ?? '',
      revenue: item.revenue ?? 0,
      net_profit: item.net_profit ?? 0,
      roe: item.roe ?? 0,
    }))
  }, [dupont])

  const hasCoreData = Boolean(radar || dupont)
  const isInitialLoading = isLoading && !hasCoreData

  if (isInitialLoading) {
    return (
      <Card className="border-border bg-card p-6">
        <div className="flex flex-col items-center justify-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium text-foreground">财务分析数据加载中...</p>
            <p className="mt-1 text-sm text-muted-foreground">正在从本地财报数据库获取数据。</p>
          </div>
        </div>
      </Card>
    )
  }

  if (hasError && !hasCoreData) {
    return (
      <Card className="border-border bg-card p-6">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-yellow-500" />
          <div>
            <p className="font-medium text-foreground">财务数据加载失败</p>
            <p className="mt-2 text-sm text-muted-foreground">请检查后端服务是否正常运行。</p>
            <p className="mt-1 text-xs text-muted-foreground">数据源：本地财报数据库（{stockCode}）</p>
          </div>
        </div>
      </Card>
    )
  }

  const compositeScore = radar?.composite_score

  const tabConfig = [
    { value: 'overview', label: '核心概览', hasData: Boolean(radar) },
    { value: 'roe', label: 'ROE 分析', hasData: Boolean(dupont) },
    { value: 'dcf', label: 'DCF 估值', hasData: Boolean(dcf) },
    { value: 'valuation', label: '估值体系', hasData: Boolean(valuation?.success || peBand) },
    { value: 'growth', label: '成长分析', hasData: Boolean(growth) },
    { value: 'risk', label: '风险预警', hasData: Boolean(risk) },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">财务分析</h2>
          {compositeScore !== undefined && (
            <Badge variant="outline" className="text-sm">
              综合评分: <span className="font-bold text-primary">{compositeScore}</span>
            </Badge>
          )}
        </div>
        <PDFExportButton
          stockCode={stockCode}
          stockName={stockName}
          onExport={handleExportPDF}
          isExporting={isExporting}
          isDark={isDark}
        />
      </div>

      {hasCoreData && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          数据来源：本地财报数据库
          <span>| 年报: {dupont?.history?.length ?? 0} 年</span>
          {growth?.quarterly_growth && <span>| 季报: {growth.quarterly_growth.length} 个季度</span>}
        </div>
      )}

      {availablePeers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PeerComparisonSelector
            availablePeers={availablePeers}
            selectedPeers={selectedPeers}
            onPeerSelect={setSelectedPeers}
            maxPeers={5}
            isDark={isDark}
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 h-auto flex-wrap gap-1 bg-muted/50 p-1">
          {tabConfig.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="transition-all data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:shadow-sm"
            >
              {tab.label}
              {!tab.hasData && <span className="ml-1 text-xs text-muted-foreground">(加载中)</span>}
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
          <DuPontDecomposition data={dupont} isLoading={isLoading && !dupont} isDark={isDark} />
        </TabsContent>

        <TabsContent value="dcf" className="mt-0">
          <DCFCalculator data={dcf} onParamsChange={updateDCFParams} isDark={isDark} />
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
              industry_pb: valuation.metrics?.industry_avg_pb ?? 0,
            } : undefined}
            peBandData={peBand}
            isLoading={isLoading && !valuation && !peBand}
            isDark={isDark}
          />
        </TabsContent>

        <TabsContent value="growth" className="mt-0">
          <GrowthAnalysis data={growth} isLoading={isLoading && !growth} isDark={isDark} />
        </TabsContent>

        <TabsContent value="risk" className="mt-0">
          <FinancialHealth data={risk} isLoading={isLoading && !risk} isDark={isDark} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
