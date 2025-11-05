'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import clsx from 'clsx'
import { Home, BarChart3, Settings as SettingsIcon, CalendarDays, Plus } from 'lucide-react'
import { useQuickAdd } from '@/lib/quickAddContext'

const tabs = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/rota',      label: 'Rota', icon: '📅' },
  { href: '/meals',     label: 'Meals',icon: '🍽️' },
  { href: '/progress',  label: 'Progress', icon: '📈' },
  { href: '/settings',  label: 'Settings', icon: '⚙️' },
]

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const isActive = pathname === href || pathname?.startsWith(href)
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="flex flex-col items-center gap-0.5 text-xs"
    >
      <span
        className={clsx(
          'flex h-6 w-6 items-center justify-center',
          isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
        )}
      >
        {icon}
      </span>
      <span
        className={clsx(
          'text-[10px] font-medium tracking-wide',
          isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
        )}
      >
        {label}
      </span>
    </button>
  )
}

export function BottomNav() {
  const { open } = useQuickAdd()
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40">
      <div className="mx-auto max-w-md mb-1 rounded-t-3xl bg-white/95 dark:bg-[#0d0d0d]/95 border-t border-neutral-200/70 dark:border-neutral-800 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="relative flex items-center justify-between w-full px-10 pt-6 pb-5">
          {/* Left group */}
          <div className="flex items-center gap-10">
            <NavItem href="/dashboard" icon={<Home className="h-5 w-5" />} label="Home" />
            <NavItem href="/progress" icon={<BarChart3 className="h-5 w-5" />} label="Progress" />
          </div>

          {/* Right group */}
          <div className="flex items-center gap-10">
            <NavItem href="/rota" icon={<CalendarDays className="h-5 w-5" />} label="Rota" />
            <NavItem href="/settings" icon={<SettingsIcon className="h-5 w-5" />} label="Settings" />
          </div>

          {/* Center floating + */}
          <button
            type="button"
            onClick={open}
            className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center justify-center h-14 w-14 rounded-full bg-neutral-900 text-white shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:scale-105 active:scale-95 transition-transform border border-white/10"
            aria-label="Quick add"
          >
            <Plus className="h-7 w-7" strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </nav>
  )
}

