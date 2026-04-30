'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { LogIn, User as UserIcon, LogOut, Shield } from 'lucide-react'

const CREAM = '#e4e2dd'

function initialOf(name: string | null | undefined, email: string | null | undefined): string {
  const seed = (name || email || '?').trim()
  return seed.charAt(0).toUpperCase()
}

export function UserMenu() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (status === 'loading') {
    return (
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: 'rgba(228,226,221,0.15)',
          marginLeft: 4,
        }}
      />
    )
  }

  if (!session?.user) {
    return (
      <Link
        href={`/login${pathname && pathname !== '/' ? `?from=${encodeURIComponent(pathname)}` : ''}`}
        className="flex items-center transition-colors"
        style={{
          fontSize: 12,
          padding: '5px 10px',
          color: CREAM,
          background: 'rgba(228,226,221,0.1)',
          border: '1px solid rgba(228,226,221,0.2)',
          borderRadius: 2,
          gap: 6,
        }}
      >
        <LogIn className="h-3.5 w-3.5" />
        登录
      </Link>
    )
  }

  const user = session.user
  const isAdmin = user.role === 'ADMIN'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="用户菜单"
        className="flex items-center justify-center transition-colors"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: isAdmin ? '#6fa888' : 'rgba(228,226,221,0.18)',
          color: isAdmin ? '#001629' : CREAM,
          fontSize: 12,
          fontWeight: 600,
          border: 0,
          cursor: 'pointer',
        }}
      >
        {initialOf(user.name, user.email)}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50"
          style={{
            minWidth: 200,
            background: 'var(--background)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            borderRadius: 4,
            padding: '6px 0',
            fontSize: 13,
          }}
        >
          <div className="px-3 py-2 border-b border-border">
            <div className="font-medium truncate">{user.name || user.email?.split('@')[0]}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            {isAdmin && (
              <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium" style={{ background: '#6fa888', color: '#001629' }}>
                <Shield className="h-3 w-3" />
                管理员
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setOpen(false)
              router.push('/account')
            }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-low text-left"
          >
            <UserIcon className="h-4 w-4" />
            个人中心
          </button>
          <button
            onClick={async () => {
              setOpen(false)
              await signOut({ callbackUrl: '/' })
            }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-low text-left"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      )}
    </div>
  )
}
