'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BaseChart } from '../charts/BaseChart'
import { createFCFChartOption } from '../charts/ChartUtils'
import type { DCFResponse, DCFParams } from '@/types/financial'
import { useState, useRef, useEffect, useCallback } from 'react'

interface DCFCalculatorProps {
  data?: DCFResponse
  onParamsChange?: (params: DCFParams) => void
  isDark?: boolean
}

export function DCFCalculator({
  data,
  onParamsChange,
  isDark = false
}: DCFCalculatorProps) {
  // 使用 ref 来跟踪是否是用户手动调整
  const isUserAdjusting = useRef(false)

  // WACC 和 g 的状态 (直接使用百分比值，如 10 表示 10%)
  const [wacc, setWacc] = useState(10)
  const [growth, setGrowth] = useState(3)

  // 输入框的显示值（字符串，允许用户输入）
  const [waccInput, setWaccInput] = useState('10')
  const [growthInput, setGrowthInput] = useState('3')

  // 只在首次加载时初始化
  useEffect(() => {
    if (!isUserAdjusting.current && data?.wacc_base !== undefined) {
      setWacc(data.wacc_base)
      setWaccInput(String(data.wacc_base))
    }
    if (!isUserAdjusting.current && data?.growth_base !== undefined) {
      setGrowth(data.growth_base)
      setGrowthInput(String(data.growth_base))
    }
  }, [data?.wacc_base, data?.growth_base])

  // 如果没有数据，显示加载状态
  if (!data) {
    return (
      <Card className="p-5 bg-card border-border">
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          暂无DCF数据
        </div>
      </Card>
    )
  }

  // 安全获取数据值
  const waccBase = data.wacc_base ?? 10
  const growthBase = data.growth_base ?? 3
  const intrinsicValue = data.intrinsic_value ?? 0
  const currentPrice = data.current_price ?? 0
  const marginOfSafety = data.margin_of_safety ?? 0
  const fcfHistory = data.fcf_history ?? []
  const sensitivityMatrix = data.sensitivity_matrix ?? []

  // 处理WACC输入变化
  const handleWaccChange = (value: string) => {
    setWaccInput(value)
    isUserAdjusting.current = true
  }

  // 处理WACC输入确认（失焦或回车）
  const handleWaccConfirm = () => {
    const numValue = parseFloat(waccInput)
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 20) {
      setWacc(numValue)
      onParamsChange?.({
        wacc_adjustment: numValue - waccBase,
        growth_adjustment: growth - growthBase,
        projection_years: 10
      })
    } else {
      // 无效输入，恢复原值
      setWaccInput(String(wacc))
    }
  }

  // 处理增长率输入变化
  const handleGrowthChange = (value: string) => {
    setGrowthInput(value)
    isUserAdjusting.current = true
  }

  // 处理增长率输入确认
  const handleGrowthConfirm = () => {
    const numValue = parseFloat(growthInput)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
      setGrowth(numValue)
      onParamsChange?.({
        wacc_adjustment: wacc - waccBase,
        growth_adjustment: numValue - growthBase,
        projection_years: 10
      })
    } else {
      // 无效输入，恢复原值
      setGrowthInput(String(growth))
    }
  }

  // 重置参数
  const handleReset = () => {
    isUserAdjusting.current = false
    setWacc(waccBase)
    setGrowth(growthBase)
    setWaccInput(String(waccBase))
    setGrowthInput(String(growthBase))
    onParamsChange?.({
      wacc_adjustment: 0,
      growth_adjustment: 0,
      projection_years: 10
    })
  }

  const fcfOption = createFCFChartOption(fcfHistory, isDark)

  // 计算安全边际颜色
  const getMarginColor = (margin: number) => {
    if (margin >= 20) return 'text-green-500'
    if (margin >= 10) return 'text-blue-500'
    if (margin >= 0) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <Card className="p-5 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">DCF估值模型</h3>
        <Badge variant="outline">
          安全边际: <span className={getMarginColor(marginOfSafety)}>
            {marginOfSafety.toFixed(1)}%
          </span>
        </Badge>
      </div>

      {/* 估值结果 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground mb-1">内在价值</div>
          <div className="text-xl font-bold text-primary">
            ¥{intrinsicValue.toFixed(2)}
          </div>
        </div>
        <div className="text-center p-4 rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground mb-1">当前股价</div>
          <div className="text-xl font-bold text-foreground">
            ¥{currentPrice.toFixed(2)}
          </div>
        </div>
        <div className="text-center p-4 rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground mb-1">建议操作</div>
          <div className={`text-xl font-bold ${marginOfSafety >= 10 ? 'text-green-500' : 'text-red-500'}`}>
            {marginOfSafety >= 20 ? '强烈买入' :
             marginOfSafety >= 10 ? '买入' :
             marginOfSafety >= 0 ? '持有' : '卖出'}
          </div>
        </div>
      </div>

      {/* 参数调整输入框 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 rounded-lg bg-muted/20">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-2 block">
                WACC (加权平均资本成本) %
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={20}
                  step={0.5}
                  value={waccInput}
                  onChange={(e) => handleWaccChange(e.target.value)}
                  onBlur={handleWaccConfirm}
                  onKeyDown={(e) => e.key === 'Enter' && handleWaccConfirm()}
                  className="w-24 text-center"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                范围: 1% - 20%，默认 {waccBase}%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-2 block">
                永续增长率 g %
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={growthInput}
                  onChange={(e) => handleGrowthChange(e.target.value)}
                  onBlur={handleGrowthConfirm}
                  onKeyDown={(e) => e.key === 'Enter' && handleGrowthConfirm()}
                  className="w-24 text-center"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                范围: 0% - 10%，默认 {growthBase}%
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            重置为默认参数
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-2 p-3 rounded-lg bg-muted/30">
          <p className="font-medium text-foreground mb-2">参数说明</p>
          <p>• <strong>WACC</strong>：加权平均资本成本，反映公司融资成本</p>
          <p>• WACC越高，估值越低（更保守）</p>
          <p>• <strong>g</strong>：永续增长率，假设公司长期增长率</p>
          <p>• g越高，估值越高（更乐观）</p>
          <p>• 调整参数后按 Enter 或点击其他区域确认</p>
        </div>
      </div>

      {/* FCF趋势图 */}
      {fcfHistory.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">自由现金流历史</h4>
          <BaseChart
            option={fcfOption}
            height={250}
            isDark={isDark}
          />
        </div>
      )}

      {/* 敏感性矩阵 */}
      {sensitivityMatrix.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            估值敏感性矩阵 (围绕当前参数 WACC={wacc.toFixed(1)}%, g={growth.toFixed(1)}%)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2 text-left text-muted-foreground">WACC \ g</th>
                  {/* 获取唯一的g值列表，按升序排列 */}
                  {Array.from(new Set(sensitivityMatrix.map(d => d.g))).sort((a, b) => a - b).map((gVal, i) => (
                    <th key={i} className="p-2 text-center text-muted-foreground">{gVal.toFixed(1)}%</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* 获取唯一的WACC值列表，按升序排列 */}
                {Array.from(new Set(sensitivityMatrix.map(d => d.wacc))).sort((a, b) => a - b).map((waccVal, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-border/50">
                    <td className="p-2 text-muted-foreground font-medium">{waccVal.toFixed(1)}%</td>
                    {Array.from(new Set(sensitivityMatrix.map(d => d.g))).sort((a, b) => a - b).map((gVal, colIdx) => {
                      const cell = sensitivityMatrix.find(d => d.wacc === waccVal && d.g === gVal)
                      return (
                        <td
                          key={colIdx}
                          className={`p-2 text-center font-medium ${
                            cell && cell.value >= currentPrice ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {cell ? `¥${cell.value.toFixed(0)}` : '-'}
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
              <span className="w-3 h-3 bg-green-500 rounded"></span>
              估值高于当前股价 (¥{currentPrice.toFixed(0)})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-500 rounded"></span>
              估值低于当前股价
            </span>
          </div>
        </div>
      )}
    </Card>
  )
}