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

  const normalizedMeals = meals.map((meal) => ({
    ...meal,
    dayTag: meal.dayTag === 'tomorrow' ? 'tomorrow' : 'today',
  }))
  const todayMeals = normalizedMeals.filter((meal) => meal.dayTag === 'today')
  const tomorrowMeals = normalizedMeals.filter((meal) => meal.dayTag === 'tomorrow')

  return (
    <section className={`${shell} ${className}`.trim()} aria-label={title}>
      <h2 className={`${inter.className} text-[10px] font-semibold tracking-[0.01em] text-slate-900 dark:text-slate-100`}>{title}</h2>
      <div className="mt-4 space-y-4">
        {[{ key: 'today', title: 'TODAY', items: todayMeals }, { key: 'tomorrow', title: 'TOMORROW', items: tomorrowMeals }]
          .filter((section) => section.items.length > 0)
          .map((section) => (
            <div key={section.key}>
              <p className="mb-1 text-[10px] font-semibold tracking-[0.12em] text-slate-500 dark:text-slate-400">
                {section.title}
              </p>
              <ul className="list-none p-0">
                {section.items.map(({ label, time }, index) => {
                  const isNext = nextNorm != null && label.trim().toLowerCase() === nextNorm
                  const showBorderBelow = index < section.items.length - 1
                  const labelMuted = hasHighlight
                    ? 'text-slate-600 dark:text-slate-500'
                    : 'text-slate-800 dark:text-slate-100'

                  return (
                    <li
                      key={`${section.key}-${label}-${index}`}
                      className={[
                        'flex items-center gap-3 py-3.5',
                        isNext
                          ? '-mx-6 border-l-[3px] border-cyan-500 bg-cyan-50 px-6 dark:border-cyan-400 dark:bg-cyan-950/18'
                          : '',
                        showBorderBelow ? 'border-b border-slate-200 dark:border-[var(--border-subtle)]' : '',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'w-[56px] shrink-0 text-[15px] font-bold tabular-nums tracking-tight',
                          isNext ? 'text-cyan-900 dark:text-cyan-200' : 'text-cyan-600 dark:text-cyan-400',
                        ].join(' ')}
                      >
                        {time}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={[
                            'truncate text-[15px] leading-[1.15]',
                            isNext
                              ? 'font-semibold text-slate-900 dark:text-cyan-100'
                              : `font-medium ${labelMuted}`,
                          ].join(' ')}
                        >
                          {label}
                        </p>
                        {isNext ? (
                          <p className="mt-1 text-[11px] font-semibold leading-none text-cyan-900 dark:text-cyan-300">
                            Next meal
                          </p>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
      </div>
    </section>
  )
}
