'use client'

import React from 'react'
import { getMacroReason } from '@/lib/nutrition/getMacroReason'
import { MacroCard, MACRO_CARD_RING_SIZE } from '@/components/nutrition/MacroCard'

export type MacroTargetsMealSlot = {
  label: string
  time: string
  dayTag?: 'today' | 'tomorrow'
  calories?: number
  Icon?: React.ComponentType<{ className?: string }>
}

export type MacroTargetsCardProps = {
  macros: { protein_g: number; carbs_g: number; fat_g: number } | null
  adjustedCalories?: number
  goal?: 'lose' | 'maintain' | 'gain' | null
  macroPreset?: 'balanced' | 'high_protein' | 'custom' | null
  shiftType?: 'day' | 'night' | 'off' | 'early' | 'late' | 'other' | null
  rhythmScore?: number | null
  sleepHoursLast24h?: number | null
  consumedMacros?: { protein_g: number; carbs_g: number; fat_g: number } | null
  mealTimesData?: MacroTargetsMealSlot[]
  mealTimesPreface?: string | null
  /** Matches `/api/meal-timing/today` `nextMealLabel` to highlight a row in the meal list. */
  highlightNextMealLabel?: string | null
  loading?: boolean
  /** 'compact' = mobile / route styling; 'elevated' = glass card for desktop detail */
  variant?: 'compact' | 'elevated'
  className?: string
}

function DefaultMealIcon({ className }: { className?: string }) {
  return (
    <span
      className={`text-[15px] leading-none text-slate-500 dark:text-slate-300 ${className ?? ''}`}
      aria-hidden
    >
      🍽️
    </span>
  )
}

function scheduleContext(shiftType: MacroTargetsCardProps['shiftType']) {
  if (shiftType == null) return null
  if (shiftType === 'night') return "Tonight's shift"
  if (shiftType === 'day' || shiftType === 'early' || shiftType === 'late') return "Today's shift"
  if (shiftType === 'off') return 'For your day off'
  return 'Your schedule'
}

export function MacroTargetsCard({
  macros,
  adjustedCalories: _adjusted,
  goal,
  macroPreset,
  shiftType,
  rhythmScore,
  sleepHoursLast24h,
  consumedMacros: _consumedMacros,
  mealTimesData,
  mealTimesPreface,
  highlightNextMealLabel,
  loading,
  variant = 'compact',
  className = '',
}: MacroTargetsCardProps) {
  const reasonTip = getMacroReason({
    shiftType,
    goal,
    rhythmScore,
    sleepHoursLast24h,
    macroPreset,
  })

  const compactShell =
    'rounded-xl border border-slate-200/70 bg-white p-6 dark:border-[var(--border-subtle)] dark:bg-[var(--card)]'

  if (loading) {
    const shell =
      variant === 'elevated'
        ? 'relative overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-700/40 bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)]'
        : `${compactShell} flex flex-col gap-5`
    return (
      <section className={`${shell} ${className}`.trim()}>
        {variant === 'elevated' ? (
          <>
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
            <div className="relative z-10 animate-pulse space-y-5">
              <div className="h-5 w-40 rounded-full bg-slate-200/80 dark:bg-slate-700" />
              <div className="h-3 w-full max-w-sm rounded-full bg-slate-100 dark:bg-slate-800" />
              <div className="flex justify-around gap-2 pt-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-2.5">
                    <div
                      className="rounded-full bg-slate-200/90 dark:bg-slate-700"
                      style={{ width: MACRO_CARD_RING_SIZE, height: MACRO_CARD_RING_SIZE }}
                    />
                    <div className="h-3 w-14 rounded-full bg-slate-100 dark:bg-slate-800" />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="animate-pulse">
            <div className="h-3 w-32 rounded-full bg-slate-200/90 dark:bg-slate-600" />
            <div className="flex justify-around gap-2 pt-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2.5">
                  <div
                    className="rounded-full bg-slate-200/90 dark:bg-slate-600"
                    style={{ width: MACRO_CARD_RING_SIZE, height: MACRO_CARD_RING_SIZE }}
                  />
                  <div className="h-3 w-12 rounded-full bg-slate-100 dark:bg-slate-700" />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    )
  }

  if (!macros) {
    const shell =
      variant === 'elevated'
        ? 'relative overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-700/40 bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl p-6'
        : `${compactShell} flex flex-col gap-5`
    return (
      <section className={`${shell} ${className}`.trim()}>
        {variant === 'elevated' ? (
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
        ) : null}
        <div className={variant === 'elevated' ? 'relative z-10' : ''}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            Macro targets
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            Macro targets will appear when your nutrition target is available.
          </p>
        </div>
      </section>
    )
  }

  const outer =
    variant === 'elevated'
      ? [
          'relative overflow-hidden rounded-3xl',
          'bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl',
          'border border-slate-200/50 dark:border-slate-700/40',
          'text-slate-900 dark:text-slate-100',
          'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)]',
          'dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]',
          'p-6',
        ].join(' ')
      : `${compactShell} flex flex-col gap-6`

  if (variant === 'compact') {
    const ctx = scheduleContext(shiftType)
    const mealRows = mealTimesData ?? []
    const nextLabelNorm = highlightNextMealLabel?.trim().toLowerCase()

    return (
      <section className={`${outer} ${className}`.trim()}>
        <div className="flex flex-col gap-6">
          <div>
            <MacroCard
              embedded
              carbs_g={macros.carbs_g}
              protein_g={macros.protein_g}
              fat_g={macros.fat_g}
            />
            <p className="mt-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{reasonTip}</p>
          </div>

          {mealRows.length > 0 ? (
            <>
              <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent dark:via-[var(--border-subtle)]" />

              <div className="flex flex-col gap-3">
                <header>
                  <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-900 dark:text-slate-100">Meal times</h3>
                  {ctx ? (
                    <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{ctx}</p>
                  ) : null}
                </header>

                {mealTimesPreface ? <p className="text-[12px] text-slate-600 dark:text-slate-300">{mealTimesPreface}</p> : null}

                <div className="overflow-hidden rounded-[20px] border border-slate-200/60 bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-[var(--border-subtle)] dark:bg-[var(--card-subtle)] dark:shadow-none">
                  {mealRows.map(({ label, time, Icon }, index) => {
                    const isNext = nextLabelNorm != null && label.trim().toLowerCase() === nextLabelNorm
                    return (
                      <div
                        key={`${label}-${index}`}
                        className={[
                          'flex items-center justify-between gap-3 border-b border-slate-200/35 px-4 py-3.5 last:border-b-0 dark:border-[var(--border-subtle)]',
                          isNext ? 'bg-slate-50/70 dark:bg-white/5' : '',
                        ].join(' ')}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/55 bg-slate-50/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] dark:border-[var(--border-subtle)] dark:bg-[var(--card)] dark:shadow-none">
                            {Icon ? <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" /> : <DefaultMealIcon />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold text-slate-800 dark:text-slate-100">{label}</p>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                              Suggested
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-[15px] font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
                          {time}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </section>
    )
  }

  /* ——— elevated (dashboard) ——— */
  const titleClass = 'text-[17px] font-semibold tracking-tight'
  const subtitleClass = 'text-sm text-slate-600 dark:text-slate-400 leading-relaxed'
  const reasonClass = 'text-[11px] leading-relaxed text-slate-500 dark:text-slate-400'

  return (
    <section className={`${outer} ${className}`.trim()}>
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl p-6 ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />

      <div className="relative z-10 space-y-6">
        <div className="space-y-2">
          <p className={subtitleClass}>
            Your macro target today, based on your shift-tuned calories and goal.
          </p>
          <p className={reasonClass}>{reasonTip}</p>
        </div>

        <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:border-slate-700/50 dark:bg-slate-900/55 dark:shadow-none">
          <MacroCard
            embedded
            carbs_g={macros.carbs_g}
            protein_g={macros.protein_g}
            fat_g={macros.fat_g}
          />
        </div>

        {mealTimesData && mealTimesData.length > 0 ? (
          <div className="space-y-3 pt-1">
            <div>
              <h3 className={titleClass}>Meal times</h3>
              {shiftType != null ? (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{scheduleContext(shiftType)}</p>
              ) : null}
              {mealTimesPreface ? (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{mealTimesPreface}</p>
              ) : null}
            </div>
            <div className="overflow-hidden rounded-[20px] border border-slate-200/60 bg-white/80 dark:border-slate-700/40 dark:bg-slate-800/50">
              {mealTimesData.map(({ label, time, dayTag, Icon }, index) => {
                const isNext =
                  highlightNextMealLabel != null &&
                  label.trim().toLowerCase() === highlightNextMealLabel.trim().toLowerCase()
                const dayText = dayTag === 'tomorrow' ? 'Tomorrow' : 'Today'
                return (
                  <div
                    key={`${label}-${index}`}
                    className={[
                      'flex items-center justify-between gap-3 border-b border-slate-200/40 px-4 py-3.5 last:border-b-0 dark:border-slate-700/35',
                      isNext ? 'bg-slate-50/50 dark:bg-slate-800/35' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/50 bg-slate-50/90 dark:border-slate-700/50 dark:bg-slate-800/80">
                        {Icon ? <Icon className="h-5 w-5 text-slate-500" /> : <DefaultMealIcon />}
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{label}</p>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          Suggested
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="block text-[15px] font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
                        {time}
                      </span>
                      <span className="mt-0.5 inline-block rounded-full border border-slate-300/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:text-slate-300">
                        {dayText}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
