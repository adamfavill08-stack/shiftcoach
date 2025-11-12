'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

type LoggedMeal = {
  id: string
  time: string
  label: string
  description?: string
  kcal: number
  protein_g: number
  carbs_g: number
  fats_g: number
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
}

type MealTimingCoachData = {
  shiftType: 'day' | 'night' | 'late' | 'off'
  recommendedWindows: {
    id: 'breakfast' | 'main' | 'late'
    label: string
    start: string
    end: string
  }[]
  meals: {
    id: string
    label: string
    time: string
    position: number
    inWindow: boolean
  }[]
  lastMealTime: string
  timeSinceLastMeal: string
  nextWindowLabel: string
  status: 'onTrack' | 'slightlyLate' | 'veryLate'
}

export function EnergyPage() {
  const router = useRouter()
  const caloriesUsed = 1350
  const caloriesTarget = 2200
  const progress = Math.min(1, caloriesUsed / caloriesTarget)
  const circumference = 2 * Math.PI * 80
  const offset = circumference * (1 - progress)

  const mockMeals: LoggedMeal[] = [
    {
      id: '1',
      time: '07:45',
      label: 'Breakfast',
      description: 'Oats, berries & coffee',
      kcal: 520,
      protein_g: 28,
      carbs_g: 62,
      fats_g: 14,
      type: 'breakfast',
    },
    {
      id: '2',
      time: '13:10',
      label: 'Lunch',
      description: 'Chicken wrap & yogurt',
      kcal: 640,
      protein_g: 40,
      carbs_g: 58,
      fats_g: 18,
      type: 'lunch',
    },
    {
      id: '3',
      time: '18:30',
      label: 'Snack',
      description: 'Greek yogurt & nuts',
      kcal: 260,
      protein_g: 18,
      carbs_g: 12,
      fats_g: 15,
      type: 'snack',
    },
  ]

  const mockCoachData: MealTimingCoachData = {
    shiftType: 'night',
    recommendedWindows: [
      { id: 'breakfast', label: 'Breakfast window', start: '15:00', end: '17:00' },
      { id: 'main', label: 'Main meal window', start: '19:00', end: '21:00' },
      { id: 'late', label: 'Light late meal', start: '23:00', end: '01:00' },
    ],
    meals: [
      { id: 'm1', label: 'Breakfast', time: '15:30', position: 0.15, inWindow: true },
      { id: 'm2', label: 'Lunch', time: '19:20', position: 0.5, inWindow: true },
      { id: 'm3', label: 'Snack', time: '02:10', position: 0.85, inWindow: false },
    ],
    lastMealTime: '02:10',
    timeSinceLastMeal: '3h 05m',
    nextWindowLabel: '15:00–17:00',
    status: 'slightlyLate',
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <section
        className="rounded-[32px] border px-6 pt-5 pb-6 backdrop-blur-xl"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border-subtle)',
          boxShadow: '0 24px 48px rgba(15,23,42,0.22)',
        }}
      >
        <div className="flex items-start justify-between">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: 'var(--text-soft)' }}>
            Adjusted Calories
          </p>
          <button
            type="button"
            title="Adjusted calories include your shift pattern, sleep and activity to keep you on track without under-fueling."
            className="text-xs rounded-full border px-2 py-0.5 leading-none mb-4"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            i
          </button>
        </div>

        <div className="flex flex-col items-center gap-5">
          <div className="relative h-56 w-56">
            <svg viewBox="0 0 200 200" className="-rotate-90" aria-hidden="true">
              <circle cx="100" cy="100" r="80" stroke="rgba(148,163,184,0.25)" strokeWidth="14" fill="none" strokeLinecap="round" />
              <circle
                cx="100"
                cy="100"
                r="80"
                stroke="url(#calorieDialGradient)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
              />
              <defs>
                <linearGradient id="calorieDialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-soft)' }}>
                Today so far
              </span>
              <span className="text-4xl md:text-5xl font-semibold tabular-nums" style={{ color: 'var(--text-main)' }}>
                {caloriesUsed}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                / {caloriesTarget} kcal
              </span>
            </div>
          </div>

          <div className="w-full grid grid-cols-3 gap-3 text-center mt-2">
            <StatItem label="Target" value={`${caloriesTarget} kcal`} />
            <StatItem label="Remaining" value={`${Math.max(0, caloriesTarget - caloriesUsed)} kcal`} />
            <StatItem
              label="Status"
              value={progress < 0.8 ? 'On track' : progress < 1 ? 'Getting close' : 'Over target'}
            />
          </div>

          <div className="flex justify-center mt-4 mb-0">
            <button
              onClick={() => router.push('/dashboard/log-meal')}
              className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 text-white px-6 py-2.5 text-sm font-medium shadow-sm hover:brightness-110 active:scale-95 transition-all"
            >
              Log Meal
            </button>
          </div>
        </div>

        <div className="my-6 border-t" style={{ borderColor: 'var(--border-subtle)' }} />

        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
              Macros
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              g for today
            </p>
          </div>
          <button
            type="button"
            title="Macro targets will adapt to your shift rhythm and recovery focus."
            className="text-xs rounded-full border px-2.5 py-1 leading-none"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            i
          </button>
        </div>

        <div className="grid grid-cols-3 gap-x-4 gap-y-6">
          <MacroCircle label="Protein" value="188 g" />
          <MacroCircle label="Carbs" value="140 g" />
          <MacroCircle label="Fats" value="75 g" />
          <MacroCircle label="Sat fat (max)" value="19 g" smallLabel />
          <MacroCircle label="Water" value="2.8 L" />
          <MacroCircle label="Caffeine" value="300 mg" />
        </div>

        <div
          className="mt-6 rounded-2xl border px-4 py-3"
          style={{
            backgroundColor: 'var(--card-subtle)',
            borderColor: 'var(--border-subtle)',
            boxShadow: '0 14px 32px rgba(15,23,42,0.12)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
              Recent meals
            </p>
            <button
              type="button"
              onClick={() => console.log('View all meals')}
              className="text-xs font-medium underline underline-offset-4 decoration-slate-300 hover:decoration-slate-400"
              style={{ color: 'var(--text-muted)' }}
            >
              View all
            </button>
          </div>

          <div
            className="max-h-44 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {mockMeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/70 text-2xl">🍽️</div>
                <div className="space-y-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                    No meals logged yet
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Tap “Log Meal” to start tracking your energy intake.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                {mockMeals.map((meal, idx) => (
                  <MealRow key={meal.id} meal={meal} showDivider={idx !== mockMeals.length - 1} />
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] mt-4" style={{ color: 'var(--text-muted)' }}>
          Based on your latest day of logs · Static preview
        </p>
      </section>

      <MealTimingCoachCard data={mockCoachData} />
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 items-center">
      <span className="text-[11px] uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--text-main)' }}>
        {value}
      </span>
    </div>
  )
}

function MacroCircle({ label, value, smallLabel = false }: { label: string; value: string; smallLabel?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-16 w-16">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.9), rgba(248,250,252,0.9))',
            boxShadow: '0 10px 25px rgba(15,23,42,0.12), inset 0 0 0 1px rgba(148,163,184,0.15)',
          }}
        />
        <div
          className="absolute inset-[2px] rounded-full flex items-center justify-center text-xs font-medium tabular-nums"
          style={{ color: 'var(--text-main)' }}
        >
          {value}
        </div>
        <div className="absolute inset-0 rounded-full">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="macroRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="46" stroke="rgba(148,163,184,0.18)" strokeWidth="6" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="46"
              stroke="url(#macroRingGradient)"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={Math.PI * 2 * 46}
              strokeDashoffset={Math.PI * 2 * 46 * 0.35}
              style={{ opacity: 0.95 }}
            />
          </svg>
        </div>
      </div>
      <span className={smallLabel ? 'text-[10px] text-center' : 'text-xs'} style={{ color: 'var(--text-soft)' }}>
        {label}
      </span>
    </div>
  )
}

function MealRow({ meal, showDivider }: { meal: LoggedMeal; showDivider: boolean }) {
  const iconMap: Record<LoggedMeal['type'], string> = {
    breakfast: '🍳',
    lunch: '🥪',
    dinner: '🍽️',
    snack: '🍎',
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-sm shadow-sm">
            {iconMap[meal.type]}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
              {meal.label}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-soft)' }}>
              {meal.description ?? `${meal.time} · Logged meal`}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-main)' }}>
            {meal.kcal} kcal
          </span>
          <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>
            P {meal.protein_g}g · C {meal.carbs_g}g · F {meal.fats_g}g
          </p>
        </div>
      </div>
      {showDivider && <div className="border-b" style={{ borderColor: 'var(--border-subtle)' }} />}
    </div>
  )
}

function MealTimingCoachCard({ data }: { data: MealTimingCoachData }) {
  const coachMessages: Record<MealTimingCoachData['status'], { title: string; body: string }> = {
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

  const coachCopy = coachMessages[data.status]

  return (
    <section
      className="rounded-3xl border backdrop-blur-xl px-5 py-4 md:px-6 md:py-5"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
            Meal timing coach
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-soft)' }}>
            Better meals at better times for your shifts.
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.2em] border bg-sky-50 text-sky-600 border-sky-100">
          BETA
        </span>
      </div>

      <div
        className="mt-3 rounded-2xl overflow-hidden border"
        style={{ backgroundColor: 'var(--card-subtle)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="px-3 pt-2 pb-2">
          <p className="text-[11px] font-medium" style={{ color: 'var(--text-soft)' }}>
            Recommended
          </p>
          <div className="mt-2 h-8 rounded-full overflow-hidden flex">
            {data.recommendedWindows.map((window) => (
              <div
                key={window.id}
                className="flex-1 flex items-center justify-center text-[10px] font-medium text-white"
                style={{
                  background:
                    window.id === 'breakfast'
                      ? 'linear-gradient(90deg,#38bdf8,#22d3ee)'
                      : window.id === 'main'
                      ? 'linear-gradient(90deg,#6366f1,#8b5cf6)'
                      : 'linear-gradient(90deg,#f59e0b,#fb923c)',
                }}
              >
                {window.label}
              </div>
            ))}
          </div>
        </div>

        <div className="px-3 pt-2 pb-3">
          <p className="text-[11px] font-medium" style={{ color: 'var(--text-soft)' }}>
            Your day
          </p>
          <div className="mt-2 relative h-8 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.55)' }}>
            {data.meals.map((meal) => {
              const leftPercent = Math.min(96, Math.max(4, meal.position * 100))
              return (
                <div
                  key={meal.id}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${leftPercent}%` }}
                >
                  <div className={`relative flex items-center gap-1 ${meal.inWindow ? '' : 'pr-3'}`}>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white text-sm shadow-sm ${
                        meal.inWindow ? '' : 'ring-2 ring-amber-300'
                      }`}
                    >
                      {meal.label === 'Snack' ? '🍎' : meal.label === 'Lunch' ? '🥪' : meal.label === 'Breakfast' ? '🍳' : '🍽️'}
                    </span>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-soft)' }}>
                      {meal.label} {meal.time}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div
        className="mt-3 rounded-2xl border px-4 py-3 flex gap-3 items-start"
        style={{ backgroundColor: 'var(--card-subtle)', borderColor: 'var(--border-subtle)' }}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-lg">
          ⏰
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
            {coachCopy.title}
          </p>
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-soft)' }}>
            {coachCopy.body}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
        <div className="flex flex-col gap-1">
          <span style={{ color: 'var(--text-soft)' }}>Last meal</span>
          <span className="font-medium" style={{ color: 'var(--text-main)' }}>
            {data.lastMealTime}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span style={{ color: 'var(--text-soft)' }}>Time since last meal</span>
          <span className="font-medium" style={{ color: 'var(--text-main)' }}>
            {data.timeSinceLastMeal}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span style={{ color: 'var(--text-soft)' }}>Next ideal window</span>
          <span className="font-medium" style={{ color: 'var(--text-main)' }}>
            {data.nextWindowLabel}
          </span>
        </div>
      </div>
    </section>
  )
}
