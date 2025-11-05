'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useStepGoal } from '@/lib/hooks/useStepGoal'
import { getStepRecommendation, type ShiftType } from '@/lib/steps/getStepRecommendation'
import { getTodayShift } from '@/lib/today'
import { supabase } from '@/lib/supabase'

type Props = {}

function classifyShift(startIso?: string | null, endIso?: string | null): 'day' | 'late' | 'night' | 'off' {
  if (!startIso || !endIso) return 'off'
  const start = new Date(startIso)
  const end = new Date(endIso)
  const startH = start.getHours()
  const endH = end.getHours()
  if (startH >= 18 || endH <= 8) return 'night'
  if (startH >= 12 && startH < 18) return 'late'
  return 'day'
}

export default function StepsPage(_props: Props) {
  const { stepGoal, updateStepGoal, isLoading } = useStepGoal()
  const [localGoal, setLocalGoal] = useState(stepGoal)
  const [todayShift, setTodayShift] = useState<any | null>(null)
  const [lastMainSleep, setLastMainSleep] = useState<{ duration_min: number } | null>(null)
  const [recoveryScore, setRecoveryScore] = useState<number | null>(null)

  useEffect(() => {
    setLocalGoal(stepGoal)
  }, [stepGoal])

  // Load shift and sleep data
  useEffect(() => {
    ;(async () => {
      const shift = await getTodayShift()
      setTodayShift(shift)

      // Load last main sleep
      const { data: sleepData } = await supabase
        .from('sleep_logs')
        .select('duration_min')
        .eq('naps', 0) // Main sleep (naps = 0)
        .order('end_time', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (sleepData) {
        setLastMainSleep(sleepData)
      }

      // TODO: Load recovery score from engine
      // For now, using null - will be wired when engine is available
    })()
  }, [])

  // Mock data for now – keep logic unchanged elsewhere
  const todaySteps = 9845
  const goal = stepGoal
  const progress = Math.min(todaySteps / goal, 1)

  // Compute recommendation
  const shiftType: ShiftType = todayShift ? classifyShift(todayShift.start_ts, todayShift.end_ts) : 'off'
  const lastMainSleepHours = lastMainSleep ? lastMainSleep.duration_min / 60 : null
  const rec = useMemo(
    () =>
      getStepRecommendation({
        shiftType,
        lastMainSleepHours,
        recoveryScore: recoveryScore ?? null,
      }),
    [shiftType, lastMainSleepHours, recoveryScore]
  )

  // Simple 7‑day mock trend (replace with real data when available)
  const week = [
    { d: 'M', v: 8200 },
    { d: 'T', v: 9100 },
    { d: 'W', v: 7600 },
    { d: 'T', v: 10400 },
    { d: 'F', v: 9800 },
    { d: 'S', v: 12300 },
    { d: 'S', v: 8700 },
  ]

  const ring = useMemo(() => {
    const size = 80
    const stroke = 10
    const r = (size - stroke) / 2
    const c = 2 * Math.PI * r
    const dash = progress * c
    return { size, stroke, r, c, dash }
  }, [progress])

  return (
    <main
      style={{
        backgroundImage: 'radial-gradient(circle at top, var(--bg-soft), var(--bg))',
      }}
    >
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center gap-2 mb-2">
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
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>Steps</h1>
            <p className="text-sm" style={{ color: 'var(--text-soft)' }}>Your daily movement</p>
          </div>
        </header>

        {/* Today summary (hero) */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-6 py-6 flex flex-col gap-4 transition-all duration-200"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col justify-center">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold" style={{ color: 'var(--text-main)' }}>{todaySteps.toLocaleString()}</span>
                <span className="text-sm" style={{ color: 'var(--text-soft)' }}>/{goal.toLocaleString()}</span>
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--text-soft)' }}>Steps today</p>
            </div>
            <div className="flex-shrink-0">
              <div
                className="relative"
                style={{ width: `${ring.size}px`, height: `${ring.size}px` }}
                aria-hidden
              >
                <svg width={ring.size} height={ring.size} viewBox={`0 0 ${ring.size} ${ring.size}`} className="block -rotate-90">
                  <circle
                    cx={ring.size / 2}
                    cy={ring.size / 2}
                    r={ring.r}
                    style={{ stroke: 'var(--ring-bg)' }}
                    strokeWidth={ring.stroke}
                    fill="none"
                  />
                  <circle
                    cx={ring.size / 2}
                    cy={ring.size / 2}
                    r={ring.r}
                    style={{ stroke: 'var(--text-main)' }}
                    strokeWidth={ring.stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${ring.dash} ${ring.c - ring.dash}`}
                    fill="none"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--card-subtle)' }}
                  >
                    <span className="text-sm">👣</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Goal control */}
          <div className="mt-2 flex items-center justify-between gap-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="flex flex-col">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Daily step goal
              </p>
              <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
                Set a target that fits your shifts.
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const clean = Math.max(1000, Math.min(50000, Number(localGoal) || 0))
                setLocalGoal(clean)
                await updateStepGoal(clean)
              }}
              className="flex items-center gap-2"
            >
              <input
                type="number"
                min={1000}
                max={50000}
                value={localGoal}
                onChange={(e) => setLocalGoal(Number(e.target.value))}
                disabled={isLoading}
                className="w-24 rounded-full border px-3 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-full px-3 py-1 text-xs font-medium bg-gradient-to-r from-sky-500 to-violet-500 text-white hover:brightness-110 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-default"
              >
                Save
              </button>
            </form>
          </div>

          {/* Recommendation */}
          {rec && (
            <div
              className="mt-3 rounded-2xl border px-3 py-2.5 backdrop-blur-xl flex items-start justify-between gap-3"
              style={{
                backgroundColor: 'var(--card-subtle)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Suggested for today
                </p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                  {rec.min.toLocaleString()}–{rec.max.toLocaleString()} steps
                </p>
                <p className="text-[11px] leading-snug" style={{ color: 'var(--text-soft)' }}>
                  {rec.reason}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLocalGoal(rec.suggested)}
                className="shrink-0 inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium bg-gradient-to-r from-sky-500 to-violet-500 text-white hover:brightness-110 active:scale-95 transition-all"
              >
                Use this
              </button>
            </div>
          )}
        </section>

        {/* 7‑day trend */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Last 7 days</p>
            <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Avg: {Math.round(week.reduce((a, b) => a + b.v, 0) / week.length).toLocaleString()}</p>
          </div>
          <div className="grid grid-cols-7 gap-2 items-end h-28">
            {week.map((d, idx) => {
              const max = Math.max(...week.map(w => w.v)) || 1
              const h = Math.max(8, Math.round((d.v / max) * 100))
              const isToday = idx === week.length - 1
              return (
                <div key={d.d + idx} className="flex flex-col items-center gap-1">
                  <div
                    className={
                      `w-6 rounded-full bg-gradient-to-t from-blue-500 to-violet-500 ` +
                      (isToday ? 'opacity-100' : 'opacity-80')
                    }
                    style={{ height: `${h}%` }}
                    aria-hidden
                  />
                  <span className="text-xs" style={{ color: 'var(--text-soft)' }}>{d.d}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Time-of-day breakdown */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Movement timing</p>
          <div className="space-y-3 w-full">
            {[
              { label: 'Morning', v: 0.35 },
              { label: 'Afternoon', v: 0.45 },
              { label: 'Evening', v: 0.20 },
            ].map((b) => (
              <div key={b.label} className="w-full">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs" style={{ color: 'var(--text-soft)' }}>{b.label}</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{Math.round(b.v * 100)}%</span>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ring-bg)' }}>
                  <div className="h-full bg-gradient-to-r from-sky-500 via-blue-500 to-violet-500" style={{ width: `${b.v * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Insight card */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-4 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Today's insight</p>
          <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-main)' }}>
            <span className="mt-0.5">✨</span>
            <p>
              You&apos;re at {Math.round(progress * 100)}% of your goal ({goal.toLocaleString()} steps).
              {progress < 1 && ' A short 10‑minute walk after your shift would get you there.'}
              {progress >= 1 && ' Great work! You&apos;ve hit your daily goal.'}
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}


