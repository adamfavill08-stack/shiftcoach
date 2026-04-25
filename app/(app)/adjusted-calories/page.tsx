'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useProfile } from '@/hooks/useProfile'
import { useTodayNutrition } from '@/lib/hooks/useTodayNutrition'
import { useTranslation } from '@/components/providers/language-provider'
import {
  buildCalorieBreakdownRows,
  getCalorieSnapshotGrouped,
} from '@/lib/nutrition/buildCalorieBreakdownRows'
import { MacroTargetsCard } from '@/components/nutrition/MacroTargetsCard'
import { MacroTimingInsight } from '@/components/nutrition/MacroTimingInsight'
import { MealTimesScheduleCard } from '@/components/nutrition/MealTimesScheduleCard'
import { useMealTimingTodayCard } from '@/lib/hooks/useMealTimingTodayCard'
import { getMacroTimingCoachMessage } from '@/lib/nutrition/getMacroReason'

function mealIconFor(id?: string, label?: string) {
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

const WHY_BREAKDOWN_ID = 'adjusted-calories-why-breakdown'

function shiftContextLabel(
  shiftType: string | null | undefined,
  t: (key: string) => string,
): string {
  switch (shiftType) {
    case 'night':
      return t('dashboard.shiftLabel.night')
    case 'day':
      return t('dashboard.shiftLabel.day')
    case 'off':
      return t('dashboard.shiftLabel.dayOff')
    case 'late':
      return t('dashboard.shiftLabel.late')
    case 'early':
      return t('dashboard.calories.shiftEarly')
    default:
      return t('dashboard.shiftLabel.shift')
  }
}

function displayShiftLabel(
  data: {
    shiftType?: string | null
    shiftContext?: {
      transitionState?: string | null
      currentShift?: { operationalKind?: string | null } | null
    } | null
  } | null,
  t: (key: string) => string,
): string {
  const transitionState = data?.shiftContext?.transitionState
  if (transitionState === 'off_day') return t('dashboard.shiftLabel.dayOff')

  const currentKind = data?.shiftContext?.currentShift?.operationalKind
  if (currentKind) return shiftContextLabel(currentKind, t)

  return shiftContextLabel(data?.shiftType, t)
}

function resolveRotaAwareShiftType(data: {
  shiftType?: string | null
  shiftContext?: {
    transitionState?: string | null
    currentShift?: { operationalKind?: string | null } | null
  } | null
} | null): 'day' | 'night' | 'off' | 'early' | 'late' | 'other' {
  if (data?.shiftContext?.transitionState === 'off_day') return 'off'
  const currentKind = data?.shiftContext?.currentShift?.operationalKind
  if (currentKind === 'day' || currentKind === 'night' || currentKind === 'off' || currentKind === 'early' || currentKind === 'late' || currentKind === 'other') {
    return currentKind
  }
  const fallback = data?.shiftType
  if (fallback === 'day' || fallback === 'night' || fallback === 'off' || fallback === 'early' || fallback === 'late' || fallback === 'other') {
    return fallback
  }
  return 'other'
}

function fmtSignedInt(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toLocaleString('en-US')}`
}

function HealthProfileUnlock() {
  return (
    <div style={{ maxWidth: 430, margin: '0 auto', padding: '20px 14px 28px' }}>
      <header className="flex items-center gap-2 mb-3">
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
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
      </header>

      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 10px 30px -22px rgba(15, 23, 42, 0.38)',
        }}
      >
        <div
          style={{
            height: 4,
            background: 'linear-gradient(90deg, #00BCD4 0%, #22D3EE 45%, #3b82b8 100%)',
          }}
        />

        <div style={{ padding: '20px 20px 18px' }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: '2.4px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            Adjusted Calories
          </div>

          <div style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.12, color: 'var(--text-main)', marginBottom: 10 }}>
            Unlock your personalised nutrition plan
          </div>

          <div
            style={{
              fontSize: 14,
              color: 'var(--text-soft)',
              lineHeight: 1.65,
              fontWeight: 300,
              marginBottom: 16,
            }}
          >
            ShiftCoach adapts calories around your shifts, sleep pressure and recovery rhythm.
            Add your health details to activate daily targets.
          </div>

          <div
            style={{
              background: 'linear-gradient(180deg, rgba(0,188,212,0.07) 0%, rgba(0,188,212,0.02) 100%)',
              border: '1px solid rgba(0,188,212,0.16)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 16,
              color: 'var(--text-soft)',
              fontSize: 12,
            }}
          >
            <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>What you unlock</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            {[
              { icon: '🔥', label: 'Daily calorie target adjusted for your shifts' },
              { icon: '🌙', label: 'Night shift calorie recommendations' },
              { icon: '⚡', label: 'Pre and post shift nutrition timing' },
              { icon: '📊', label: 'Weekly adjustment based on sleep debt' },
            ].map(({ icon, label }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 10px',
                  borderRadius: 11,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--card)',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: 'rgba(0,188,212,0.10)',
                    border: '1px solid rgba(0,188,212,0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 300, lineHeight: 1.45 }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            Required: weight, height, biological sex, and goal.
          </div>

          <a
            href="/settings/profile"
            style={{
              display: 'block',
              width: '100%',
              padding: '15px 20px',
              background: '#00BCD4',
              color: '#001018',
              borderRadius: 13,
              fontSize: 15,
              fontWeight: 700,
              textAlign: 'center',
              textDecoration: 'none',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.3px',
            }}
          >
            Set up health profile →
          </a>

          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            Takes less than 60 seconds. Update anytime in settings.
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdjustedCaloriesPage() {
  const { t } = useTranslation()
  const [whyOpen, setWhyOpen] = useState(false)
  const { user } = useAuth()
  const { profile } = useProfile(user?.id ?? null)
  const { data, loading } = useTodayNutrition()
  const { data: mealTimingCard, loading: mealTimingLoading } = useMealTimingTodayCard()
  const baseKcal = data?.baseCalories ?? 0
  const adjustedKcal = data?.adjustedCalories ?? 0
  const deltaPct = baseKcal > 0 ? Math.round(((adjustedKcal - baseKcal) / baseKcal) * 100) : 0

  const breakdownRows = useMemo(
    () => (data ? buildCalorieBreakdownRows(data, t) : []),
    [data, t],
  )

  const snapshot = useMemo(() => (data ? getCalorieSnapshotGrouped(data) : null), [data])

  const mealTimesData = useMemo(() => {
    const timingMeals = mealTimingCard?.meals
    if (timingMeals && timingMeals.length > 0) {
      return timingMeals.map((meal) => ({
        label: meal.label,
        time: meal.time,
        dayTag: meal.dayTag,
        Icon: () => (
          <span className="text-base leading-none">{mealIconFor(meal.id, meal.label)}</span>
        ),
      }))
    }
    if (mealTimingLoading) {
      return undefined
    }
    const nutritionMeals = data?.meals
    if (nutritionMeals && nutritionMeals.length > 0) {
      return nutritionMeals.map((meal: { id: string; label: string; suggestedTime: string }) => ({
        label: meal.label,
        time: meal.suggestedTime,
        Icon: () => (
          <span className="text-base leading-none">{mealIconFor(meal.id, meal.label)}</span>
        ),
      }))
    }
    return undefined
  }, [mealTimingCard?.meals, mealTimingLoading, data?.meals])

  const firstName = profile?.name?.trim().split(/\s+/)[0] ?? null
  const profileComplete =
    !!profile?.weight_kg &&
    !!profile?.height_cm &&
    !!profile?.sex &&
    !!profile?.goal
  const timingInsightMessage = useMemo(
    () =>
      !loading && data
        ? getMacroTimingCoachMessage({
            shiftType: resolveRotaAwareShiftType(data),
            shiftedDayKey: data.shiftedDayKey ?? null,
            firstName,
          })
        : null,
    [loading, data, firstName],
  )

  if (!profileComplete) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <HealthProfileUnlock />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="max-w-[430px] mx-auto min-h-screen bg-slate-100 px-4 pb-8 pt-4 flex flex-col gap-5">
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

        {/* Hero: today's target */}
        <section className="w-full rounded-[14px] border border-slate-200/80 bg-white px-5 pb-5 pt-6 text-center dark:border-[var(--border-subtle)] dark:bg-[var(--card)]">
          {loading ? (
            <div className="flex w-full flex-col items-center gap-4">
              <div className="h-3 w-56 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-baseline gap-2">
                <div className="h-14 w-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-6 w-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="h-4 w-40 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 w-36 animate-pulse rounded-full bg-cyan-100 dark:bg-cyan-900/50" />
              <div className="grid w-full grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[84px] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
              <div className="h-4 w-40 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : (
            <>
              <p className="m-0 text-[11px] font-semibold tracking-[0.08em] text-[#aaaaaa] dark:text-[var(--text-muted)]">
                Today's adjusted calories · {displayShiftLabel(data, t)}
              </p>

              <div className="mt-2 text-center leading-none">
                <span
                  className="text-[52px] font-bold tabular-nums tracking-[-0.04em]"
                  style={{ color: 'var(--text-main)' }}
                >
                  {adjustedKcal.toLocaleString()}
                </span>
                <span className="ml-1.5 text-xl font-normal text-slate-400 dark:text-slate-500">kcal</span>
              </div>

              {baseKcal > 0 ? (
                <div className="mb-5 mt-3 flex justify-center">
                  <span className="inline-flex items-center rounded-full bg-[#E0F7FA] px-3.5 py-1.5 text-xs font-semibold text-[#00838F] dark:bg-cyan-950/45 dark:text-cyan-300">
                    {deltaPct <= 0 ? '↓' : '↑'} {t('dashboard.calories.pctFromBase', { pct: Math.abs(deltaPct) })}
                  </span>
                </div>
              ) : null}

              {snapshot && baseKcal > 0 ? (
                <div className="grid w-full grid-cols-3 gap-2.5">
                  <div className="rounded-[10px] border border-[#F0F0F0] border-t-[3px] border-t-[#00BCD4] bg-white px-2.5 pb-2.5 pt-3 text-center dark:border-[var(--border-subtle)] dark:border-t-cyan-400 dark:bg-[var(--card)]">
                    <p className="text-[28px] font-semibold tabular-nums leading-none tracking-[-0.02em]" style={{ color: 'var(--text-main)' }}>
                      {baseKcal.toLocaleString('en-US')}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#aaaaaa] dark:text-slate-500">
                      {t('dashboard.calories.snapshotBase')}
                    </p>
                  </div>
                  <div className="rounded-[10px] border border-[#F0F0F0] border-t-[3px] border-t-[#EF5350] bg-white px-2.5 pb-2.5 pt-3 text-center dark:border-[var(--border-subtle)] dark:border-t-rose-400 dark:bg-[var(--card)]">
                    <p
                      className={[
                        'text-[28px] font-semibold tabular-nums leading-none tracking-[-0.02em]',
                        snapshot.recoveryDelta === 0
                          ? 'text-slate-900 dark:text-slate-100'
                          : snapshot.recoveryDelta > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400',
                      ].join(' ')}
                    >
                      {fmtSignedInt(snapshot.recoveryDelta)}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#aaaaaa] dark:text-slate-500">
                      {t('dashboard.calories.snapshotRecovery')}
                    </p>
                  </div>
                  <div className="rounded-[10px] border border-[#F0F0F0] border-t-[3px] border-t-[#66BB6A] bg-white px-2.5 pb-2.5 pt-3 text-center dark:border-[var(--border-subtle)] dark:border-t-emerald-400 dark:bg-[var(--card)]">
                    <p
                      className={[
                        'text-[28px] font-semibold tabular-nums leading-none tracking-[-0.02em]',
                        snapshot.activityDelta === 0
                          ? 'text-slate-900 dark:text-slate-100'
                          : snapshot.activityDelta > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400',
                      ].join(' ')}
                    >
                      {fmtSignedInt(snapshot.activityDelta)}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#aaaaaa] dark:text-slate-500">
                      {t('dashboard.calories.snapshotActivity')}
                    </p>
                  </div>
                </div>
              ) : null}

              {!loading && breakdownRows.length > 0 ? (
                <div className="mt-4 w-full">
                  <button
                    type="button"
                    id={`${WHY_BREAKDOWN_ID}-trigger`}
                    aria-expanded={whyOpen}
                    aria-controls={WHY_BREAKDOWN_ID}
                    onClick={() => setWhyOpen((o) => !o)}
                    className="mx-auto flex w-full items-center justify-center gap-1 text-[13px] font-semibold text-[#00BCD4] transition-opacity hover:opacity-85 dark:text-cyan-400"
                  >
                    {t('dashboard.calories.seeFullBreakdown')} {whyOpen ? '▲' : '▼'}
                  </button>

                  {whyOpen ? (
                    <div
                      id={WHY_BREAKDOWN_ID}
                      role="region"
                      aria-labelledby={`${WHY_BREAKDOWN_ID}-trigger`}
                      className="mt-4 space-y-3 border-t pt-4 text-left"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                        {t('dashboard.calories.pageSubtitle')}
                      </p>
                      {data?.guardRailApplied ? (
                        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {t('dashboard.calories.guardRailHint')}
                        </p>
                      ) : null}
                      <div className="space-y-2.5 pt-1">
                        {breakdownRows.map((row) => (
                          <div key={row.key} className="flex items-start justify-between gap-3 text-[13px] leading-snug">
                            <span className="min-w-0 flex-1" style={{ color: 'var(--text-soft)' }}>
                              {row.label}
                            </span>
                            <span className={`shrink-0 font-semibold tabular-nums ${row.color}`}>
                              {row.value} kcal
                            </span>
                          </div>
                        ))}
                        <div
                          className="flex items-center justify-between border-t pt-2.5 mt-2.5 text-sm"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          <span className="font-bold" style={{ color: 'var(--text-main)' }}>
                            {t('dashboard.calories.vsBaseTarget')}
                          </span>
                          <span
                            className={`font-bold tabular-nums ${
                              deltaPct >= 0 ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {deltaPct >= 0 ? '+' : ''}
                            {deltaPct}%
                          </span>
                        </div>
                        {(data?.stepsToday != null || data?.activeMinutesToday != null) && (
                          <p className="text-[11px] pt-1" style={{ color: 'var(--text-muted)' }}>
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
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </section>

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
          variant="compact"
        />

        {mealTimesData === undefined && (mealTimingLoading || loading) ? (
          <MealTimesScheduleCard loading title="Meal times" />
        ) : mealTimesData && mealTimesData.length > 0 ? (
          <MealTimesScheduleCard
            meals={mealTimesData}
            highlightNextMealLabel={mealTimingCard?.nextMealLabel ?? null}
            title="Meal times"
          />
        ) : null}

        <MacroTimingInsight message={timingInsightMessage} />

        {/* Disclaimer */}
        <div className="pt-4 pb-4">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">ShiftCoach</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              A coaching app only and does not replace medical advice.
              <br />
              Please speak to a healthcare professional about any health concerns.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
