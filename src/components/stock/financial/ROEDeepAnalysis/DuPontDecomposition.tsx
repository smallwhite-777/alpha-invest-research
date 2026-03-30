'use client'

import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BaseChart } from '../charts/BaseChart'
import { createWaterfallChartOption, createDuPontTrendChartOption } from '../charts/ChartUtils'
import { Info, AlertCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { DuPontResponse } from '@/types/financial'

interface DuPontDecompositionProps {
  data?: DuPontResponse
  isLoading?: boolean
  isDark?: boolean
}

export function DuPontDecomposition({
  data,
  isLoading = false,
  isDark = false
}: DuPontDecompositionProps) {

  // 加载骨架屏
  if (isLoading) {
    return (
      <Card className="p-5 bg-card border-border">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-muted rounded w-32"></div>
            <div className="h-6 bg-muted rounded w-28"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[1,2].map(i => (
              <div key={i} className="p-4 rounded-lg bg-muted/30">
                <div className="h-4 bg-muted rounded w-24 mb-3"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="h-64 bg-muted/30 rounded-lg"></div>
        </div>
      </Card>
    )
  }

  // 如果没有数据，显示空状态
  if (!data) {
    return (
      <Card className="p-5 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">ROE深度分析</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
          <p>ROE分析数据加载中...</p>
          <p className="text-sm mt-1">正在从本地财报数据库获取数据</p>
        </div>
      </Card>
    )
  }

  // 安全获取数据值
  const dupont3stage = data.dupont_3stage ?? { roe: 0, net_margin: 0, asset_turnover: 0, equity_multiplier: 1 }
  const dupont5stage = data.dupont_5stage ?? { roe: 0, tax_burden: 1, interest_burden: 1, operating_margin: 0, asset_turnover: 0, equity_multiplier: 1 }
  const history = data.history ?? []
  const contributions = data.decomposition_contribution ?? {
    net_margin_contribution: 0,
    asset_turnover_contribution: 0,
    equity_multiplier_contribution: 0
  }

  const waterfallOption = createWaterfallChartOption(dupont3stage, contributions, isDark)
  const trendOption = createDuPontTrendChartOption(history, isDark)

  return (
    <Card className="p-5 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">ROE深度分析</h3>
        <Badge variant="outline" className="flex items-center gap-1">
          当前ROE: <span className="text-primary font-bold">
            {(dupont3stage.roe ?? 0).toFixed(1)}%
          </span>
        </Badge>
      </div>

      {/* ROE公式说明 */}
      <div className="mb-4 p-3 rounded-lg bg-muted/20 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">杜邦分解公式</p>
        <p>ROE = 净利率 × 资产周转率 × 权益乘数 = (净利润/营收) × (营收/资产) × (资产/权益)</p>
      </div>

      {/* 杜邦分解数据展示 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* 三阶段分解 */}
        <div className="p-4 rounded-lg bg-muted/30">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">三阶段杜邦分解</h4>
          <div className="space-y-3">
            <TooltipProvider>
              <div className="flex justify-between items-center">
                <Tooltip>
                  <TooltipTrigger className="cursor-help flex items-center gap-1 text-muted-foreground">
                      净利率
                      <Info className="w-3 h-3" />
                    </TooltipTrigger>
                  <TooltipContent>
                    <p>净利率 = 净利润 / 营业收入 × 100%</p>
                    <p className="text-xs text-muted-foreground mt-1">反映盈利能力，越高越好</p>
                  </TooltipContent>
                </Tooltip>
                <span className="font-medium text-foreground">
                  {(dupont3stage.net_margin ?? 0).toFixed(2)}%
                </span>
              </div>
            </TooltipProvider>

            <TooltipProvider>
              <div className="flex justify-between items-center">
                <Tooltip>
                  <TooltipTrigger className="cursor-help flex items-center gap-1 text-muted-foreground">
                      资产周转率
                      <Info className="w-3 h-3" />
                    </TooltipTrigger>
                  <TooltipContent>
                    <p>资产周转率 = 营业收入 / 总资产</p>
                    <p className="text-xs text-muted-foreground mt-1">反映资产利用效率，单位：次</p>
                  </TooltipContent>
                </Tooltip>
                <span className="font-medium text-foreground">
                  {(dupont3stage.asset_turnover ?? 0).toFixed(2)}次
                </span>
              </div>
            </TooltipProvider>

            <TooltipProvider>
              <div className="flex justify-between items-center">
                <Tooltip>
                  <TooltipTrigger className="cursor-help flex items-center gap-1 text-muted-foreground">
                      权益乘数
                      <Info className="w-3 h-3" />
                    </TooltipTrigger>
                  <TooltipContent>
                    <p>权益乘数 = 总资产 / 股东权益</p>
                    <p className="text-xs text-muted-foreground mt-1">反映财务杠杆，无单位</p>
                  </TooltipContent>
                </Tooltip>
                <span className="font-medium text-foreground">
                  {(dupont3stage.equity_multiplier ?? 1).toFixed(2)}
                </span>
              </div>
            </TooltipProvider>
          </div>
          <div className="mt-3 pt-3 border-t border-border text-center">
            <span className="text-xs text-muted-foreground">
              ROE = {dupont3stage.net_margin?.toFixed(1) ?? 0}% × {dupont3stage.asset_turnover?.toFixed(2) ?? 0}次 × {dupont3stage.equity_multiplier?.toFixed(2) ?? 1}
            </span>
          </div>
        </div>

        {/* 五阶段分解 */}
        <div className="p-4 rounded-lg bg-muted/30">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">五阶段杜邦分解</h4>
          <div className="space-y-2">
            <TooltipProvider>
              <div className="flex justify-between items-center">
                <Tooltip>
                  <TooltipTrigger className="cursor-help flex items-center gap-1 text-muted-foreground">
                      税负影响
                      <Info className="w-3 h-3" />
                    </TooltipTrigger>
                  <TooltipContent>
                    <p>税负影响 = 净利润 / 税前利润</p>
                    <p className="text-xs text-muted-foreground mt-1">越接近1表示税负影响越小</p>
                  </TooltipContent>
                </Tooltip>
                <span className="font-medium text-foreground">
                  {(dupont5stage.tax_burden ?? 1).toFixed(2)}
                </span>
              </div>
            </TooltipProvider>

            <TooltipProvider>
              <div className="flex justify-between items-center">
                <Tooltip>
                  <TooltipTrigger className="cursor-help flex items-center gap-1 text-muted-foreground">
                      利息负担
                      <Info className="w-3 h-3" />
                    </TooltipTrigger>
                  <TooltipContent>
                    <p>利息负担 = 税前利润 / EBIT</p>
                    <p className="text-xs text-muted-foreground mt-1">越接近1表示利息支出越少</p>
                  </TooltipContent>
                </Tooltip>
                <span className="font-medium text-foreground">
                  {(dupont5stage.interest_burden ?? 1).toFixed(2)}
                </span>
              </div>
            </TooltipProvider>

            <TooltipProvider>
              <div className="flex justify-between items-center">
                <Tooltip>
                  <TooltipTrigger className="cursor-help flex items-center gap-1 text-muted-foreground">
                      经营利润率
                      <Info className="w-3 h-3" />
                    </TooltipTrigger>
                  <TooltipContent>
                    <p>经营利润率 = EBIT / 营业收入 × 100%</p>
                    <p className="text-xs text-muted-foreground mt-1">反映核心经营盈利能力</p>
                  </TooltipContent>
                </Tooltip>
                <span className="font-medium text-foreground">
                  {(dupont5stage.operating_margin ?? 0).toFixed(2)}%
                </span>
              </div>
            </TooltipProvider>

            <div className="flex justify-between">
              <span className="text-muted-foreground">资产周转率</span>
              <span className="font-medium text-foreground">{(dupont5stage.asset_turnover ?? 0).toFixed(2)}次</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">权益乘数</span>
              <span className="font-medium text-foreground">{(dupont5stage.equity_multiplier ?? 1).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 图表区 */}
      <Tabs defaultValue="waterfall" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="waterfall">瀑布图</TabsTrigger>
          <TabsTrigger value="trend">历史趋势 ({history.length}年)</TabsTrigger>
        </TabsList>

        <TabsContent value="waterfall">
          <BaseChart
            option={waterfallOption}
            height={300}
            isDark={isDark}
          />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            瀑布图显示各因素对ROE的贡献程度
          </p>
        </TabsContent>

        <TabsContent value="trend">
          {history.length > 0 ? (
            <>
              <BaseChart
                option={trendOption}
                height={300}
                isDark={isDark}
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                左轴: 百分比指标 | 右轴: 倍数指标
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              暂无历史趋势数据
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  )
}