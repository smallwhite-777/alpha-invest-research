'use client'

import { useState, Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { LogoSerifTerminal } from '@/components/ui/LogoSerifTerminal'

const VERIFY_ERROR_TEXT: Record<string, string> = {
  expired: '验证链接已过期，请重新请求验证邮件。',
  invalid: '验证链接无效，请重新请求验证邮件。',
  not_found: '验证链接已失效或已被使用，请重新请求验证邮件。',
  no_user: '账号不存在，请先完成注册。',
  error: '验证过程中出错，请稍后重试。',
}

function LoginForm() {
  const router = useRouter()
  const search = useSearchParams()
  const from = search.get('from') || '/'
  const verifiedFlag = search.get('verified') === '1'
  const verifyError = search.get('verifyError')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendStatus, setResendStatus] = useState<null | 'sending' | 'sent' | 'failed'>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (verifiedFlag) setInfo('邮箱验证成功，请用注册时设置的密码登录。')
    else if (verifyError && VERIFY_ERROR_TEXT[verifyError]) setError(VERIFY_ERROR_TEXT[verifyError])
  }, [verifiedFlag, verifyError])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setNeedsVerification(false)
    setResendStatus(null)
    setSubmitting(true)
    const res = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    })
    setSubmitting(false)
    if (res?.error) {
      const code = res.error.toLowerCase()
      if (code.includes('email_not_verified')) {
        setNeedsVerification(true)
        setError('请先完成邮箱验证。')
      } else if (code === 'configuration' || code === 'callbackrouteerror') {
        setError('登录失败，请稍后重试。')
      } else {
        setError('邮箱或密码错误')
      }
      return
    }
    router.push(from)
    router.refresh()
  }

  async function resendVerification() {
    if (!email.trim()) {
      setError('请先输入注册时使用的邮箱地址')
      return
    }
    setResendStatus('sending')
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">邮箱</label>
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
        <label className="block text-xs text-muted-foreground mb-1.5">密码</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border focus:outline-none focus:border-foreground transition-colors"
          placeholder="••••••••"
        />
      </div>
      {info && <div className="text-sm text-emerald-600 dark:text-emerald-400">{info}</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}
      {needsVerification && (
        <div className="text-xs space-y-2 p-3 border border-border bg-surface-low">
          <p className="text-muted-foreground">
            我们已经给你的邮箱发过一封验证邮件，请去收件箱（含垃圾邮件）找一下。如果没收到，可以点下面按钮重发。
          </p>
          <button
            type="button"
            onClick={resendVerification}
            disabled={resendStatus === 'sending' || resendStatus === 'sent'}
            className="text-foreground underline-offset-2 hover:underline disabled:opacity-50"
          >
            {resendStatus === 'sending'
              ? '发送中...'
              : resendStatus === 'sent'
                ? '已重新发送，请检查邮箱'
                : resendStatus === 'failed'
                  ? '发送失败，稍后重试'
                  : '重新发送验证邮件'}
          </button>
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-foreground text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {submitting ? '登录中...' : '登录'}
      </button>
      <div className="text-center text-sm text-muted-foreground">
        还没有账号？
        <Link
          href={from !== '/' ? `/register?from=${encodeURIComponent(from)}` : '/register'}
          className="text-foreground font-medium hover:underline ml-1"
        >
          立即注册
        </Link>
      </div>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-full flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <LogoSerifTerminal size={20} color="var(--foreground)" />
          <h1 className="mt-6 text-xl font-medium">登录账号</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            登录后可解锁独家情报与 AI 智能分析
          </p>
        </div>
        <Suspense fallback={<div className="text-center text-sm text-muted-foreground">加载中...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
