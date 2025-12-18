'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BarChart2, Calendar, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/progress', label: 'Progress', icon: BarChart2 },
  { href: '/rota', label: 'Calendar', icon: Calendar },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()

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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center pb-safe">
      {/* Ultra Premium Nav Pill */}
      <div
        className={cn(
          'pointer-events-auto',
          // Layout
          'mx-4 mb-6 w-full max-w-md rounded-[32px] px-2 py-2.5',
          'flex items-center justify-around gap-0.5',
          // Ultra premium styling with multiple layers
          'bg-white/98 dark:bg-slate-900/95 backdrop-blur-2xl',
          'border border-white/90 dark:border-slate-700/50',
          'shadow-[0_24px_80px_rgba(15,23,42,0.3),0_0_0_1px_rgba(255,255,255,0.6),inset_0_1px_0_rgba(255,255,255,0.8)]',
          'dark:shadow-[0_24px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(59,130,246,0.1)]',
          'relative overflow-hidden'
        )}
      >
        {/* Multi-layer gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/50 to-white/70 dark:from-slate-900/70 dark:via-slate-800/50 dark:to-slate-900/70 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/15 pointer-events-none" />
        
        {/* Inner ring glow with multiple layers */}
        <div className="absolute inset-[1px] rounded-[31px] ring-1 ring-white/80 dark:ring-slate-700/50 pointer-events-none" />
        <div className="absolute inset-[2px] rounded-[30px] ring-[0.5px] ring-white/40 dark:ring-slate-600/30 pointer-events-none" />
        
        {/* Ambient glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-br from-blue-100/20 via-indigo-100/10 to-purple-100/20 dark:from-blue-500/10 dark:via-indigo-500/8 dark:to-purple-500/10 blur-2xl pointer-events-none opacity-60 dark:opacity-40" />
        
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative z-10',
                'flex flex-1 flex-col items-center justify-center',
                'px-2 py-2.5 rounded-[20px]',
                'transition-all duration-500 ease-out',
                'group',
                active
                  ? 'bg-gradient-to-br from-blue-500/12 via-indigo-500/10 to-purple-500/12 dark:from-blue-500/20 dark:via-indigo-500/15 dark:to-purple-500/20 shadow-[inset_0_2px_8px_rgba(59,130,246,0.15)] dark:shadow-[inset_0_2px_8px_rgba(59,130,246,0.25)]'
                  : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/60'
              )}
            >
              {/* Active indicator with premium glow */}
              {active && (
                <>
                  <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-purple-500/20 blur-md" />
                  <div className="absolute inset-[1px] rounded-[19px] bg-gradient-to-b from-white/40 to-transparent" />
                </>
              )}
              
              <div className={cn(
                'relative z-10 flex flex-col items-center justify-center gap-1',
                'transition-all duration-500 ease-out',
                active ? 'scale-110 translate-y-[-1px]' : 'scale-100 group-hover:scale-105'
              )}>
                {/* Icon container with premium effects */}
                <div className={cn(
                  'relative flex items-center justify-center',
                  'transition-all duration-500',
                  active ? 'scale-115' : 'scale-100'
                )}>
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-all duration-500 relative z-10',
                      active
                        ? 'text-blue-600 dark:text-blue-400 stroke-[2.5] drop-shadow-[0_2px_4px_rgba(59,130,246,0.3)] dark:drop-shadow-[0_2px_4px_rgba(59,130,246,0.5)]'
                        : 'text-slate-500 dark:text-slate-400 stroke-2 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                    )}
                  />
                  {/* Active icon glow effect */}
                  {active && (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-10 w-10 rounded-full bg-blue-500/25 blur-lg animate-pulse" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-6 w-6 rounded-full bg-blue-400/30 blur-sm" />
                      </div>
                    </>
                  )}
                </div>
                
                {/* Label with premium typography */}
                <span className={cn(
                  'text-[10px] font-bold tracking-[0.05em] transition-all duration-500',
                  active
                    ? 'text-blue-600 dark:text-blue-400 drop-shadow-[0_1px_2px_rgba(59,130,246,0.2)] dark:drop-shadow-[0_1px_2px_rgba(59,130,246,0.4)]'
                    : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                )}>
                  {item.label}
                </span>
                
                {/* Active indicator dot */}
                {active && (
                  <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
