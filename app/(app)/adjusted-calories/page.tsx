'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useTodayNutrition } from '@/lib/hooks/useTodayNutrition'
import { useWeeklyProgress } from '@/lib/hooks/useWeeklyProgress'

export default function AdjustedCaloriesPage() {
  const { data, loading } = useTodayNutrition()
  const weekly = useWeeklyProgress()
  const baseKcal = data?.baseCalories ?? 0
  const adjustedKcal = data?.adjustedCalories ?? 0
  const deltaPct = baseKcal > 0 ? Math.round(((adjustedKcal - baseKcal) / baseKcal) * 100) : 0
  const sex = data?.sex ?? 'other'

  const rhythmScore = data?.rhythmScore ?? null
  const sleepHours = data?.sleepHoursLast24h ?? null
  const shiftType = data?.shiftType ?? null

  const deltas: Array<{ label: string; value: string; color: string }> = []
  const base = baseKcal

  // Last 7 days adjusted calories from weekly progress summary
  const last7Targets =
    weekly && Array.isArray(weekly.adjustedCalories) && weekly.adjustedCalories.length === 7
      ? weekly.adjustedCalories
      : []

  const last7Labels =
    weekly && Array.isArray(weekly.days) && weekly.days.length === 7 ? weekly.days : []

  const todayLabel = new Date().toLocaleDateString('en-GB', { weekday: 'short' })

  const maxTarget = last7Targets.length > 0 ? Math.max(...last7Targets) : 0

  // WHO-style general reference based mainly on sex
  const standardKcal =
    sex === 'female' ? 2000 : sex === 'male' ? 2500 : 2200

  const shiftLabel =
    shiftType === 'night'
      ? 'Night shift'
      : shiftType === 'day'
      ? 'Day shift'
      : shiftType === 'off'
      ? 'Day off'
      : 'Shift'

  if (data && data.rhythmFactor !== 1 && base > 0) {
    const rhythmDelta = Math.round(base * (data.rhythmFactor - 1))
    if (rhythmDelta !== 0) {
      deltas.push({
        label: rhythmScore != null ? `Rhythm score ${Math.round(rhythmScore)}` : 'Rhythm',
        value: `${rhythmDelta >= 0 ? '+' : ''}${rhythmDelta} kcal`,
        color: rhythmDelta >= 0 ? 'text-emerald-600' : 'text-amber-600',
      })
    }
  }

  if (data && data.sleepFactor !== 1 && sleepHours != null && base > 0) {
    const sleepDelta = Math.round(base * (data.sleepFactor - 1))
    if (sleepDelta !== 0) {
      deltas.push({
        label: `${sleepHours.toFixed(1)}h sleep`,
        value: `${sleepDelta >= 0 ? '+' : ''}${sleepDelta} kcal`,
        color: sleepDelta >= 0 ? 'text-emerald-600' : 'text-amber-600',
      })
    }
  }

  if (data && data.shiftFactor !== 1 && base > 0) {
    const shiftDelta = Math.round(base * (data.shiftFactor - 1))
    if (shiftDelta !== 0) {
      deltas.push({
        label: shiftLabel,
        value: `${shiftDelta >= 0 ? '+' : ''}${shiftDelta} kcal`,
        color: shiftDelta >= 0 ? 'text-emerald-600' : 'text-amber-600',
      })
    }
  }

  // Macro targets: prefer live values from today's nutrition, fall back to a gentle default
  const macroTargets =
    data?.macros
      ? [
          { label: 'Carbs', grams: data.macros.carbs_g },
          { label: 'Protein', grams: data.macros.protein_g },
          { label: 'Fat', grams: data.macros.fat_g },
        ]
      : [
          { label: 'Carbs', grams: 280 },
          { label: 'Protein', grams: 160 },
          { label: 'Fat', grams: 50 },
        ]

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
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>Adjusted Calories</h1>
          </div>
        </header>

        {/* Hero: today's adjusted target */}
        <section
          className="rounded-3xl backdrop-blur-2xl px-6 py-6 flex flex-col gap-4 items-center text-center"
          style={{
            backgroundColor: 'var(--card)',
          }}
        >
          {!loading && last7Targets.length > 0 && maxTarget > 0 && (
            <div className="mb-1 w-full">
              <div className="flex items-end justify-between gap-3 px-2 h-16">
                {last7Targets.map((value, index) => {
                  const isToday = last7Labels[index] === todayLabel
                  const heightPct = value / maxTarget
                  const barHeight = 20 + heightPct * 28

                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-[18px] rounded-md"
                        style={{
                          height: `${barHeight}px`,
                          background: isToday
                            ? 'linear-gradient(135deg, #2dd4bf, #0ea5e9, #6366f1)'
                            : 'rgba(148, 163, 184, 0.45)',
                          boxShadow: isToday
                            ? '0 6px 16px rgba(37, 99, 235, 0.25)'
                            : '0 1px 4px rgba(15, 23, 42, 0.16)',
                        }}
                      />
                      <span
                        className="text-[9px] tracking-wide"
                        style={{ color: 'var(--text-soft)' }}
                      >
                        {last7Labels[index] ?? `D${index + 1}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <div className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-soft)' }}>
            TODAY'S ADJUSTED TARGET
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
              <div className="text-xs" style={{ color: 'var(--text-soft)' }}>
                Base: {baseKcal.toLocaleString()} kcal · {deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`} for current sleep/shift
              </div>
            </>
          )}
          <div className="inline-flex items-center gap-2 mt-1">
            {shiftType && (
              <span
                className="rounded-full px-3 py-1 text-[11px]"
                style={{
                  backgroundColor: 'var(--card-subtle)',
                  color: 'var(--text-soft)',
                }}
              >
                {shiftLabel}
              </span>
            )}
          </div>
        </section>

        {/* vs Standard Calculator comparison card */}
        {!loading && baseKcal > 0 && (
          <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 flex flex-col gap-3 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
            <div className="space-y-1">
              <h2 className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-700">
                vs Standard Calculator
              </h2>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Standard calculators use formulas like Mifflin‑St Jeor that estimate calories based on age, height, weight,
                and activity level. They assume a regular 9–5 routine with consistent sleep patterns.
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
                <div className="text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">Standard calculator</p>
                  <p className="text-[11px]">
                    WHO guideline for your sex
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {standardKcal.toLocaleString('en-US')} kcal
                </p>
              </div>

              <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3 flex items-center justify-between">
                <div className="text-xs text-indigo-700">
                  <p className="font-semibold">Your adjusted target</p>
                  <p className="text-[11px]">shift worker optimized</p>
                </div>
                <p className="text-sm font-semibold text-indigo-600">
                  {adjustedKcal.toLocaleString('en-US')} kcal
                </p>
              </div>
            </div>

            <div className="pt-1 space-y-1 text-xs">
              <p className="flex items-baseline justify-between">
                <span className="text-slate-600">Difference</span>
                <span
                  className={
                    adjustedKcal - standardKcal <= 0
                      ? 'text-amber-600 font-semibold'
                      : 'text-emerald-600 font-semibold'
                  }
                >
                  {adjustedKcal - standardKcal} kcal (
                  {Math.round(((adjustedKcal - standardKcal) / standardKcal) * 100)}%)
                </span>
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600">
                This difference accounts for your shift pattern, circadian disruption, sleep debt, and shift‑specific energy needs.
              </p>
            </div>
          </section>
        )}

        {/* Macro targets summary card (from today's macros) */}
        {!loading && macroTargets.length > 0 && (
          <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 flex flex-col gap-3 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
            <div className="space-y-1">
              <h2 className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-700">
                Macro targets
              </h2>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Your adjusted target today based on your shift, sleep and goal.
              </p>
            </div>

            <div className="space-y-2">
              {macroTargets.map((target) => (
                <div
                  key={target.label}
                  className="flex items-center justify-between gap-4 rounded-2xl px-4 py-3 bg-slate-50 border border-slate-200"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-400 flex items-center justify-center flex-shrink-0">
                      <div className="h-5 w-5 rounded-full bg-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{target.label}</p>
                      <p className="text-[11px] text-slate-600">
                        Recommended today: {target.grams}g
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-900 tabular-nums">
                      {target.grams}{' '}
                      <span className="text-xs font-medium text-slate-500">g</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Meal timing card (from today's meal plan) */}
        {!loading && meals.length > 0 && (
          <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 flex flex-col gap-3 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
            <div className="space-y-1">
              <h2 className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-700">
                Meal timing today
              </h2>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Suggested times based on your adjusted calories and shift.
              </p>
              {nextMeal && (
                <p className="text-xs text-slate-700">
                  Next: <span className="font-semibold">{nextMeal.label}</span> at{' '}
                  {formatTimeForDisplay(nextMeal.suggestedTime)}
                </p>
              )}
            </div>

            <div className="divide-y divide-slate-100 rounded-2xl bg-slate-50/60 border border-slate-100 overflow-hidden">
              {meals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-white border border-slate-100 flex items-center justify-center text-base text-slate-400">
                      <span>{mealIconFor(meal.id, meal.label)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">
                        {meal.label}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Suggested time today
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 tabular-nums">
                    {meal.suggestedTime}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Why it matters for shift workers */}
        <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 flex flex-col gap-2 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🌙☀️</span>
            <p className="text-sm font-semibold text-slate-900">Why it matters for shift workers</p>
          </div>
          <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-700">
            <li>Standard calculators assume a 9–5 routine with regular sleep.</li>
            <li>On nights and rotations, hunger and energy don't follow "normal" rules.</li>
            <li>Adjusted Calories respects your schedule, so you're not fighting your body clock.</li>
          </ul>
        </section>

        {/* How we adjust */}
        <section className="rounded-xl bg-white border border-slate-200 px-5 py-4 flex flex-col gap-2 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📊</span>
            <p className="text-sm font-semibold text-slate-900">How Shift Coach adjusts your calories</p>
          </div>
          <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-700">
            <li><span className="font-semibold">Base target:</span> age, weight, height, sex and goal.</li>
            <li><span className="font-semibold">Sleep:</span> short/broken sleep may slightly lower late‑night calories and shift when you eat.</li>
            <li><span className="font-semibold">Shift pattern:</span> days, lates and nights change where we place the bulk of calories.</li>
            <li><span className="font-semibold">Activity:</span> more active days may lift the target; very low activity days stay closer to base.</li>
          </ul>
          <p className="text-[11px] mt-1 text-slate-500">This is general guidance only and not medical advice.</p>
        </section>

        {/* Timing focus */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">⏰</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Timing: not just how much, but when</p>
          </div>
          <ul className="list-disc list-inside text-sm space-y-1.5" style={{ color: 'var(--text-main)' }}>
            <li>On nights, more calories move to pre‑shift and early‑shift meals.</li>
            <li>We keep heavy meals out of your deepest "body night" hours when possible.</li>
            <li>On recovery days, we gently steer eating back towards a daytime pattern.</li>
          </ul>
        </section>

        {/* Disclaimer */}
        <div className="pt-4 pb-4">
          <p className="text-[11px] leading-relaxed text-slate-500 text-center">
            Shift Coach is a coaching tool and does not provide medical advice. For medical conditions, pregnancy or complex health issues, please check your plan with a registered professional.
          </p>
        </div>
      </div>
    </main>
  )
}
