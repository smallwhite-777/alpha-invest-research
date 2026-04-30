import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { issueAndSendVerification } from '@/lib/email-verification'

const registerSchema = z.object({
  email: z.string().email('请输入合法的邮箱地址').transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8, '密码至少 8 位').max(72, '密码过长'),
  name: z.string().min(1, '请填写昵称').max(50).optional(),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, '请输入合法的中国大陆手机号')
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json({ error: first?.message ?? '参数错误' }, { status: 400 })
  }

  const { email, password, name, phone } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: '该邮箱已被注册' }, { status: 409 })
  }

  const passwordHash = await hash(password, 10)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: name ?? email.split('@')[0],
      phone,
      role: 'USER',
    },
    select: { id: true, email: true, name: true },
  })

  const verification = await issueAndSendVerification({
    userId: user.id,
    email: user.email,
    name: user.name,
  })

  return NextResponse.json(
    {
      user,
      verification: {
        delivered: verification.deliveryResult.delivered,
        // 仅当 SMTP 未配置且非生产时，把 token 链接吐回，方便本地联调；线上不再回显
        debugVerifyUrl:
          !verification.deliveryResult.delivered && process.env.NODE_ENV !== 'production'
            ? verification.verifyUrl
            : undefined,
      },
    },
    { status: 201 }
  )
}
