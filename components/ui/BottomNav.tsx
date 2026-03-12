'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, BookOpen, Compass, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/components/providers/language-provider'

// Google Fit–style bottom nav:
// - Home
// - Calendar
// - Blog
// - Browse
// - Profile
const navItems = [
  { href: '/dashboard', labelKey: 'nav.home', icon: Home },
  { href: '/rota', labelKey: 'nav.calendar', icon: Calendar },
  { href: '/blog', labelKey: 'nav.blog', icon: BookOpen },
  // Browse maps to progress/insights for now
  { href: '/progress', labelKey: 'nav.browse', icon: Compass },
  { href: '/profile', labelKey: 'nav.profile', icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { t } = useTranslation()

  // Determine active route
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    return pathname?.startsWith(href)
  }

  // Hide on auth pages
  if (pathname?.startsWith('/auth') || pathname?.startsWith('/onboarding')) {
    return null
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center">
      <div className="w-full max-w-[430px] bg-white/95 border-t border-slate-200/80 backdrop-blur-xl px-2 pb-safe pt-1.5">
        <nav className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center py-1.5',
                  'transition-colors duration-200',
                  active ? 'text-blue-600' : 'text-slate-500',
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5',
                    active ? 'text-blue-600' : 'text-slate-500',
                  )}
                />
                {active && (
                  <span className="mt-0.5 text-[11px] font-medium text-blue-600">
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
