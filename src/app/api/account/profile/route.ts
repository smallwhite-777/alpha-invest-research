import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'

const profileSchema = z.object({
  name: z.string().max(50).nullable().optional(),
  phone: z
    .union([
      z.string().regex(/^1[3-9]\d{9}$/, '请输入合法的中国大陆手机号'),
      z.literal(''),
      z.null(),
    ])
    .optional(),
})

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }

  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json({ error: first?.message ?? '参数错误' }, { status: 400 })
  }

  const data = parsed.data
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: data.name === undefined ? undefined : data.name?.trim() || null,
      phone:
        data.phone === undefined
          ? undefined
          : data.phone === '' || data.phone === null
            ? null
            : data.phone,
    },
    select: { id: true, name: true, phone: true },
  })

  return NextResponse.json({ user: updated })
}
