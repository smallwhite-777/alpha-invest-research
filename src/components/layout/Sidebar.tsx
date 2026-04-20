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
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* Logo - only show icon, text is in TopBar */}
      <div
        className={cn(
          'flex h-[48px] items-center border-b border-sidebar-border px-4',
          'justify-center'
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
          A
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-xl py-2 text-muted-foreground transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
