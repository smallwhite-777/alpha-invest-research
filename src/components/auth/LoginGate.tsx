import Link from 'next/link'
import { Lock } from 'lucide-react'

interface LoginGateProps {
  from?: string
  title?: string
  description?: string
}

export function LoginGate({
  from,
  title = '独家内容',
  description = '该内容仅对登录用户可见，登录后即可解锁完整阅读。',
}: LoginGateProps) {
  const loginHref = from ? `/login?from=${encodeURIComponent(from)}` : '/login'
  const registerHref = from ? `/register?from=${encodeURIComponent(from)}` : '/register'

  return (
    <div className="border border-border bg-card p-8 flex flex-col items-center text-center">
      <div className="w-12 h-12 flex items-center justify-center bg-surface-high rounded-full mb-4">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      <div className="flex gap-3">
        <Link
          href={loginHref}
          className="px-4 py-2 text-sm font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          登录
        </Link>
        <Link
          href={registerHref}
          className="px-4 py-2 text-sm font-medium border border-border hover:bg-surface-low transition-colors"
        >
          免费注册
        </Link>
      </div>
    </div>
  )
}
