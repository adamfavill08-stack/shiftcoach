'use client'

import { ChevronRight, CalendarDays } from 'lucide-react'
import { RotaDay } from '../types'

interface RotaPageProps {
  days: RotaDay[]
  legend: Array<{ label: string; className: string }>
  onEdit: () => void
}

export function RotaPage({ days, legend, onEdit }: RotaPageProps) {
  return (
    <div className="flex h-full flex-col rounded-3xl bg-gradient-to-br from-white via-slate-100 to-white p-6 text-slate-900 shadow-lg shadow-slate-900/10 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:text-slate-50 dark:shadow-slate-900/40">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Shift rota</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">This week&apos;s pattern</p>
        </div>
        <CalendarDays className="h-5 w-5 text-slate-400 dark:text-slate-500" />
      </header>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {days.map((day) => (
          <div
            key={day.date}
            className={[
              'rounded-xl border border-transparent px-3 py-3 text-center',
              shiftColour(day.label),
            ].join(' ')}
          >
            <p className="text-xs font-semibold uppercase tracking-wide">
              {formatDay(day.date)}
            </p>
            <p className="mt-2 text-sm capitalize">{day.label || 'Off'}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        {legend.map((item) => (
          <span
            key={item.label}
            className={['inline-flex items-center rounded-full px-2.5 py-1 font-medium', item.className].join(' ')}
          >
            {item.label}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="mt-auto inline-flex h-12 w-full items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        Edit rota
        <ChevronRight className="ml-2 h-4 w-4" />
      </button>
    </div>
  )
}

function shiftColour(label?: string | null) {
  if (!label) return 'bg-amber-100/60 dark:bg-amber-500/20 dark:text-amber-200 text-amber-600'
  const lower = label.toLowerCase()
  if (lower.includes('night'))
    return 'bg-rose-100/60 text-rose-600 dark:bg-rose-500/20 dark:text-rose-200'
  if (lower.includes('day'))
    return 'bg-sky-100/60 text-sky-600 dark:bg-sky-500/20 dark:text-sky-200'
  if (lower.includes('morning'))
    return 'bg-emerald-100/60 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200'
  if (lower.includes('afternoon') || lower.includes('late'))
    return 'bg-violet-100/60 text-violet-600 dark:bg-violet-500/20 dark:text-violet-200'
  return 'bg-amber-100/60 text-amber-600 dark:bg-amber-500/20 dark:text-amber-200'
}

function formatDay(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso))
}
