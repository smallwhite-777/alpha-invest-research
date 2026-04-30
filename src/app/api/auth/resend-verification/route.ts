import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { issueAndSendVerification } from '@/lib/email-verification'

const schema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '请输入合法的邮箱地址' }, { status: 400 })
  }

  const { email } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })

  // 不暴露邮箱是否已注册：无论用户是否存在/是否已验证，都返回相同响应
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true, sent: false }, { status: 200 })
  }

  const result = await issueAndSendVerification({
    userId: user.id,
    email: user.email,
    name: user.name,
  })

  return NextResponse.json(
    {
      ok: true,
      sent: result.deliveryResult.delivered,
      debugVerifyUrl:
        !result.deliveryResult.delivered && process.env.NODE_ENV !== 'production'
          ? result.verifyUrl
          : undefined,
    },
    { status: 200 }
  )
}
