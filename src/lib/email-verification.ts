import 'server-only'
import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/db'
import { sendEmail, getPublicBaseUrl } from '@/lib/email'

export const VERIFICATION_TOKEN_TTL_HOURS = 24
const TOKEN_BYTE_LENGTH = 32

function generateToken(): string {
  return randomBytes(TOKEN_BYTE_LENGTH).toString('hex')
}

function buildVerifyUrl(token: string): string {
  return `${getPublicBaseUrl()}/api/auth/verify?token=${encodeURIComponent(token)}`
}

function buildEmailContent(name: string | null, verifyUrl: string) {
  const greeting = name ? `${name}` : '你好'
  const text = `${greeting}，

欢迎注册 open1nvest（开源投研）。请点击下方链接完成邮箱验证：

${verifyUrl}

链接有效期为 ${VERIFICATION_TOKEN_TTL_HOURS} 小时，过期后请回到登录页重新申请验证邮件。

如果你并没有注册 open1nvest 账号，请直接忽略此邮件。

— open1nvest 团队`

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#fafafa;padding:24px;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;">
    <tr><td style="padding:24px 32px;border-bottom:1px solid #efefef;">
      <span style="font-family:Georgia,serif;font-size:20px;letter-spacing:0.04em;">open1nvest</span>
    </td></tr>
    <tr><td style="padding:32px;">
      <p style="margin:0 0 12px;font-size:15px;">${greeting}：</p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.7;">欢迎注册 open1nvest（开源投研）。请点击下方按钮完成邮箱验证。</p>
      <p style="margin:24px 0;">
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#001629;color:#e4e2dd;text-decoration:none;font-size:14px;letter-spacing:0.05em;">完成邮箱验证</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#666;">如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
      <p style="margin:0 0 24px;font-size:12px;word-break:break-all;color:#1a1a1a;background:#f5f5f5;padding:10px 12px;">${verifyUrl}</p>
      <p style="margin:0;font-size:12px;color:#888;line-height:1.6;">
        链接有效期为 ${VERIFICATION_TOKEN_TTL_HOURS} 小时；过期后请回到登录页重新申请。<br/>
        如果你并没有注册 open1nvest 账号，请直接忽略此邮件。
      </p>
    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #efefef;font-size:11px;color:#999;">
      open1nvest · First Principles Investment Intelligence
    </td></tr>
  </table>
</body></html>`

  return { text, html }
}

export async function issueAndSendVerification(input: {
  userId: string
  email: string
  name?: string | null
}) {
  const token = generateToken()
  const expires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000)

  await prisma.verificationToken.deleteMany({ where: { identifier: input.email } })
  await prisma.verificationToken.create({
    data: { identifier: input.email, token, expires },
  })

  const verifyUrl = buildVerifyUrl(token)
  const { text, html } = buildEmailContent(input.name ?? null, verifyUrl)

  const result = await sendEmail({
    to: input.email,
    subject: '验证你的 open1nvest 邮箱',
    text,
    html,
  })

  return { token, expires, verifyUrl, deliveryResult: result }
}

export async function consumeVerificationToken(rawToken: string) {
  const token = rawToken.trim()
  if (!token) return { ok: false as const, reason: 'invalid' as const }

  const row = await prisma.verificationToken.findUnique({ where: { token } })
  if (!row) return { ok: false as const, reason: 'not_found' as const }
  if (row.expires.getTime() < Date.now()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {})
    return { ok: false as const, reason: 'expired' as const, identifier: row.identifier }
  }

  const user = await prisma.user.findUnique({ where: { email: row.identifier } })
  if (!user) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {})
    return { ok: false as const, reason: 'no_user' as const }
  }

  if (!user.emailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    })
  }
  await prisma.verificationToken.delete({ where: { token } }).catch(() => {})

  return { ok: true as const, email: user.email, userId: user.id }
}
