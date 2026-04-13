'use client'

import { Inter } from 'next/font/google'
import type { MacroTargetsMealSlot } from '@/components/nutrition/MacroTargetsCard'

export type MealTimesScheduleCardProps = {
  meals?: MacroTargetsMealSlot[]
  highlightNextMealLabel?: string | null
  /** Localized title (e.g. `t('dashboard.mealTimes.title')`). */
  title?: string
  loading?: boolean
  className?: string
}

function DefaultMealIcon() {
  return (
    <span className="text-lg leading-none" aria-hidden>
      🍽️
    </span>
  )
}

const shell =
  'rounded-xl border border-slate-200/70 bg-white p-6 dark:border-[var(--border-subtle)] dark:bg-[var(--card)]'
const inter = Inter({ subsets: ['latin'] })

export function MealTimesScheduleCard({
  meals = [],
  highlightNextMealLabel,
  title = 'Meal times',
  loading,
  className = '',
}: MealTimesScheduleCardProps) {
  const nextNorm = highlightNextMealLabel?.trim().toLowerCase()
  const hasHighlight = nextNorm != null && nextNorm.length > 0

  if (loading) {
    return (
      <section className={`${shell} ${className}`.trim()} aria-busy aria-label={title}>
        <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200 dark:bg-slate-600" />
        <div className="mt-5 space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2.5">
                <div className="h-6 w-6 shrink-0 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
                <div className="h-4 flex-1 max-w-[10rem] animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
              </div>
              <div className="h-4 w-12 shrink-0 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (meals.length === 0) return null

  return (
    <section className={`${shell} ${className}`.trim()} aria-label={title}>
      <h2 className={`${inter.className} text-[10px] font-semibold tracking-[0.01em] text-slate-900 dark:text-slate-100`}>{title}</h2>
      <ul className="mt-4 list-none p-0">
        {meals.map(({ label, time, Icon }, index) => {
          const isNext = nextNorm != null && label.trim().toLowerCase() === nextNorm
          const showBorderBelow = index < meals.length - 1

          if (isNext) {
            return (
              <li key={`${label}-${index}`}>
                <div
                  className={[
                    '-mx-6 my-1.5 flex items-center justify-between gap-3 border-l-[3px] border-cyan-500 bg-cyan-50/55 px-6 py-3.5 dark:border-cyan-400 dark:bg-cyan-950/18',
                  ].join(' ')}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="shrink-0 text-lg leading-none" aria-hidden>
                      {Icon ? <Icon /> : <DefaultMealIcon />}
                    </span>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[15px] font-semibold leading-[1.15] text-slate-800 dark:text-cyan-100">{label}</p>
                      <p className="mt-1 text-[11px] font-semibold leading-none text-cyan-700 dark:text-cyan-300">Next meal</p>
                    </div>
                  </div>
                  <span className="shrink-0 self-center text-[15px] font-bold tabular-nums leading-none tracking-tight text-cyan-700 dark:text-cyan-200">
                    {time}
                  </span>
                </div>
                {showBorderBelow ? (
                  <div className="my-1.5 h-px bg-slate-100 dark:bg-[var(--border-subtle)]" aria-hidden />
                ) : null}
              </li>
            )
          }

          const labelMuted = hasHighlight
            ? 'text-slate-400 dark:text-slate-500'
            : 'text-slate-900 dark:text-slate-100'

          return (
            <li
              key={`${label}-${index}`}
              className={[
                'flex items-center justify-between gap-3 py-4',
                showBorderBelow ? 'border-b border-slate-100 dark:border-[var(--border-subtle)]' : '',
              ].join(' ')}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="shrink-0 text-lg leading-none opacity-90" aria-hidden>
                  {Icon ? <Icon /> : <DefaultMealIcon />}
                </span>
                <p className={`truncate text-[15px] font-medium ${labelMuted}`}>{label}</p>
              </div>
              <span className="shrink-0 text-[15px] font-bold tabular-nums tracking-tight text-cyan-600 dark:text-cyan-400">
                {time}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
