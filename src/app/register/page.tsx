'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { LogoSerifTerminal } from '@/components/ui/LogoSerifTerminal'

interface RegisterSuccessState {
  email: string
  emailDelivered: boolean
  debugVerifyUrl?: string
}

function RegisterForm() {
  const search = useSearchParams()
  const from = search.get('from') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<RegisterSuccessState | null>(null)
  const [resendStatus, setResendStatus] = useState<null | 'sending' | 'sent' | 'failed'>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('密码至少 8 位')
      return
    }
    setSubmitting(true)

    const trimmedEmail = email.trim().toLowerCase()
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: trimmedEmail,
        password,
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data?.error ?? '注册失败，请重试')
      setSubmitting(false)
      return
    }

    const data = await res.json().catch(() => ({}))
    setSubmitting(false)
    setSuccess({
      email: trimmedEmail,
      emailDelivered: Boolean(data?.verification?.delivered),
      debugVerifyUrl: data?.verification?.debugVerifyUrl,
    })
  }

  async function resendVerification(targetEmail: string) {
    setResendStatus('sending')
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      })
      if (!res.ok) {
        setResendStatus('failed')
        return
      }
      setResendStatus('sent')
    } catch {
      setResendStatus('failed')
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-sm">
        <div className="p-4 border border-border bg-surface-low space-y-2">
          <p className="text-foreground font-medium">注册成功，请去邮箱完成验证</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            我们已向 <span className="text-foreground font-mono">{success.email}</span> 发送了一封验证邮件，
            请点击邮件中的链接完成激活后再登录。链接 24 小时内有效。
          </p>
          {!success.emailDelivered && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              提示：服务器尚未配置 SMTP，邮件未实际投递。
              {success.debugVerifyUrl ? (
                <>
                  调试链接：
                  <a href={success.debugVerifyUrl} className="underline break-all">
                    {success.debugVerifyUrl}
                  </a>
                </>
              ) : null}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => resendVerification(success.email)}
          disabled={resendStatus === 'sending' || resendStatus === 'sent'}
          className="w-full py-2.5 border border-border text-foreground hover:bg-surface-low transition-colors disabled:opacity-50"
        >
          {resendStatus === 'sending'
            ? '发送中...'
            : resendStatus === 'sent'
              ? '已重新发送'
              : resendStatus === 'failed'
                ? '发送失败，再试一次'
                : '没收到？重新发送'}
        </button>
        <Link
          href={from !== '/' ? `/login?from=${encodeURIComponent(from)}` : '/login'}
          className="block text-center text-xs text-muted-foreground hover:text-foreground"
        >
          已完成验证，前往登录 →
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">
          邮箱 <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border focus:outline-none focus:border-foreground transition-colors"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">
          密码 <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border focus:outline-none focus:border-foreground transition-colors"
          placeholder="至少 8 位"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">昵称</label>
        <input
          type="text"
          value={name}
          maxLength={50}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border focus:outline-none focus:border-foreground transition-colors"
          placeholder="可选，不填默认使用邮箱前缀"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">手机号</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border focus:outline-none focus:border-foreground transition-colors"
          placeholder="可选，仅作联系方式"
        />
      </div>
      {error && <div className="text-sm text-red-500">{error}</div>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-foreground text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {submitting ? '提交中...' : '注册并发送验证邮件'}
      </button>
      <div className="text-center text-sm text-muted-foreground">
        已有账号？
        <Link
          href={from !== '/' ? `/login?from=${encodeURIComponent(from)}` : '/login'}
          className="text-foreground font-medium hover:underline ml-1"
        >
          直接登录
        </Link>
      </div>
    </form>
  )
}

export default function RegisterPage() {
  return (
    <div className="min-h-full flex items-center justify-center px-4 py-12 overflow-y-auto">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <LogoSerifTerminal size={20} color="var(--foreground)" />
          <h1 className="mt-6 text-xl font-medium">创建账号</h1>
          <p className="mt-1 text-sm text-muted-foreground">免费注册，几秒即可开始</p>
        </div>
        <Suspense fallback={<div className="text-center text-sm text-muted-foreground">加载中...</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  )
}
