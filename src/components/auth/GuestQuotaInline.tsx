'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { useGuestQuota } from './GuestQuotaBadge'

interface GuestQuotaInlineProps {
  kind?: 'AI' | 'DEEP_REPORT' | 'ALL'
  className?: string
}

export function GuestQuotaInline({ kind = 'ALL', className }: GuestQuotaInlineProps) {
  const { data, status } = useGuestQuota()
  const pathname = usePathname() || '/'

  if (status !== 'unauthenticated' || !data?.isGuest) return null

  const ai = data.ai
  const dr = data.deepReport
  const showAi = kind === 'AI' || kind === 'ALL'
  const showDr = kind === 'DEEP_REPORT' || kind === 'ALL'

  const aiUsedUp = ai.remaining <= 0
  const drUsedUp = dr.remaining <= 0
  const anyUsedUp = (showAi && aiUsedUp) || (showDr && drUsedUp)

  const registerHref = `/register?from=${encodeURIComponent(pathname)}`
  const loginHref = `/login?from=${encodeURIComponent(pathname)}`

  return (
    <div
      className={`flex flex-wrap items-center gap-3 px-4 py-3 text-xs ${className ?? ''}`}
      style={{
        background: anyUsedUp ? 'rgba(231, 111, 81, 0.10)' : 'var(--surface-low)',
        border: `1px solid ${anyUsedUp ? 'rgba(231, 111, 81, 0.40)' : 'var(--border)'}`,
      }}
    >
      <Sparkles className="h-3.5 w-3.5 text-secondary" />
      <span className="text-foreground">
        游客模式 · 今日免费额度：
        {showAi && (
          <strong className="ml-1 font-mono-data">
            AI 分析 {ai.remaining}/{ai.limit}
          </strong>
        )}
        {showAi && showDr && <span className="mx-1.5 text-muted-foreground">·</span>}
        {showDr && (
          <strong className="font-mono-data">
            深度报告 {dr.remaining}/{dr.limit}
          </strong>
        )}
      </span>
      <span className="ml-auto flex items-center gap-2">
        <Link href={loginHref} className="text-muted-foreground underline-offset-2 hover:underline">
          登录
        </Link>
        <Link
          href={registerHref}
          className="px-2.5 py-1 bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          免费注册解除限制
        </Link>
      </span>
    </div>
  )
}
