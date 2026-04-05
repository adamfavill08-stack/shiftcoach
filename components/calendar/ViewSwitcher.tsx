'use client'

import { useRouter, usePathname } from 'next/navigation'
import { format } from 'date-fns'
import { Calendar, CalendarDays, List, Grid3x3 } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'

export function ViewSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslation()

  const views = [
    { id: 'month', labelKey: 'calendar.view.month', icon: Calendar, path: '/rota' },
    { id: 'week', labelKey: 'calendar.view.week', icon: CalendarDays, path: '/calendar/week' },
    { id: 'day', labelKey: 'calendar.view.day', icon: CalendarDays, path: '/calendar/day' },
    { id: 'year', labelKey: 'calendar.view.year', icon: Grid3x3, path: '/calendar/year' },
    { id: 'list', labelKey: 'calendar.view.list', icon: List, path: '/calendar/list' },
  ]

  const currentView = views.find(v => pathname?.startsWith(v.path)) || views[0]

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white/60 dark:bg-slate-800/50 backdrop-blur border border-slate-200/50 dark:border-slate-700/40 shadow-sm p-1">
      {views.map((view) => {
        const Icon = view.icon
        const isActive = currentView.id === view.id
        
        return (
          <button
            key={view.id}
            onClick={() => {
              if (view.id === 'day') {
                router.push(`/calendar/day?day=${format(new Date(), 'yyyyMMdd')}`)
              } else {
                router.push(view.path)
              }
            }}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium transition
              ${isActive
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }
            `}
          >
            <span className="hidden sm:inline">{t(view.labelKey)}</span>
            <Icon className="w-4 h-4 sm:hidden" />
          </button>
        )
      })}
    </div>
  )
}

