'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, BookOpen, Settings } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'

// Bottom nav: Home, Calendar, Blog, Settings (profile lives under Settings → Profile)
const navItems = [
  { href: '/dashboard', labelKey: 'nav.home', icon: Home },
  { href: '/rota', labelKey: 'nav.calendar', icon: Calendar },
  { href: '/blog', labelKey: 'nav.blog', icon: BookOpen },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { t } = useTranslation()

  // Determine active route
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    if (href === '/settings') {
      return pathname === '/settings' || pathname?.startsWith('/settings/')
    }
    return pathname?.startsWith(href)
  }

  // Hide on auth, onboarding, splash, and welcome pages
  if (
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/onboarding') ||
    pathname === '/splash' ||
    pathname === '/' ||
    pathname === '/welcome'
  ) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-200/60 bg-slate-100 pb-[calc(env(safe-area-inset-bottom)+12px)] dark:border-[var(--border-subtle)] dark:bg-black">
      <div className="w-full max-w-[430px] mx-auto px-1">
        <nav className="flex min-h-[60px] items-stretch justify-around gap-0.5 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                data-guided-tour={
                  item.href === '/settings'
                    ? 'nav-settings'
                    : item.href === '/rota'
                      ? 'nav-calendar'
                      : undefined
                }
                aria-current={active ? 'page' : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 ${
                  active
                    ? 'text-[#0f172a] dark:text-white'
                    : 'text-[#64748b] dark:text-white/65'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0 stroke-current" aria-hidden />
                <span
                  className={`max-w-full truncate text-center text-[10px] leading-tight ${
                    active ? 'font-semibold' : 'font-medium opacity-90 dark:opacity-80'
                  }`}
                >
                  {t(item.labelKey)}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
