import 'server-only'
import nodemailer, { type Transporter } from 'nodemailer'

let cachedTransporter: Transporter | null = null
let cachedSignature = ''

function buildSignature() {
  return [
    process.env.SMTP_HOST,
    process.env.SMTP_PORT,
    process.env.SMTP_USER,
    process.env.SMTP_SECURE,
  ].join('|')
}

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null

  const sig = buildSignature()
  if (cachedTransporter && sig === cachedSignature) return cachedTransporter

  const port = Number(process.env.SMTP_PORT || 465)
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })
  cachedSignature = sig
  return cachedTransporter
}

export interface SendMailInput {
  to: string
  subject: string
  text: string
  html: string
}

export interface SendMailResult {
  delivered: boolean
  preview?: string
  reason?: string
}

export async function sendEmail(input: SendMailInput): Promise<SendMailResult> {
  const transporter = getTransporter()
  const fromAddress =
    process.env.MAIL_FROM ||
    (process.env.SMTP_USER ? `open1nvest <${process.env.SMTP_USER}>` : 'open1nvest@localhost')

  if (!transporter) {
    console.warn(
      '[email] SMTP not configured (need SMTP_HOST/SMTP_USER/SMTP_PASS). ' +
        'Logging the message instead of sending it.'
    )
    console.log('[email:fallback] to=%s subject=%s', input.to, input.subject)
    console.log('[email:fallback] text:\n%s', input.text)
    return { delivered: false, reason: 'smtp_not_configured', preview: input.text }
  }

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    })
    return { delivered: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] sendMail failed:', message)
    return { delivered: false, reason: message }
  }
}

export function getPublicBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (explicit) return explicit.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}
