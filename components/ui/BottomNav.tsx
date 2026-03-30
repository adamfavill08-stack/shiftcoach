'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, BookOpen, Compass, User } from 'lucide-react'
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
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-100 border-t border-slate-200/60 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="w-full max-w-[430px] mx-auto px-2">
        <nav className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 flex-col items-center justify-center py-1.5 text-black"
              >
                <Icon className="h-5 w-5 text-black" aria-hidden />
                {active && (
                  <span className="mt-0.5 text-[11px] font-medium text-black">
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
