'use client'

import { cn } from '@/lib/utils'
import { CollapsibleSection } from './CollapsibleSection'
import type { AnalysisResult, AnalysisMode } from './types'

interface AnalysisResultCardProps {
  result: AnalysisResult
  mode?: AnalysisMode
}

export function AnalysisResultCard({ result, mode }: AnalysisResultCardProps) {
  const getRecommendationLabel = (rec?: string) => {
    switch (rec) {
      case 'buy':
        return { text: '买入', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
      case 'hold':
        return { text: '持有', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' }
      case 'sell':
        return { text: '卖出', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' }
      case 'watch':
        return { text: '观望', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' }
      default:
        return { text: '暂无建议', color: 'bg-muted text-muted-foreground border-transparent' }
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
              result.sentiment === 'positive' && 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
              result.sentiment === 'neutral' && 'bg-amber-500/10 text-amber-500 border-amber-500/20',
              result.sentiment === 'negative' && 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            )}
          >
            {result.sentiment === 'positive' && '看涨'}
            {result.sentiment === 'neutral' && '中性'}
            {result.sentiment === 'negative' && '看跌'}
          </span>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
              getRecommendationLabel(result.recommendation).color
            )}
          >
            {getRecommendationLabel(result.recommendation).text}
          </span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
      </div>

      {/* Key Points */}
      {result.keyPoints && result.keyPoints.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">关键要点</h4>
          <div className="grid gap-2">
            {result.keyPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-3 text-sm text-foreground p-3 rounded-lg bg-accent/30">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Valuation */}
      {result.valuation && (
        <div className="rounded-lg border border-border/60 bg-card/50 p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">估值分析</h4>
          <div className="grid grid-cols-2 gap-3">
            {result.valuation.method && (
              <div>
                <p className="text-xs text-muted-foreground">估值方法</p>
                <p className="text-sm font-medium text-foreground">{result.valuation.method}</p>
              </div>
            )}
            {result.valuation.currentPrice && (
              <div>
                <p className="text-xs text-muted-foreground">当前价格</p>
                <p className="text-sm font-medium text-foreground">{result.valuation.currentPrice}</p>
              </div>
            )}
            {result.valuation.targetPrice && (
              <div>
                <p className="text-xs text-muted-foreground">目标价格</p>
                <p className="text-sm font-medium text-emerald-500">{result.valuation.targetPrice}</p>
              </div>
            )}
            {result.valuation.peRatio && (
              <div>
                <p className="text-xs text-muted-foreground">PE 比率</p>
                <p className="text-sm font-medium text-foreground">{result.valuation.peRatio}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk & Opportunities */}
      <div className="grid grid-cols-2 gap-3">
        {result.riskFactors && result.riskFactors.length > 0 && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
            <h4 className="text-xs font-medium text-rose-500 mb-2">⚠️ 风险提示</h4>
            <ul className="space-y-1">
              {result.riskFactors.slice(0, 3).map((risk, index) => (
                <li key={index} className="text-xs text-foreground flex items-start gap-1.5">
                  <span className="text-rose-400 mt-0.5">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.opportunities && result.opportunities.length > 0 && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <h4 className="text-xs font-medium text-emerald-500 mb-2">💡 投资机会</h4>
            <ul className="space-y-1">
              {result.opportunities.slice(0, 3).map((opp, index) => (
                <li key={index} className="text-xs text-foreground flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  <span>{opp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Deep Analysis Sections */}
      {result.deepAnalysis && mode === 'deep' && <DeepAnalysisSection result={result} />}

      {/* Philosophy Views */}
      {result.philosophyViews && mode === 'deep' && <PhilosophyViewsSection views={result.philosophyViews} />}

      {/* Variant View */}
      {result.variantView && mode === 'deep' && <VariantViewSection variantView={result.variantView} />}

      {/* Pre-Mortem */}
      {result.preMortem && result.preMortem.length > 0 && mode === 'deep' && (
        <CollapsibleSection title="Pre-Mortem">
          <ul className="space-y-2 text-xs">
            {result.preMortem.map((path, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-xs font-medium text-rose-500">
                  {i + 1}
                </span>
                <span>{path}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  )
}

// Sub-components for deep analysis
function DeepAnalysisSection({ result }: { result: AnalysisResult }) {
  if (!result.deepAnalysis) return null

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-xs font-medium text-muted-foreground">深度分析</span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {result.deepAnalysis.business && (
        <CollapsibleSection title="业务竞争力" defaultOpen>
          <div className="space-y-2 text-sm">
            {result.deepAnalysis.business.coreStrength && (
              <div>
                <span className="text-muted-foreground">核心优势：</span>
                {result.deepAnalysis.business.coreStrength}
              </div>
            )}
            {result.deepAnalysis.business.newNarrative && (
              <div>
                <span className="text-muted-foreground">新增长点：</span>
                {result.deepAnalysis.business.newNarrative}
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {result.deepAnalysis.keyMetrics && (
        <CollapsibleSection title="关键指标">
          <div className="space-y-2 text-sm">
            {result.deepAnalysis.keyMetrics.metrics?.map((metric, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-primary">{idx + 1}.</span>
                <span>{metric}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {result.deepAnalysis.valuationDeep && (
        <CollapsibleSection title="估值深度">
          <div className="space-y-2 text-sm">
            {result.deepAnalysis.valuationDeep.methods && (
              <div>
                <span className="text-muted-foreground">估值方法：</span>
                {result.deepAnalysis.valuationDeep.methods}
              </div>
            )}
            {result.deepAnalysis.valuationDeep.assumptions && (
              <div>
                <span className="text-muted-foreground">核心假设：</span>
                {result.deepAnalysis.valuationDeep.assumptions}
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {result.deepAnalysis.monitoring && (
        <CollapsibleSection title="监控清单" defaultOpen>
          <div className="space-y-3 text-sm">
            {result.deepAnalysis.monitoring.drivers && result.deepAnalysis.monitoring.drivers.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">📈 关键驱动因素：</div>
                <ul className="space-y-1 ml-2">
                  {result.deepAnalysis.monitoring.drivers.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-emerald-500">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.deepAnalysis.monitoring.risks && result.deepAnalysis.monitoring.risks.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">⚠️ 风险信号：</div>
                <ul className="space-y-1 ml-2">
                  {result.deepAnalysis.monitoring.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-rose-500">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}

function PhilosophyViewsSection({ views }: { views: NonNullable<AnalysisResult['philosophyViews']> }) {
  const labels: Record<string, string> = {
    buffett: '巴菲特',
    ark: 'ARK',
    tiger: 'Tiger Cubs',
    klarman: 'Klarman',
    tepper: 'Tepper',
    druck: 'Druckenmiller',
  }

  return (
    <CollapsibleSection title="6大投资哲学视角">
      <div className="space-y-2 text-xs">
        {Object.entries(views).map(([key, view]) => (
          <div key={key} className="p-2 rounded bg-accent/20">
            <div className="font-medium text-primary">{labels[key]}视角</div>
            <div className="text-muted-foreground mt-0.5">{view.view}</div>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  )
}

function VariantViewSection({ variantView }: { variantView: NonNullable<AnalysisResult['variantView']> }) {
  return (
    <CollapsibleSection title="Variant View">
      <div className="space-y-2 text-sm">
        <div className="p-2 rounded bg-rose-500/5 border border-rose-500/10">
          <div className="text-rose-500 text-xs font-medium">市场共识</div>
          <div className="text-xs mt-0.5">{variantView.consensus}</div>
        </div>
        <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
          <div className="text-emerald-500 text-xs font-medium">我们的观点</div>
          <div className="text-xs mt-0.5">{variantView.ourView}</div>
        </div>
      </div>
    </CollapsibleSection>
  )
}