'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BarChart2, Calendar, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuickAdd } from '@/lib/quickAddContext'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/progress', label: 'Progress', icon: BarChart2 },
  { href: '/rota', label: 'Rota', icon: Calendar },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { open } = useQuickAdd()

  // Only show on dashboard
  if (pathname !== '/dashboard') return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center">
      {/* Nav pill */}
      <div
        className={cn(
          'pointer-events-auto',
          // layout
          'mx-4 w-full max-w-md rounded-full px-8 py-3',
          'flex items-center justify-between gap-6',
          // light mode
          'bg-white/90 text-slate-600 shadow-[0_10px_40px_rgba(15,23,42,0.15)]',
          // dark mode
          'dark:bg-slate-900/90 dark:text-slate-300 dark:shadow-[0_10px_40px_rgba(0,0,0,0.7)]',
          // glass
          'backdrop-blur-xl border border-white/60 dark:border-slate-700/80'
        )}
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center text-xs font-medium transition-all',
                'gap-1',
                active
                  ? 'text-sky-500 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-100'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-colors',
                  active
                    ? 'stroke-sky-500 dark:stroke-sky-400'
                    : 'stroke-slate-500 dark:stroke-slate-400'
                )}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Floating + button */}
      <button
        type="button"
        onClick={open}
        className={cn(
          'pointer-events-auto',
          'absolute -top-6 left-1/2 -translate-x-1/2',
          'flex h-14 w-14 items-center justify-center rounded-full',
          'bg-black text-white shadow-[0_14px_40px_rgba(0,0,0,0.6)]',
          'dark:bg-white dark:text-black',
          'transition-transform hover:scale-105 active:scale-95'
        )}
        aria-label="Quick add"
      >
        <span className="text-2xl leading-none">+</span>
      </button>
    </div>
  )
}
