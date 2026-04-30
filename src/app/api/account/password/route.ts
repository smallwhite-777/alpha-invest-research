import { NextRequest, NextResponse } from 'next/server'
import { compare, hash } from 'bcryptjs'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string().min(8, '新密码至少 8 位').max(72),
})

export async function PATCH(req: NextRequest) {
  const sessionUser = await getCurrentUser()
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }

  const parsed = passwordSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json({ error: first?.message ?? '参数错误' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, passwordHash: true },
  })
  if (!user?.passwordHash) {
    return NextResponse.json({ error: '账号无密码记录' }, { status: 400 })
  }

  const ok = await compare(parsed.data.currentPassword, user.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: '当前密码不正确' }, { status: 400 })
  }

  const newHash = await hash(parsed.data.newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  })

  return NextResponse.json({ ok: true })
}
