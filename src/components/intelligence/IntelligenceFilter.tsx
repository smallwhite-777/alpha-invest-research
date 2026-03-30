'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { INTELLIGENCE_CATEGORIES, SECTORS, IMPORTANCE_LEVELS } from '@/lib/constants'

interface IntelligenceFilterProps {
  onCategoryChange: (value: string) => void
  onSectorChange: (value: string) => void
  onImportanceChange: (value: string) => void
  category?: string
  sector?: string
  importance?: string
}

export function IntelligenceFilter({
  onCategoryChange,
  onSectorChange,
  onImportanceChange,
  category,
  sector,
  importance,
}: IntelligenceFilterProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <Select value={category || 'all'} onValueChange={(v) => v && onCategoryChange(v)}>
        <SelectTrigger className="w-[140px] bg-card border-border text-foreground">
          <SelectValue placeholder="分类" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          <SelectItem value="all">全部分类</SelectItem>
          {INTELLIGENCE_CATEGORIES.map(c => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sector || 'all'} onValueChange={(v) => v && onSectorChange(v)}>
        <SelectTrigger className="w-[140px] bg-card border-border text-foreground">
          <SelectValue placeholder="行业" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          <SelectItem value="all">全部行业</SelectItem>
          {SECTORS.map(s => (
            <SelectItem key={s.code} value={s.code}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={importance || 'all'} onValueChange={(v) => v && onImportanceChange(v)}>
        <SelectTrigger className="w-[140px] bg-card border-border text-foreground">
          <SelectValue placeholder="重要程度" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          <SelectItem value="all">全部程度</SelectItem>
          {IMPORTANCE_LEVELS.map(l => (
            <SelectItem key={l.value} value={l.value.toString()}>
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}