'use client'

import { Button } from '@/components/ui/button'

const SUGGESTIONS = [
  '未来 3 个月中国 CPI 怎么看？',
  '当前中国 M2、PMI、社零一起说明什么？',
  '美国 10 年国债收益率上行意味着什么？',
  '美元指数和美债利率最近为何同向？',
  '如果油价上涨 10%，中国 PPI 和 CPI 可能怎么变？',
  '当前中美宏观分化最核心的矛盾是什么？',
]

export function MacroPromptSuggestions({
  onSelect,
}: {
  onSelect: (question: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTIONS.map((item) => (
        <Button
          key={item}
          variant="outline"
          size="sm"
          type="button"
          className="rounded-none"
          onClick={() => onSelect(item)}
        >
          {item}
        </Button>
      ))}
    </div>
  )
}

