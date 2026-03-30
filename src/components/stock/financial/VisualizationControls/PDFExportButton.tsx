'use client'

import { Button } from '@/components/ui/button'
import { Download, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PDFExportButtonProps {
  stockCode: string
  stockName?: string
  onExport: () => void
  isExporting?: boolean
  isDark?: boolean
}

export function PDFExportButton({
  stockCode,
  stockName,
  onExport,
  isExporting = false,
  isDark = false
}: PDFExportButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onExport}
      disabled={isExporting}
      className={cn('gap-2', isDark && 'text-white border-gray-600')}
    >
      <FileText className="w-4 h-4" />
      {isExporting ? '生成中...' : '导出PDF报告'}
    </Button>
  )
}