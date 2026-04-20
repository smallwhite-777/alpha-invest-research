'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BaseChart } from '../charts/BaseChart'
import { createFCFChartOption } from '../charts/ChartUtils'
import { formatPercentValue, formatPriceCny } from '@/lib/financial-format'
import type { DCFResponse, DCFParams } from '@/types/financial'

interface DCFCalculatorProps {
  data?: DCFResponse
  onParamsChange?: (params: DCFParams) => void
  isDark?: boolean
}

export function DCFCalculator({
  data,
  onParamsChange,
  isDark = false,
}: DCFCalculatorProps) {
  const [isUserAdjusting, setIsUserAdjusting] = useState(false)
  const [wacc, setWacc] = useState(10)
  const [growth, setGrowth] = useState(3)
  const [waccInput, setWaccInput] = useState('10')
  const [growthInput, setGrowthInput] = useState('3')

  if (!data) {
    return (
      <Card className="p-5 bg-card border-border">
        <div className="flex items-center justify-center h-40 text-muted-foreground">暂无 DCF 数据</div>
      </Card>
    )
  }

  const waccBase = data.wacc_base ?? 10
  const growthBase = data.growth_base ?? 3
  const effectiveWacc = isUserAdjusting ? wacc : waccBase
  const effectiveGrowth = isUserAdjusting ? growth : growthBase
  const effectiveWaccInput = isUserAdjusting ? waccInput : String(waccBase)
  const effectiveGrowthInput = isUserAdjusting ? growthInput : String(growthBase)
  const intrinsicValue = data.intrinsic_value ?? 0
  const currentPrice = data.current_price ?? 0
  const marginOfSafety = data.margin_of_safety ?? 0
  const fcfHistory = data.fcf_history ?? []
  const sensitivityMatrix = data.sensitivity_matrix ?? []

  const handleWaccConfirm = () => {
    const nextValue = parseFloat(waccInput)
    if (Number.isFinite(nextValue) && nextValue >= 1 && nextValue <= 20) {
      setWacc(nextValue)
      onParamsChange?.({
        wacc_adjustment: nextValue - waccBase,
        growth_adjustment: growth - growthBase,
        projection_years: 10,
      })
    } else {
      setWaccInput(String(effectiveWacc))
    }
  }

  const handleGrowthConfirm = () => {
    const nextValue = parseFloat(growthInput)
    if (Number.isFinite(nextValue) && nextValue >= 0 && nextValue <= 10) {
      setGrowth(nextValue)
      onParamsChange?.({
        wacc_adjustment: wacc - waccBase,
        growth_adjustment: nextValue - growthBase,
        projection_years: 10,
      })
    } else {
      setGrowthInput(String(effectiveGrowth))
    }
  }

  const handleReset = () => {
    setIsUserAdjusting(false)
    setWaccInput(String(waccBase))
    setGrowthInput(String(growthBase))
    onParamsChange?.({
      wacc_adjustment: 0,
      growth_adjustment: 0,
      projection_years: 10,
    })
  }

  const fcfOption = createFCFChartOption(fcfHistory, isDark)

  const getMarginColor = (margin: number) => {
    if (margin >= 20) return 'text-green-500'
    if (margin >= 10) return 'text-blue-500'
    if (margin >= 0) return 'text-yellow-500'
    return 'text-red-500'
  }

  const uniqueGrowthValues = Array.from(new Set(sensitivityMatrix.map((item) => item.g))).sort((a, b) => a - b)
  const uniqueWaccValues = Array.from(new Set(sensitivityMatrix.map((item) => item.wacc))).sort((a, b) => a - b)

  return (
    <Card className="p-5 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">DCF 估值模型</h3>
        <Badge variant="outline">
          安全边际 <span className={getMarginColor(marginOfSafety)}>{formatPercentValue(marginOfSafety)}</span>
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SummaryCard label="内在价值" value={formatPriceCny(intrinsicValue)} tone="primary" />
        <SummaryCard label="当前股价" value={formatPriceCny(currentPrice)} />
        <SummaryCard
          label="操作建议"
          value={marginOfSafety >= 20 ? '强烈买入' : marginOfSafety >= 10 ? '买入' : marginOfSafety >= 0 ? '持有' : '谨慎'}
          tone={marginOfSafety >= 10 ? 'positive' : 'negative'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 rounded-lg bg-muted/20">
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">WACC 加权平均资本成本</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={20}
                step={0.5}
                value={effectiveWaccInput}
                onChange={(e) => {
                  setWaccInput(e.target.value)
                  setIsUserAdjusting(true)
                }}
                onBlur={handleWaccConfirm}
                onKeyDown={(e) => e.key === 'Enter' && handleWaccConfirm()}
                className="w-24 text-center"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">建议区间 1% - 20%，当前基准 {waccBase}%</div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">永续增长率 g</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={effectiveGrowthInput}
                onChange={(e) => {
                  setGrowthInput(e.target.value)
                  setIsUserAdjusting(true)
                }}
                onBlur={handleGrowthConfirm}
                onKeyDown={(e) => e.key === 'Enter' && handleGrowthConfirm()}
                className="w-24 text-center"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">建议区间 0% - 10%，当前基准 {growthBase}%</div>
          </div>

          <Button variant="outline" size="sm" onClick={handleReset}>
            恢复默认参数
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-2 p-3 rounded-lg bg-muted/30">
          <p className="font-medium text-foreground mb-2">参数说明</p>
          <p>WACC 越高，折现越严格，估值通常越低。</p>
          <p>永续增长率越高，终值越高，模型更乐观。</p>
          <p>建议把 DCF 作为区间参考，不要把单点估值当成绝对结论。</p>
          <p>修改参数后按 Enter 或移出输入框即可重新计算。</p>
        </div>
      </div>

      {fcfHistory.length > 0 ? (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">自由现金流历史</h4>
          <BaseChart option={fcfOption} height={250} isDark={isDark} />
        </div>
      ) : null}

      {sensitivityMatrix.length > 0 ? (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            估值敏感性矩阵（当前参数 WACC={effectiveWacc.toFixed(1)}%，g={effectiveGrowth.toFixed(1)}%）
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2 text-left text-muted-foreground">WACC \ g</th>
                  {uniqueGrowthValues.map((gVal) => (
                    <th key={gVal} className="p-2 text-center text-muted-foreground">
                      {gVal.toFixed(1)}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uniqueWaccValues.map((waccVal) => (
                  <tr key={waccVal} className="border-b border-border/50">
                    <td className="p-2 text-muted-foreground font-medium">{waccVal.toFixed(1)}%</td>
                    {uniqueGrowthValues.map((gVal) => {
                      const cell = sensitivityMatrix.find((item) => item.wacc === waccVal && item.g === gVal)
                      return (
                        <td
                          key={`${waccVal}-${gVal}`}
                          className={`p-2 text-center font-medium ${
                            cell && cell.value >= currentPrice ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {cell ? formatPriceCny(cell.value, '-') : '-'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-muted-foreground mt-2 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500 rounded" />
              估值高于当前股价（{formatPriceCny(currentPrice)}）
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-500 rounded" />
              估值低于当前股价
            </span>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function SummaryCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'primary' | 'positive' | 'negative'
}) {
  const toneClass =
    tone === 'primary'
      ? 'text-primary'
      : tone === 'positive'
        ? 'text-green-500'
        : tone === 'negative'
          ? 'text-red-500'
          : 'text-foreground'

  return (
    <div className="text-center p-4 rounded-lg bg-muted/30">
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className={`text-xl font-bold ${toneClass}`}>{value}</div>
    </div>
  )
}
