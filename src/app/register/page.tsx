'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { LogoSerifTerminal } from '@/components/ui/LogoSerifTerminal'

function RegisterForm() {
  const router = useRouter()
  const search = useSearchParams()
  const from = search.get('from') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('密码至少 8 位')
      return
    }
    setSubmitting(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
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

    const signRes = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    })
    setSubmitting(false)
    if (signRes?.error) {
      setError('注册成功，但自动登录失败，请前往登录页')
      return
    }
    router.push(from)
    router.refresh()
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
        {submitting ? '注册中...' : '注册并登录'}
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
