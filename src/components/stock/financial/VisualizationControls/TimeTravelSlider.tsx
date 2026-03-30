'use client'

import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

interface TimeTravelSliderProps {
  availableYears: string[]
  selectedYear?: string
  onYearChange: (year: string) => void
  isDark?: boolean
}

export function TimeTravelSlider({
  availableYears,
  selectedYear,
  onYearChange,
  isDark = false
}: TimeTravelSliderProps) {
  if (availableYears.length === 0) {
    return null
  }

  const handleValueChange = (value: string | null) => {
    if (value) {
      onYearChange(value)
    }
  }

  return (
    <Card className="p-4 bg-card border-border">
      <Label className="text-sm text-muted-foreground mb-2 block">
        时间穿越 - 选择历史年份查看当时财务状况
      </Label>
      <Select value={selectedYear || availableYears[0]} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="选择年份" />
        </SelectTrigger>
        <SelectContent>
          {availableYears.map(year => (
            <SelectItem key={year} value={year}>
              {year}年
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Card>
  )
}