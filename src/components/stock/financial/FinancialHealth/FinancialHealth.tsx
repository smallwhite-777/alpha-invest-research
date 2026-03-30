'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { RiskResponse } from '@/types/financial'

interface FinancialHealthProps {
  data?: RiskResponse
  isLoading?: boolean
  isDark?: boolean
}

/**
 * 财务健康与风险预警模块
 */
export function FinancialHealth({
  data,
  isLoading = false,
  isDark = false
}: FinancialHealthProps) {

  // 加载骨架屏
  if (isLoading) {
    return (
      <Card className="p-5 bg-card border-border">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-muted rounded w-32"></div>
            <div className="h-6 bg-muted rounded w-16"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="p-3 rounded-lg bg-muted/30">
                <div className="h-4 bg-muted rounded w-16 mb-2"></div>
                <div className="h-6 bg-muted rounded w-12 mx-auto"></div>
              </div>
            ))}
          </div>
          <div className="h-32 bg-muted/30 rounded-lg"></div>
        </div>
      </Card>
    )
  }

  // 无数据状态
  if (!data) {
    return (
      <Card className="p-5 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">财务健康与风险预警</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
          <p>暂无财务健康数据</p>
          <p className="text-sm mt-1">数据加载中或该股票无相关数据</p>
        </div>
      </Card>
    )
  }

  // 安全获取数据
  const debtRatios = data.debt_ratios ?? {
    asset_liability_ratio: 0,
    current_ratio: 0,
    quick_ratio: 0,
    debt_to_equity: 0
  }
  const fraudDetection = data.fraud_detection ?? {
    benford_score: 0,
    accrual_quality: 0,
    m_score: 0,
    risk_level: '未知'
  }
  const warnings = data.warnings ?? []
  const healthScore = data.health_score ?? 50

  // 安全获取数值
  const assetLiabilityRatio = debtRatios.asset_liability_ratio ?? 0
  const currentRatio = debtRatios.current_ratio ?? 0
  const quickRatio = debtRatios.quick_ratio ?? 0
  const debtToEquity = debtRatios.debt_to_equity ?? 0
  const benfordScore = fraudDetection.benford_score ?? 0
  const accrualQuality = fraudDetection.accrual_quality ?? 0
  const mScore = fraudDetection.m_score ?? 0
  const riskLevel = fraudDetection.risk_level ?? '未知'

  // 检查数据是否有效（非零）
  const hasValidData = assetLiabilityRatio > 0 || currentRatio > 0 || quickRatio > 0

  // 根据行业合理区间设置颜色阈值
  const getDebtRatioStatus = (ratio: number): { color: string; label: string } => {
    if (ratio === 0) return { color: 'text-muted-foreground', label: '数据缺失' }
    if (ratio <= 40) return { color: 'text-green-500', label: '安全' }
    if (ratio <= 60) return { color: 'text-blue-500', label: '正常' }
    if (ratio <= 70) return { color: 'text-yellow-500', label: '偏高' }
    return { color: 'text-red-500', label: '危险' }
  }

  const getCurrentRatioStatus = (ratio: number): { color: string; label: string } => {
    if (ratio === 0) return { color: 'text-muted-foreground', label: '数据缺失' }
    if (ratio >= 2) return { color: 'text-green-500', label: '优秀' }
    if (ratio >= 1.5) return { color: 'text-blue-500', label: '良好' }
    if (ratio >= 1) return { color: 'text-yellow-500', label: '偏低' }
    return { color: 'text-red-500', label: '风险' }
  }

  const getQuickRatioStatus = (ratio: number): { color: string; label: string } => {
    if (ratio === 0) return { color: 'text-muted-foreground', label: '数据缺失' }
    if (ratio >= 1) return { color: 'text-green-500', label: '优秀' }
    if (ratio >= 0.5) return { color: 'text-yellow-500', label: '一般' }
    return { color: 'text-red-500', label: '风险' }
  }

  const debtStatus = getDebtRatioStatus(assetLiabilityRatio)
  const currentStatus = getCurrentRatioStatus(currentRatio)
  const quickStatus = getQuickRatioStatus(quickRatio)

  // 风险等级配置
  const riskLevelConfig: Record<string, { color: string }> = {
    '低风险': { color: 'text-green-500 bg-green-500/10' },
    '中风险': { color: 'text-yellow-500 bg-yellow-500/10' },
    '高风险': { color: 'text-red-500 bg-red-500/10' },
    '未知': { color: 'text-muted-foreground bg-muted/30' }
  }
  const riskConfig = riskLevelConfig[riskLevel] || riskLevelConfig['未知']

  // 健康评分颜色
  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card className="p-5 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">财务健康与风险预警</h3>
        <Badge className={cn('flex items-center gap-1', riskConfig.color)}>
          {riskLevel}
        </Badge>
      </div>

      {/* 数据有效性提示 */}
      {!hasValidData && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
          <Info className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-500">
            部分财务指标数据缺失，可能是因为该股票为新上市或数据尚未更新
          </div>
        </div>
      )}

      {/* 健康评分 */}
      <div className="mb-6 p-4 rounded-lg bg-muted/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">财务健康评分</span>
          <span className="text-lg font-bold text-foreground">{healthScore}</span>
        </div>
        <div className="h-3 rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all', getHealthScoreColor(healthScore))}
            style={{ width: `${Math.max(0, Math.min(100, healthScore))}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>风险</span>
          <span>一般</span>
          <span>良好</span>
          <span>优秀</span>
        </div>
      </div>

      {/* 负债指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* 资产负债率 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="w-full">
              <div className="text-center p-3 rounded-lg bg-muted/30 cursor-help">
                <div className="text-sm text-muted-foreground mb-1">资产负债率</div>
                <div className={cn('text-lg font-bold', debtStatus.color)}>
                  {assetLiabilityRatio > 0 ? `${assetLiabilityRatio.toFixed(1)}%` : '-'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{debtStatus.label}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>资产负债率 = 总负债 / 总资产</p>
              <p className="text-xs text-muted-foreground mt-1">
                合理区间: 40%-60%
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* 流动比率 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="w-full">
              <div className="text-center p-3 rounded-lg bg-muted/30 cursor-help">
                <div className="text-sm text-muted-foreground mb-1">流动比率</div>
                <div className={cn('text-lg font-bold', currentStatus.color)}>
                  {currentRatio > 0 ? currentRatio.toFixed(2) : '-'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{currentStatus.label}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>流动比率 = 流动资产 / 流动负债</p>
              <p className="text-xs text-muted-foreground mt-1">
                合理区间: ≥1.5，理想值2.0
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* 速动比率 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="w-full">
              <div className="text-center p-3 rounded-lg bg-muted/30 cursor-help">
                <div className="text-sm text-muted-foreground mb-1">速动比率</div>
                <div className={cn('text-lg font-bold', quickStatus.color)}>
                  {quickRatio > 0 ? quickRatio.toFixed(2) : '-'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{quickStatus.label}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>速动比率 = (流动资产 - 存货) / 流动负债</p>
              <p className="text-xs text-muted-foreground mt-1">
                合理区间: ≥1.0
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* 产权比率 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="w-full">
              <div className="text-center p-3 rounded-lg bg-muted/30 cursor-help">
                <div className="text-sm text-muted-foreground mb-1">产权比率</div>
                <div className={cn(
                  'text-lg font-bold',
                  debtToEquity === 0 ? 'text-muted-foreground' :
                  debtToEquity <= 1 ? 'text-green-500' :
                  debtToEquity <= 2 ? 'text-yellow-500' : 'text-red-500'
                )}>
                  {debtToEquity > 0 ? debtToEquity.toFixed(2) : '-'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {debtToEquity === 0 ? '数据缺失' :
                   debtToEquity <= 1 ? '安全' :
                   debtToEquity <= 2 ? '偏高' : '风险'}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>产权比率 = 总负债 / 股东权益</p>
              <p className="text-xs text-muted-foreground mt-1">
                合理区间: ≤1.0
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* 财务造假检测 */}
      <div className="mb-6 p-4 rounded-lg bg-muted/20">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">财务造假风险检测</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Benford定律 */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="w-full">
                <div className="text-center cursor-help">
                  <div className="text-xs text-muted-foreground mb-1">Benford定律符合度</div>
                  <div className="text-lg font-bold text-foreground">
                    {benfordScore > 0 ? `${(benfordScore * 100).toFixed(0)}%` : '-'}
                  </div>
                  {benfordScore > 0 && (
                    <div className="h-2 rounded-full bg-muted mt-1">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          benfordScore >= 0.9 ? 'bg-green-500' :
                          benfordScore >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                        style={{ width: `${Math.max(0, Math.min(100, benfordScore * 100))}%` }}
                      />
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>检测财务数字分布是否符合Benford定律</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ≥90%: 正常，70-90%: 可疑，&lt;70%: 高风险
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 应计质量 */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="w-full">
                <div className="text-center cursor-help">
                  <div className="text-xs text-muted-foreground mb-1">应计质量</div>
                  <div className="text-lg font-bold text-foreground">
                    {accrualQuality > 0 ? `${(accrualQuality * 100).toFixed(0)}%` : '-'}
                  </div>
                  {accrualQuality > 0 && (
                    <div className="h-2 rounded-full bg-muted mt-1">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          accrualQuality >= 0.8 ? 'bg-green-500' :
                          accrualQuality >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                        style={{ width: `${Math.max(0, Math.min(100, accrualQuality * 100))}%` }}
                      />
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>衡量应计项目的质量</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ≥80%: 高质量，50-80%: 中等，&lt;50%: 低质量
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* M-Score */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="w-full">
                <div className="text-center cursor-help">
                  <div className="text-xs text-muted-foreground mb-1">M-Score</div>
                  <div className="text-lg font-bold text-foreground">
                    {mScore !== 0 ? mScore.toFixed(2) : '-'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {mScore === 0 ? '数据缺失' :
                     mScore < -2.22 ? '低风险' :
                     mScore < 0 ? '中等' : '可能操纵'}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Beneish M-Score 操纵检测</p>
                <p className="text-xs text-muted-foreground mt-1">
                  &lt;-2.22: 低风险，-2.22~0: 中等，&gt;0: 可能操纵
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* 风险预警清单 */}
      {warnings.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">风险预警清单</h4>
          {warnings.map((warning, idx) => (
            <div
              key={idx}
              className={cn(
                'p-3 rounded-lg border',
                warning.severity === '高' ? 'border-red-500/50 bg-red-500/5' :
                warning.severity === '中' ? 'border-yellow-500/50 bg-yellow-500/5' :
                'border-blue-500/50 bg-blue-500/5'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      warning.severity === '高' ? 'text-red-500 border-red-500' :
                      warning.severity === '中' ? 'text-yellow-500 border-yellow-500' :
                      'text-blue-500 border-blue-500'
                    )}
                  >
                    {warning.severity ?? '未知'}
                  </Badge>
                  <span className="font-medium text-foreground">{warning.type ?? '未知风险'}</span>
                </div>
                <span className="text-xs text-muted-foreground">{warning.indicator ?? '-'}</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{warning.detail ?? ''}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-4 rounded-lg bg-green-500/5 border border-green-500/20">
          <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-2" />
          <span className="text-green-500 font-medium">暂无明显风险预警</span>
          <p className="text-xs text-muted-foreground mt-1">各项财务指标处于正常范围</p>
        </div>
      )}
    </Card>
  )
}