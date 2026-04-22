'use client'

import { useMemo, useState } from 'react'
import { Brain, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { cn } from '@/lib/utils'
import type { MacroAIContext } from '@/lib/macro-ai/types'
import type { MacroAIMessage, MacroAIRequest } from './types'
import { MacroPromptSuggestions } from './MacroPromptSuggestions'

function buildContextLabel(context?: MacroAIContext) {
  const labels: string[] = []
  if (context?.page) labels.push(`页面：${context.page}`)
  if (context?.selectedCorrelation?.codeX && context?.selectedCorrelation?.codeY) {
    labels.push(`相关性：${context.selectedCorrelation.codeX} / ${context.selectedCorrelation.codeY}`)
  }
  if (context?.selectedComparison?.leftCode && context?.selectedComparison?.rightCode) {
    labels.push(`双轴：${context.selectedComparison.leftCode} / ${context.selectedComparison.rightCode}`)
  }
  return labels
}

export function MacroAIPanel({
  open,
  onOpenChange,
  context,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  context?: MacroAIContext
}) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<MacroAIMessage[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contextLabels = useMemo(() => buildContextLabel(context), [context])

  async function submitQuestion(rawQuestion?: string) {
    const finalQuestion = (rawQuestion ?? question).trim()
    if (!finalQuestion || submitting) return

    const userMessage: MacroAIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: finalQuestion,
    }

    setMessages((current) => [...current, userMessage])
    setQuestion('')
    setSubmitting(true)
    setError(null)

    try {
      const payload: MacroAIRequest = {
        question: finalQuestion,
        context,
      }

      const response = await fetch('/api/macro/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const assistantMessage: MacroAIMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer || '未生成回答。',
        response: data,
      }

      setMessages((current) => [...current, assistantMessage])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '请求失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[720px] rounded-none bg-surface p-0 sm:max-w-[720px]">
        <SheetHeader className="border-b border-border bg-surface-low">
          <div className="flex items-center gap-2">
            <SheetTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI 宏观解读
            </SheetTitle>
            <Badge variant="outline" className="rounded-none text-xs text-muted-foreground">
              按需调用后端分析与预测
            </Badge>
          </div>
          <SheetDescription>
            先展示当前宏观事实，再根据你的问题调用后端分析与预测能力。
          </SheetDescription>
          {contextLabels.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {contextLabels.map((label) => (
                <Badge key={label} variant="secondary" className="rounded-none">
                  {label}
                </Badge>
              ))}
            </div>
          ) : null}
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border p-4">
            <p className="mb-3 text-xs text-muted-foreground">试试这些问题：</p>
            <MacroPromptSuggestions
              onSelect={(value) => {
                setQuestion(value)
                void submitQuestion(value)
              }}
            />
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 p-4">
              {messages.length === 0 ? (
                <div className="rounded-none border border-dashed border-border bg-surface-low p-4 text-sm text-muted-foreground">
                  输入宏观问题后，我会优先结合当前页面上下文、最新指标与相关性结果进行解读；如果后端预测服务可用，也会按需补充模型判断。
                </div>
              ) : null}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'max-w-[92%] rounded-none border p-3',
                    message.role === 'user'
                      ? 'ml-auto border-link/20 bg-link/5'
                      : 'border-border bg-surface-low'
                  )}
                >
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    {message.role === 'user' ? '你' : 'AI 宏观助手'}
                    {message.response?.intent ? (
                      <Badge variant="outline" className="rounded-none text-[10px] uppercase">
                        {message.response.intent}
                      </Badge>
                    ) : null}
                  </div>
                  <MarkdownRenderer content={message.content} className="text-sm" />
                  {message.response?.warnings?.length ? (
                    <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                      {message.response.warnings.map((warning) => (
                        <div key={warning}>提示：{warning}</div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}

              {submitting ? (
                <div className="flex items-center gap-2 rounded-none border border-border bg-surface-low p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在整理宏观事实与后端能力...
                </div>
              ) : null}

              {error ? (
                <div className="rounded-none border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  请求失败：{error}
                </div>
              ) : null}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              问题会优先使用事实数据；只有涉及判断和预测时，才会尝试调用后端能力。
            </div>
            <Textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="例如：未来 3 个月中国 CPI 怎么看？"
              className="min-h-24 rounded-none"
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                  event.preventDefault()
                  void submitQuestion()
                }
              }}
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">按 `Ctrl + Enter` 发送</p>
              <Button
                type="button"
                className="rounded-none"
                onClick={() => void submitQuestion()}
                disabled={submitting || !question.trim()}
              >
                {submitting ? '分析中...' : '发送问题'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

