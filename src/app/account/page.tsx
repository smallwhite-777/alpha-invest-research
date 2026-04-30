import { redirect } from 'next/navigation'
import { Shield } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { AccountForm } from './AccountForm'

export default async function AccountPage() {
  const sessionUser = await getCurrentUser()
  if (!sessionUser) redirect('/login?from=/account')

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  })
  if (!user) redirect('/login?from=/account')

  const isAdmin = user.role === 'ADMIN'

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold">个人中心</h1>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium" style={{ background: '#6fa888', color: '#001629' }}>
                <Shield className="h-3 w-3" />
                管理员
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            管理你的资料、绑定信息和登录密码。
          </p>
        </div>

        <section className="border border-border bg-card p-6">
          <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">账号信息</h2>
          <dl className="grid grid-cols-[120px_1fr] gap-y-3 text-sm">
            <dt className="text-muted-foreground">邮箱</dt>
            <dd>{user.email}</dd>
            <dt className="text-muted-foreground">注册时间</dt>
            <dd>{new Date(user.createdAt).toLocaleString('zh-CN')}</dd>
            <dt className="text-muted-foreground">角色</dt>
            <dd>{isAdmin ? '管理员' : '普通用户'}</dd>
          </dl>
        </section>

        <section className="border border-border bg-card p-6">
          <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">资料与安全</h2>
          <AccountForm
            initialName={user.name ?? ''}
            initialPhone={user.phone ?? ''}
          />
        </section>
      </div>
    </div>
  )
}
