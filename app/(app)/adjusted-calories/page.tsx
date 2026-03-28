'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useTodayNutrition } from '@/lib/hooks/useTodayNutrition'
import { useTranslation } from '@/components/providers/language-provider'
import {
  buildCalorieBreakdownRows,
  getCalorieSnapshotGrouped,
} from '@/lib/nutrition/buildCalorieBreakdownRows'
import { MacroTargetsCard } from '@/components/nutrition/MacroTargetsCard'
import { getMacroTimingTip } from '@/lib/nutrition/getMacroReason'

export default function AdjustedCaloriesPage() {
  const { t } = useTranslation()
  const { data, loading } = useTodayNutrition()
  const baseKcal = data?.baseCalories ?? 0
  const adjustedKcal = data?.adjustedCalories ?? 0
  const deltaPct = baseKcal > 0 ? Math.round(((adjustedKcal - baseKcal) / baseKcal) * 100) : 0

  const breakdownRows = useMemo(
    () => (data ? buildCalorieBreakdownRows(data, t) : []),
    [data, t],
  )

  const snapshot = useMemo(() => (data ? getCalorieSnapshotGrouped(data) : null), [data])

  const fmtSignedKcal = (n: number) =>
    `${n >= 0 ? '+' : ''}${n.toLocaleString('en-US')} kcal`

  const snapshotValueClass = (n: number) =>
    n === 0 ? 'text-slate-500' : n >= 0 ? 'text-emerald-600' : 'text-amber-600'

  const meals = data?.meals ?? []

  const mealIconFor = (id?: string, label?: string) => {
    const key = (id || label || '').toLowerCase()
    if (key.includes('breakfast')) return '☀️'
    if (key.includes('lunch')) return '🍽️'
    if (key.includes('dinner')) return '🌙'
    if (key.includes('snack')) return '🍎'
    if (key.includes('pre-shift')) return '⏱️'
    if (key.includes('during-shift')) return '🌃'
    if (key.includes('post-shift')) return '🌅'
    return '🍽️'
  }

  const parseTimeToMinutes = (time: string | undefined) => {
    if (!time) return null
    const [h, m] = time.split(':')
    const hours = Number(h)
    const mins = Number((m || '0').slice(0, 2))
    if (Number.isNaN(hours) || Number.isNaN(mins)) return null
    return hours * 60 + mins
  }

  const formatTimeForDisplay = (time: string | undefined) => {
    if (!time) return ''
    const minutes = parseTimeToMinutes(time)
    if (minutes == null) return time
    const h24 = Math.floor(minutes / 60)
    const m = minutes % 60
    const suffix = h24 >= 12 ? 'PM' : 'AM'
    const h12 = ((h24 + 11) % 12) + 1
    return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`
  }

  let nextMeal: { id: string; label: string; suggestedTime: string; calories: number } | null = null
  if (meals.length > 0) {
    const withMinutes = meals
      .map((meal: any) => ({
        ...meal,
        minutes: parseTimeToMinutes(meal.suggestedTime),
      }))
      .filter((m: any) => m.minutes != null)
      .sort((a: any, b: any) => a.minutes - b.minutes)

    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    nextMeal =
      withMinutes.find((m: any) => m.minutes >= nowMinutes) ??
      (withMinutes.length > 0 ? withMinutes[0] : null)
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-[430px] mx-auto min-h-screen bg-white px-4 pb-8 pt-4 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center gap-2 mb-1">
          <Link
            href="/dashboard"
            className="p-2 rounded-full backdrop-blur-xl border transition-all"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card-subtle)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card)'
            }}
            aria-label={t('detail.common.backToDashboard')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>
              {t('dashboard.calories.cardTitle')}
            </h1>
          </div>
        </header>

        {/* Hero: today's adjusted target */}
        <section
          className="rounded-3xl backdrop-blur-2xl px-6 py-6 flex flex-col gap-4 items-center text-center"
          style={{
            backgroundColor: 'var(--card)',
          }}
        >
          <div className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-soft)' }}>
            {t('dashboard.calories.todayAdjustedTarget').toUpperCase()}
          </div>
          {loading ? (
            <div className="flex items-baseline gap-2 opacity-60">
              <div className="h-8 w-24 rounded bg-white/10 animate-pulse" />
              <span className="text-sm" style={{ color: 'var(--text-soft)' }}>kcal</span>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-center gap-2">
                <p className="text-4xl font-semibold" style={{ color: 'var(--text-main)' }}>{adjustedKcal.toLocaleString()}</p>
                <span className="text-sm" style={{ color: 'var(--text-soft)' }}>kcal</span>
              </div>
              {data?.shiftedDayKey ? (
                <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>
                  {t('dashboard.calories.shiftedDayLabel')}: {data.shiftedDayKey}
                </p>
              ) : null}
              {snapshot && baseKcal > 0 && (
                <div className="w-full max-w-[280px] text-left space-y-1 pt-1">
                  <div className="flex justify-between gap-3 text-[11px]" style={{ color: 'var(--text-soft)' }}>
                    <span>{t('dashboard.calories.snapshotBase')}</span>
                    <span className="font-semibold tabular-nums" style={{ color: 'var(--text-main)' }}>
                      {baseKcal.toLocaleString('en-US')} kcal
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-[11px]" style={{ color: 'var(--text-soft)' }}>
                    <span>{t('dashboard.calories.snapshotRecovery')}</span>
                    <span className={`font-semibold tabular-nums ${snapshotValueClass(snapshot.recoveryDelta)}`}>
                      {fmtSignedKcal(snapshot.recoveryDelta)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-[11px]" style={{ color: 'var(--text-soft)' }}>
                    <span>{t('dashboard.calories.snapshotActivity')}</span>
                    <span className={`font-semibold tabular-nums ${snapshotValueClass(snapshot.activityDelta)}`}>
                      {fmtSignedKcal(snapshot.activityDelta)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-[11px]" style={{ color: 'var(--text-soft)' }}>
                    <span>{t('dashboard.calories.snapshotTotalAdjustment')}</span>
                    <span
                      className={`font-semibold tabular-nums ${snapshot.deltaPct === 0 ? 'text-slate-500' : snapshot.deltaPct >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}
                    >
                      {snapshot.deltaPct >= 0 ? '+' : ''}{snapshot.deltaPct}%
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Full modifier breakdown — same math as /api/nutrition/today */}
        {!loading && breakdownRows.length > 0 && (
          <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 flex flex-col gap-3 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
            <div className="space-y-1">
              <h2 className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-700">
                {t('dashboard.calories.detailModifierBreakdown')}
              </h2>
              <p className="text-[11px] leading-relaxed text-slate-600">
                {t('dashboard.calories.pageSubtitle')}
              </p>
              {data?.guardRailApplied ? (
                <p className="text-[11px] leading-relaxed text-slate-500">{t('dashboard.calories.guardRailHint')}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              {breakdownRows.map((row) => (
                <div key={row.key} className="flex items-center justify-between text-sm gap-2">
                  <span className="text-slate-600">{row.label}</span>
                  <span className={`font-semibold tabular-nums flex-shrink-0 ${row.color}`}>
                    {row.value} kcal
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm pt-2 mt-2 border-t border-slate-200/60">
                <span className="text-slate-700 font-medium">Vs base target</span>
                <span
                  className={`font-semibold tabular-nums ${
                    deltaPct >= 0 ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {deltaPct >= 0 ? '+' : ''}
                  {deltaPct}%
                </span>
              </div>
              {(data?.stepsToday != null || data?.activeMinutesToday != null) && (
                <p className="text-[11px] text-slate-500 pt-1">
                  {data.stepsToday != null && (
                    <span>Steps today: {data.stepsToday.toLocaleString('en-US')}</span>
                  )}
                  {data.stepsToday != null && data.activeMinutesToday != null && ' · '}
                  {data.activeMinutesToday != null && (
                    <span>Active minutes: {data.activeMinutesToday}</span>
                  )}
                </p>
              )}
            </div>
          </section>
        )}

        <MacroTargetsCard
          loading={loading}
          macros={data?.macros ?? null}
          adjustedCalories={data?.adjustedCalories}
          goal={data?.goal ?? null}
          macroPreset={data?.macroPreset ?? null}
          shiftType={data?.shiftType ?? null}
          rhythmScore={data?.rhythmScore ?? null}
          sleepHoursLast24h={data?.sleepHoursLast24h ?? null}
          consumedMacros={data?.consumedMacros}
          mealTimesData={
            meals.length > 0
              ? meals.map((meal: { id: string; label: string; suggestedTime: string }) => ({
                  label: meal.label,
                  time: meal.suggestedTime,
                  Icon: () => (
                    <span className="text-base leading-none">{mealIconFor(meal.id, meal.label)}</span>
                  ),
                }))
              : undefined
          }
          nextMealHighlight={
            nextMeal
              ? {
                  label: nextMeal.label,
                  time: formatTimeForDisplay(nextMeal.suggestedTime),
                }
              : null
          }
          timingTip={!loading && data ? getMacroTimingTip(data.shiftType) : null}
          variant="compact"
        />

        {/* Disclaimer */}
        <div className="pt-4 pb-4">
          <p className="text-[11px] leading-relaxed text-slate-500 text-center">
            {t('detail.common.disclaimer')}
          </p>
        </div>
      </div>
    </main>
  )
}
