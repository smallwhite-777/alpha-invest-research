import 'server-only'
import { cookies } from 'next/headers'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/db'
import { getCurrentUser, type SessionUser } from '@/lib/auth-helpers'

export const GUEST_COOKIE_NAME = 'open1nvest_guest'
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export type QuotaKind = 'AI' | 'DEEP_REPORT'

export const QUOTA_LIMITS: Record<QuotaKind, number> = {
  AI: 3,
  DEEP_REPORT: 3,
}

export const QUOTA_LABELS: Record<QuotaKind, string> = {
  AI: 'AI 智能分析',
  DEEP_REPORT: '独家深度报告',
}

export type QuotaResult =
  | {
      allowed: true
      reason: 'authed'
      user: SessionUser
      remaining: null
      limit: null
      used: null
    }
  | {
      allowed: true
      reason: 'guest_under_limit'
      user: null
      remaining: number
      limit: number
      used: number
    }
  | {
      allowed: false
      reason: 'guest_limit_reached'
      user: null
      remaining: 0
      limit: number
      used: number
    }

function todayKey(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function readOrCreateGuestId(): Promise<string> {
  const store = await cookies()
  const existing = store.get(GUEST_COOKIE_NAME)?.value
  if (existing && existing.length >= 16) return existing

  const id = randomUUID()
  try {
    store.set({
      name: GUEST_COOKIE_NAME,
      value: id,
      path: '/',
      maxAge: GUEST_COOKIE_MAX_AGE,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    })
  } catch {
    // cookies().set() throws in server-component contexts; ignore
  }
  return id
}

export async function checkAndConsumeQuota(kind: QuotaKind): Promise<QuotaResult> {
  const user = await getCurrentUser()
  if (user) {
    return {
      allowed: true,
      reason: 'authed',
      user,
      remaining: null,
      limit: null,
      used: null,
    }
  }

  const limit = QUOTA_LIMITS[kind]
  const date = todayKey()
  const guestId = await readOrCreateGuestId()

  const existing = await prisma.guestUsage.findUnique({
    where: { guestId_kind_date: { guestId, kind, date } },
  })
  const currentCount = existing?.count ?? 0

  if (currentCount >= limit) {
    return {
      allowed: false,
      reason: 'guest_limit_reached',
      user: null,
      remaining: 0,
      limit,
      used: currentCount,
    }
  }

  const updated = await prisma.guestUsage.upsert({
    where: { guestId_kind_date: { guestId, kind, date } },
    update: { count: { increment: 1 } },
    create: { guestId, kind, date, count: 1 },
  })

  return {
    allowed: true,
    reason: 'guest_under_limit',
    user: null,
    remaining: Math.max(0, limit - updated.count),
    limit,
    used: updated.count,
  }
}

export async function peekQuota(kind: QuotaKind): Promise<{
  isGuest: boolean
  used: number
  limit: number
  remaining: number
}> {
  const user = await getCurrentUser()
  if (user) {
    return { isGuest: false, used: 0, limit: QUOTA_LIMITS[kind], remaining: QUOTA_LIMITS[kind] }
  }
  const limit = QUOTA_LIMITS[kind]
  const date = todayKey()
  const store = await cookies()
  const guestId = store.get(GUEST_COOKIE_NAME)?.value
  if (!guestId) {
    return { isGuest: true, used: 0, limit, remaining: limit }
  }
  const existing = await prisma.guestUsage.findUnique({
    where: { guestId_kind_date: { guestId, kind, date } },
  })
  const used = existing?.count ?? 0
  return { isGuest: true, used, limit, remaining: Math.max(0, limit - used) }
}

export function buildLimitReachedPayload(
  kind: QuotaKind,
  result: Extract<QuotaResult, { allowed: false }>
) {
  const label = QUOTA_LABELS[kind]
  return {
    error: `今日${label}免费体验次数已用完，请注册或登录后继续使用。`,
    requiresLogin: true,
    quota: {
      kind,
      limit: result.limit,
      used: result.used,
      remaining: 0,
    },
  }
}

export function buildQuotaInfo(quota: Extract<QuotaResult, { allowed: true }>, kind: QuotaKind) {
  if (quota.user) return null
  return {
    kind,
    limit: quota.limit,
    used: quota.used,
    remaining: quota.remaining,
  }
}
