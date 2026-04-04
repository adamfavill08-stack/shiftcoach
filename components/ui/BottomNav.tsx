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
      <div className="w-full max-w-[430px] mx-auto px-2">
        <nav className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 flex-col items-center justify-center py-1.5"
              >
                <Icon
                  className={`h-5 w-5 stroke-current ${
                    active
                      ? 'text-[var(--text-main)] dark:text-white'
                      : 'text-[var(--text-soft)] dark:text-white'
                  }`}
                  aria-hidden
                />
                {active && (
                  <span className="mt-0.5 text-[11px] font-medium text-[var(--text-main)] dark:text-white">
                    {t(item.labelKey)}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
