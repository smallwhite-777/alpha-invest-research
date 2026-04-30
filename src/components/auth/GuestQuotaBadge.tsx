'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
import { Sparkles } from 'lucide-react'

const CREAM = '#e4e2dd'

export type QuotaPayload = {
  isGuest: boolean
  ai: { used: number; limit: number; remaining: number; unlimited: boolean }
  deepReport: { used: number; limit: number; remaining: number; unlimited: boolean }
}

const fetcher = async (url: string): Promise<QuotaPayload> => {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('quota fetch failed')
  return res.json()
}

export function useGuestQuota() {
  const { status } = useSession()
  const swr = useSWR<QuotaPayload>(
    status === 'unauthenticated' ? '/api/quota' : null,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  )
  return { ...swr, status }
}

export function GuestQuotaBadge() {
  const { status } = useSession()
  const pathname = usePathname() || '/'
  const { data } = useSWR<QuotaPayload>(
    status === 'unauthenticated' ? '/api/quota' : null,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  )

  if (status !== 'unauthenticated' || !data?.isGuest) return null

  const aiLeft = Math.max(0, data.ai.remaining)
  const reportLeft = Math.max(0, data.deepReport.remaining)
  const allUsed = aiLeft === 0 && reportLeft === 0

  return (
    <Link
      href={`/register${pathname !== '/' ? `?from=${encodeURIComponent(pathname)}` : ''}`}
      className="hidden md:flex items-center gap-1.5 transition-colors"
      title="游客每日免费额度，注册后无限使用"
      style={{
        fontSize: 11,
        padding: '4px 9px',
        color: CREAM,
        background: allUsed ? 'rgba(231, 111, 81, 0.18)' : 'rgba(228,226,221,0.08)',
        border: `1px solid ${allUsed ? 'rgba(231, 111, 81, 0.45)' : 'rgba(228,226,221,0.18)'}`,
        borderRadius: 2,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      <Sparkles className="h-3 w-3" />
      <span>
        免费 · AI {aiLeft}/{data.ai.limit} · 深度 {reportLeft}/{data.deepReport.limit}
      </span>
    </Link>
  )
}
