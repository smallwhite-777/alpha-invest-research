'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { LogoSerifTerminal } from '@/components/ui/LogoSerifTerminal'

function LoginForm() {
  const router = useRouter()
  const search = useSearchParams()
  const from = search.get('from') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const res = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    })
    setSubmitting(false)
    if (res?.error) {
      setError('邮箱或密码错误')
      return
    }
    router.push(from)
    router.refresh()
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
      {error && <div className="text-sm text-red-500">{error}</div>}
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
