'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Shield, BarChart3, Globe, FileText, Newspaper, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'

const ICON_MAP = {
  Home,
  Shield,
  BarChart3,
  Globe,
  FileText,
  Newspaper,
  Search,
} as const

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'flex h-screen flex-col bg-surface-low transition-all duration-200',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-center px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center gradient-primary text-xs font-bold text-primary-foreground tracking-widest">
          A
        </div>
      </div>

      {/* Navigation — asymmetrical, editorial feel */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-150',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-surface-high text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-surface-high/60 hover:text-foreground'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider">{item.label}</span>
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center py-2 text-muted-foreground transition-all duration-150 hover:bg-surface-high hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  )
}
