'use client'

import React from 'react'
import { Dumbbell, Droplet, Sparkles, Wheat } from 'lucide-react'
import { getMacroReason } from '@/lib/nutrition/getMacroReason'

export type MacroTargetsMealSlot = {
  label: string
  time: string
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
  /** Optional shift-specific line below meal list (e.g. from parent). */
  timingTip?: string | null
  mealTimesPreface?: string | null
  /** Matches `/api/meal-timing/today` `nextMealLabel` to highlight a row in the meal list. */
  highlightNextMealLabel?: string | null
  loading?: boolean
  /** 'compact' = mobile / route styling; 'elevated' = glass card for desktop detail */
  variant?: 'compact' | 'elevated'
  className?: string
}

const MACRO_ROWS: Array<{
  key: 'Carbs' | 'Protein' | 'Fat'
  field: 'carbs_g' | 'protein_g' | 'fat_g'
  Icon: React.ComponentType<{ className?: string }>
}> = [
  { key: 'Carbs', field: 'carbs_g', Icon: Wheat },
  { key: 'Protein', field: 'protein_g', Icon: Dumbbell },
  { key: 'Fat', field: 'fat_g', Icon: Droplet },
]

function MacroRingIcon({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/95 via-sky-400 to-indigo-500 p-[3px] shadow-[0_3px_14px_-3px_rgba(14,165,233,0.45),0_1px_2px_rgba(15,23,42,0.06)]">
        <div className="h-full w-full rounded-full bg-gradient-to-b from-white to-slate-50/95 shadow-[inset_0_1px_2px_rgba(255,255,255,1),inset_0_-1px_1px_rgba(15,23,42,0.04)]" />
      </div>
    </div>
  )
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
  consumedMacros,
  mealTimesData,
  timingTip,
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

  const displayMacros = consumedMacros ?? { protein_g: 0, carbs_g: 0, fat_g: 0 }

  const compactShell =
    'relative overflow-hidden rounded-[24px] border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/40 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_16px_36px_-24px_rgba(15,23,42,0.28)] dark:border-[var(--border-subtle)] dark:from-[var(--card)] dark:to-[var(--card-subtle)] dark:shadow-[0_14px_36px_rgba(0,0,0,0.38)]'

  if (loading) {
    const shell =
      variant === 'elevated'
        ? 'relative overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-700/40 bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)]'
        : compactShell
    return (
      <section className={`${shell} ${className}`.trim()}>
        {variant === 'compact' ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/90 to-transparent" />
        ) : null}
        <div className={`animate-pulse space-y-4 ${variant === 'compact' ? 'relative' : ''}`}>
          <div className="h-4 w-36 rounded-full bg-slate-200/90" />
          <div className="h-3 w-full max-w-xs rounded-full bg-slate-100" />
          <div className="h-[72px] rounded-[20px] bg-slate-100/90" />
          <div className="h-[72px] rounded-[20px] bg-slate-100/90" />
        </div>
      </section>
    )
  }

  if (!macros) {
    const shell =
      variant === 'elevated'
        ? 'relative overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-700/40 bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl p-6'
        : compactShell
    return (
      <section className={`${shell} ${className}`.trim()}>
        {variant === 'compact' ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/90 to-transparent" />
        ) : null}
        <div className={variant === 'compact' ? 'relative' : ''}>
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-900">Macro targets</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
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
      : `${compactShell} flex flex-col gap-5`

  if (variant === 'compact') {
    const ctx = scheduleContext(shiftType)
    const mealRows = mealTimesData ?? []
    const nextLabelNorm = highlightNextMealLabel?.trim().toLowerCase()

    return (
      <section className={`${outer} ${className}`.trim()}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[5.5rem] bg-gradient-to-b from-white via-white/70 to-transparent dark:from-white/5 dark:via-white/0" />

        <div className="relative flex flex-col gap-5">
          <header className="space-y-2 pr-1">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-900 dark:text-slate-100">Macro targets</h2>
            <p className="text-[12px] leading-snug text-slate-500 dark:text-slate-400">
              Your macro target today, based on your shift-tuned calories and goal.
            </p>
            <p className="text-[11px] leading-relaxed text-slate-500/95 dark:text-slate-400">{reasonTip}</p>
          </header>

          <div className="flex flex-col gap-2.5">
            {MACRO_ROWS.map(({ key, field }) => {
              const grams = Math.round((macros as Record<string, number>)[field] ?? 0)
              return (
                <div
                  key={key}
                  className="flex items-center gap-3.5 rounded-[20px] border border-slate-200/60 bg-white/80 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] dark:border-[var(--border-subtle)] dark:bg-[var(--card-subtle)] dark:shadow-none"
                >
                  <MacroRingIcon />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold leading-tight text-slate-800 dark:text-slate-100">{key}</p>
                    <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Today&apos;s target</p>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <span className="text-[22px] font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-100">
                      {grams}
                    </span>
                    <span className="text-[13px] font-medium text-slate-400 dark:text-slate-500"> g</span>
                  </div>
                </div>
              )
            })}
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

          {timingTip ? (
            <div className="rounded-[18px] border border-slate-200/60 bg-slate-50/80 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-[var(--border-subtle)] dark:bg-[var(--card-subtle)] dark:shadow-none">
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm ring-1 ring-slate-200/50 dark:bg-[var(--card)] dark:ring-[var(--border-subtle)]">
                  <Sparkles className="h-[18px] w-[18px] text-sky-500/90 dark:text-sky-400/85" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Timing insight
                  </p>
                  <p className="mt-2 text-[13px] leading-[1.45] text-slate-600 dark:text-slate-300">{timingTip}</p>
                </div>
              </div>
            </div>
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
          <h2 className={titleClass}>Macro targets</h2>
          <p className={subtitleClass}>
            Your macro target today, based on your shift-tuned calories and goal.
          </p>
          <p className={reasonClass}>{reasonTip}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/50 dark:border-slate-700/40 bg-white/60 dark:bg-slate-800/50 p-2">
          {MACRO_ROWS.map(({ key, field, Icon }, index) => {
            const grams = Math.round((macros as Record<string, number>)[field] ?? 0)
            const consumed =
              field === 'carbs_g'
                ? displayMacros.carbs_g
                : field === 'protein_g'
                  ? displayMacros.protein_g
                  : displayMacros.fat_g
            const percentage = grams > 0 ? (consumed / grams) * 100 : 0

            return (
              <React.Fragment key={key}>
                <div className="group flex items-center justify-between gap-4 rounded-2xl bg-slate-50/35 px-4 py-4 dark:bg-slate-800/30">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur dark:border-slate-700/40 dark:bg-slate-800/50">
                      <Icon className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{key}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Today&apos;s target</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-700/50">
                        <div
                          className="h-full rounded-full bg-slate-400/60 transition-all duration-300 dark:bg-slate-500/60"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <span className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                      {grams}
                    </span>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400"> g</span>
                  </div>
                </div>
                {index < MACRO_ROWS.length - 1 ? (
                  <div className="my-2 h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent dark:via-slate-700/50" />
                ) : null}
              </React.Fragment>
            )
          })}
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
              {mealTimesData.map(({ label, time, Icon }, index) => {
                const isNext =
                  highlightNextMealLabel != null &&
                  label.trim().toLowerCase() === highlightNextMealLabel.trim().toLowerCase()
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
                    <span className="shrink-0 text-[15px] font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
                      {time}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {timingTip ? (
          <div className="rounded-[18px] border border-slate-200/60 bg-slate-50/80 px-4 py-4 dark:border-slate-700/50 dark:bg-slate-800/40">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/90 shadow-sm ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-600/50">
                <Sparkles className="h-[18px] w-[18px] text-sky-500/90 dark:text-sky-400/90" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Timing insight
                </p>
                <p className="mt-2 text-[13px] leading-[1.45] text-slate-600 dark:text-slate-300">{timingTip}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
