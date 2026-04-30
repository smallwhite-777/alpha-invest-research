import { NextResponse } from 'next/server'
import { peekQuota, QUOTA_LIMITS } from '@/lib/guest-quota'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET() {
  const user = await getCurrentUser()
  if (user) {
    return NextResponse.json({
      isGuest: false,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      ai: { used: 0, limit: QUOTA_LIMITS.AI, remaining: QUOTA_LIMITS.AI, unlimited: true },
      deepReport: {
        used: 0,
        limit: QUOTA_LIMITS.DEEP_REPORT,
        remaining: QUOTA_LIMITS.DEEP_REPORT,
        unlimited: true,
      },
    })
  }

  const [ai, deep] = await Promise.all([peekQuota('AI'), peekQuota('DEEP_REPORT')])
  return NextResponse.json({
    isGuest: true,
    user: null,
    ai: { used: ai.used, limit: ai.limit, remaining: ai.remaining, unlimited: false },
    deepReport: {
      used: deep.used,
      limit: deep.limit,
      remaining: deep.remaining,
      unlimited: false,
    },
  })
}
