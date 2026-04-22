'use client'

import { useState } from 'react'
import { Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MacroAIContext } from '@/lib/macro-ai/types'
import { MacroAIPanel } from './MacroAIPanel'

export function MacroAIEntry({
  context,
}: {
  context?: MacroAIContext
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" className="rounded-none" onClick={() => setOpen(true)}>
        <Brain className="h-4 w-4" />
        AI 宏观解读
      </Button>
      <MacroAIPanel open={open} onOpenChange={setOpen} context={context} />
    </>
  )
}

