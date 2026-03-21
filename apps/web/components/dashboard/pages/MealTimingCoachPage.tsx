'use client'

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTodayNutrition } from '@/lib/hooks/useTodayNutrition'
import { useMealTiming } from '@/lib/hooks/useMealTiming'

type CoachStatus = 'onTrack' | 'slightlyLate' | 'veryLate'

type MealTimingCoachData = {
  shiftType?: 'day' | 'night' | 'late' | 'off'
  recommendedWindows?: {
    id: string
    label: string
    timeRange?: string
    start?: string
    end?: string
    focus?: string
  }[]
  meals?: {
    id: string
    label: string
    time: string
    position: number
    inWindow: boolean
  }[]
  lastMealTime?: string
  timeSinceLastMeal?: string
  nextWindowLabel?: string
  status?: CoachStatus
}

const fallbackCoachData: MealTimingCoachData = {
  shiftType: 'night',
  recommendedWindows: [
    { id: 'breakfast', label: 'Breakfast window', timeRange: '15:00–17:00', focus: 'Shift pre-fuel' },
    { id: 'main', label: 'Main meal window', timeRange: '19:00–21:00', focus: 'Main meal' },
    { id: 'late', label: 'Light late meal', timeRange: '23:00–01:00', focus: 'Light late snack' },
  ],
  meals: [
    { id: 'm1', label: 'Breakfast', time: '15:30', position: 0.15, inWindow: true },
    { id: 'm2', label: 'Lunch', time: '19:20', position: 0.52, inWindow: true },
    { id: 'm3', label: 'Snack', time: '02:10', position: 0.86, inWindow: false },
  ],
  lastMealTime: '02:10',
  timeSinceLastMeal: '3h 05m',
  nextWindowLabel: '15:00–17:00',
  status: 'slightlyLate',
}

export function MealTimingCoachPage() {
  const router = useRouter()
  const { data: nutrition, loading: nutritionLoading } = useTodayNutrition()
  const { data: timing, isLoading: timingLoading } = useMealTiming()

  const adjustedCalories = nutrition?.adjustedCalories ?? 1800
  const targetCalories = nutrition?.baseCalories ?? 2200
  const progress = Math.min(1, Math.max(0, adjustedCalories / (targetCalories || 1)))

  const proteinCurrent = nutrition?.consumedMacros?.protein_g ?? 78
  const proteinTarget = nutrition?.macros?.protein_g ?? 130
  const carbsCurrent = nutrition?.consumedMacros?.carbs_g ?? 160
  const carbsTarget = nutrition?.macros?.carbs_g ?? 240
  const fatsCurrent = nutrition?.consumedMacros?.fat_g ?? 48
  const fatsTarget = nutrition?.macros?.fat_g ?? 70

  const macroTotal = proteinCurrent + carbsCurrent + fatsCurrent
  const macroProteinPct = macroTotal > 0 ? Math.round((proteinCurrent / macroTotal) * 100) : 0
  const macroCarbPct = macroTotal > 0 ? Math.round((carbsCurrent / macroTotal) * 100) : 0
  const macroFatPct = Math.max(0, 100 - macroProteinPct - macroCarbPct)

  const recommendedWindows = (timing?.coach?.recommendedWindows ?? fallbackCoachData.recommendedWindows ?? []).map((window, index) => ({
    ...window,
    gradient:
      index === 0
        ? 'linear-gradient(90deg,#38bdf8,#22d3ee)'
        : index === 1
        ? 'linear-gradient(90deg,#6366f1,#8b5cf6)'
        : 'linear-gradient(90deg,#f59e0b,#fb923c)',
  }))
  const meals = timing?.coach?.meals ?? fallbackCoachData.meals ?? []
  const coachStatus: CoachStatus = ((timing?.coach as { status?: CoachStatus })?.status ?? fallbackCoachData.status ?? 'onTrack') as CoachStatus

  const shiftLabel = timing?.shiftLabel ?? 'Night shift · 19:00–07:00'
  const lastMealTime = timing?.lastMeal?.time ?? fallbackCoachData.lastMealTime ?? '—'
  const lastMealDescription = timing?.lastMeal?.description ?? 'Logged meal'
  const timeSinceLastMeal = (timing as any)?.timeSinceLastMeal ?? fallbackCoachData.timeSinceLastMeal ?? '—'
  const nextWindowLabel = (timing as any)?.nextWindowLabel ?? recommendedWindows[0]?.timeRange ?? '—'

  const nextMealLabel = timing?.nextMealLabel ?? 'Next meal'
  const nextMealTime = timing?.nextMealTime ?? '14:30'
  const nextMealType = timing?.nextMealType ?? 'Light, high-protein meal'
  const sleepContext = timing?.sleepContext ?? '4h 50m sleep in last 24h'
  const activityContext = timing?.activityContext ?? '3,200 steps so far today'
  const nextMealMacros = timing?.nextMealMacros ?? { protein: 30, carbs: 45, fats: 15 }

  const calorieMessage = useMemo(() => {
    if (nutritionLoading) {
      return 'Calculating adjusted calories...'
    }
    if (adjustedCalories <= targetCalories * 0.75) {
      return 'You still have room to refuel – focus on protein and slow carbs.'
    }
    if (adjustedCalories <= targetCalories * 1.1) {
      return 'You are right around your target range – nice pacing so far.'
    }
    return 'You are above your target – aim for lighter meals for the rest of the day.'
  }, [nutritionLoading, adjustedCalories, targetCalories])

  return (
    <div className="min-h-full w-full">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pb-24">
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 px-6 py-7 shadow-[0_20px_40px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-400">Adjusted calories</span>
              <span className="text-sm text-slate-500">Based on sleep, shift & activity</span>
            </div>
            <span className="text-xs rounded-full px-3 py-1 border border-slate-200/70 bg-white/70 text-slate-500">
              Target {targetCalories} kcal
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative h-48 w-48">
              <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 180deg, #e7edf7, #eef2f9)' }} />
              <div className="absolute inset-[6px] rounded-full bg-white shadow-inner" />
              <svg viewBox="0 0 120 120" className="absolute inset-0 m-auto">
                <defs>
                  <linearGradient id="caloriesGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#23b3ff" />
                    <stop offset="50%" stopColor="#4f7bff" />
                    <stop offset="100%" stopColor="#ff7ad9" />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="50" stroke="#e6ecf7" strokeWidth="8" fill="none" />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="url(#caloriesGradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={(1 - progress) * 2 * Math.PI * 50}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-semibold text-slate-900">{Math.round(adjustedCalories)}</div>
                <div className="text-xs text-slate-500">kcal today</div>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">{calorieMessage}</p>
          </div>

          <div className="border-t border-slate-200/70" />

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-400">Meal timing coach</span>
              <span className="text-sm text-slate-500">Better meals at better times for your shifts</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] rounded-full px-3 py-1 border border-slate-200/70 text-slate-500">{shiftLabel}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border bg-sky-50 text-sky-600 border-sky-100">
                Beta
              </span>
            </div>
          </div>

          <div
            className="rounded-2xl bg-gradient-to-r from-sky-50 via-slate-50 to-indigo-50 px-4 py-3"
            style={{ background: 'linear-gradient(135deg, rgba(35,179,255,0.09), rgba(79,123,255,0.08))' }}
          >
            <span className="text-xs text-slate-500">{timingLoading ? 'Loading next meal...' : nextMealLabel}</span>
            <span className="text-lg font-semibold text-slate-900">
              {nextMealTime} · {nextMealType}
            </span>
            <span className="text-xs text-slate-500">
              {sleepContext} · {activityContext}
            </span>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-900">
              <span className="rounded-full bg-white/70 px-2 py-0.5">Protein {nextMealMacros.protein} g</span>
              <span className="rounded-full bg-white/70 px-2 py-0.5">Carbs {nextMealMacros.carbs} g</span>
              <span className="rounded-full bg-white/70 px-2 py-0.5">Fats {nextMealMacros.fats} g</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-3">
              <p className="text-[11px] font-medium text-slate-500">Recommended</p>
              <div className="mt-2 h-8 rounded-full overflow-hidden flex">
                {recommendedWindows.map((window) => (
                  <div
                    key={window.id}
                    className="flex flex-1 flex-col items-center justify-center text-[10px] font-medium text-white"
                    style={{ background: window.gradient }}
                  >
                    <span>{window.label}</span>
                    {window.timeRange && <span className="text-[9px] opacity-90">{window.timeRange}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-3">
              <p className="text-[11px] font-medium text-slate-500">Your day</p>
              <div className="mt-2 relative h-8 rounded-full bg-white/70">
                {meals.map((meal) => {
                  const leftPercent = Math.min(96, Math.max(4, meal.position * 100))
                  const icon = meal.label.toLowerCase().includes('breakfast')
                    ? '🍳'
                    : meal.label.toLowerCase().includes('lunch')
                    ? '🥪'
                    : meal.label.toLowerCase().includes('snack')
                    ? '🍎'
                    : '🍽️'
                  return (
                    <div
                      key={meal.id}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                      style={{ left: `${leftPercent}%` }}
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white text-sm shadow-sm ${
                            meal.inWindow ? '' : 'ring-2 ring-amber-300'
                          }`}
                        >
                          {icon}
                        </span>
                        <span className="whitespace-nowrap text-[10px] font-medium text-slate-500">
                          {meal.label} {meal.time}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <CoachSummary status={coachStatus} />

          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-slate-500">Last meal</span>
              <span className="text-slate-900">{lastMealTime}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-500">Time since last meal</span>
              <span className="text-slate-900">{timeSinceLastMeal}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-500">Next ideal window</span>
              <span className="text-slate-900">{nextWindowLabel}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Today&apos;s macros</span>
              <span className="text-xs text-slate-400">
                Protein {macroProteinPct}% · Carbs {macroCarbPct}% · Fats {macroFatPct}%
              </span>
            </div>
            <MacroBar label="Protein" current={proteinCurrent} target={proteinTarget} unit="g" tint="from-sky-400 to-indigo-500" />
            <MacroBar label="Carbs" current={carbsCurrent} target={carbsTarget} unit="g" tint="from-cyan-400 to-sky-400" />
            <MacroBar label="Fats" current={fatsCurrent} target={fatsTarget} unit="g" tint="from-amber-400 to-orange-400" />
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Last meal logged</span>
              <span className="text-slate-900">
                {lastMealTime} · {lastMealDescription}
              </span>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

type MacroBarProps = {
  label: string
  current: number
  target: number
  unit: string
  tint: string
}

function MacroBar({ label, current, target, unit, tint }: MacroBarProps) {
  const ratio = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const width = Math.max(6, ratio)

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 text-xs text-slate-400">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${tint}`} style={{ width: `${width}%` }} />
      </div>
      <div className="w-24 text-right text-xs text-slate-900">
        {current} / {target} {unit}
      </div>
    </div>
  )
}

function CoachSummary({ status }: { status: CoachStatus }) {
  const messages: Record<CoachStatus, { title: string; body: string }> = {
    onTrack: {
      title: 'Meals are lining up nicely.',
      body: 'Keeping your main meal inside the purple band helps your rhythm. Keep repeating this timing on upcoming shifts.',
    },
    slightlyLate: {
      title: 'One meal drifted late last night.',
      body: 'One of your meals slipped towards your sleep window. Tomorrow, aim to keep your main meal firmly inside the purple window to support recovery.',
    },
    veryLate: {
      title: 'Meals are landing close to bedtime.',
      body: 'Let’s experiment with moving heavier meals earlier in the evening so your digestion has time to slow down before sleep.',
    },
  }

  const copy = messages[status] ?? messages.onTrack

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 flex gap-3 items-start">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-lg">
        ⏰
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-900">{copy.title}</p>
        <p className="text-[11px] leading-relaxed text-slate-500">{copy.body}</p>
      </div>
    </div>
  )
}
