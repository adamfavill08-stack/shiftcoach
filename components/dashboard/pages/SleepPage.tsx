'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTodaySleep } from '@/lib/hooks/useTodaySleep'

export function SleepPage() {
  const { sleep, loading, error, refetch } = useTodaySleep()
  const router = useRouter()

  const durationMin = sleep?.duration_min ?? null
  const durationHours = durationMin != null ? Math.floor(durationMin / 60) : null
  const durationRemainder = durationMin != null ? durationMin % 60 : null
  const durationLabel = durationMin != null ? `${durationHours}h${durationRemainder && durationRemainder > 0 ? ` ${durationRemainder.toString().padStart(2, '0')}m` : ''}` : '--h'

  const idealMinutes = 480
  const gaugePercent = durationMin != null && durationMin > 0 ? Math.min(120, Math.round((durationMin / idealMinutes) * 100)) : 0
  const progress = Math.min(gaugePercent, 100) / 100

  const qualityLabel = (() => {
    if (sleep?.quality == null) return 'No quality logged'
    if (sleep.quality >= 4) return 'Excellent sleep'
    if (sleep.quality === 3) return 'Solid sleep'
    if (sleep.quality === 2) return 'OK, could be better'
    return 'Broken sleep'
  })()

  const tipMessage = useMemo(() => {
    if (error) return "We couldn’t load your sleep data today."
    if (!sleep) return 'No sleep logged in the last 24 hours. Log tonight to unlock better Shift Rhythm coaching.'
    return getSleepTip(durationMin ?? 0, idealMinutes)
  }, [durationMin, error, idealMinutes, sleep])

  const size = 240
  const strokeWidth = 14
  const radius = size / 2 - strokeWidth / 2
  const circumference = 2 * Math.PI * radius
  const dash = circumference * progress
  const remainder = circumference - dash

  const sleepStages = [
    { label: 'Deep · 1h 20m', value: 18, className: 'bg-indigo-500/90 text-indigo-100' },
    { label: 'REM · 2h 05m', value: 28, className: 'bg-sky-400/90 text-white' },
    { label: 'Light · 3h 45m', value: 46, className: 'bg-sky-200/90 text-slate-700' },
    { label: 'Awake · 0h 30m', value: 8, className: 'bg-slate-200/90 text-slate-700' },
  ]

  const startLabel = sleep?.start_ts ? formatTimeForDisplay(sleep.start_ts) : '--'
  const endLabel = sleep?.end_ts ? formatTimeForDisplay(sleep.end_ts) : '--'

  return (
    <div className="min-h-full w-full">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pb-24">
        <section className="rounded-3xl border border-slate-200 bg-white/95 px-6 py-7 shadow-[0_20px_40px_rgba(15,23,42,0.06)] backdrop-blur">
          <header className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Last night&apos;s sleep</p>
            {loading && (
              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
                Loading last sleep…
              </p>
            )}
            {!loading && !sleep && !error && (
              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
                No sleep logged in the last 24 hours. Log your last sleep to see your stats.
              </p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </header>

          <div className="relative flex items-center justify-center">
            <div className="relative">
              <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-lg shadow-sky-500/30">
                  🌙
                </span>
              </div>

              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                  <linearGradient id="sleep-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <radialGradient id="sleep-bg" cx="50%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e7f3ff" />
                  </radialGradient>
                </defs>

                <circle cx={size / 2} cy={size / 2} r={radius - strokeWidth} fill="url(#sleep-bg)" />

                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={strokeWidth} />

                <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#sleep-ring)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${remainder}`}
                    strokeDashoffset="0"
                  />
                </g>
              </svg>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-semibold leading-none tracking-tight text-slate-900 md:text-5xl">
                  {durationLabel}
                </div>
                <p className="mt-2 text-xs" style={{ color: 'var(--text-soft)' }}>
                  {durationMin != null ? 'Total sleep in last 24 hours' : 'Log sleep to see your recovery'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs md:text-sm">
            {[
              { label: 'Asleep', value: startLabel },
              { label: 'Awake', value: endLabel },
              { label: 'Quality', value: qualityLabel },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{stat.label}</p>
                <p className="text-sm font-semibold text-slate-900 md:text-base">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/95 px-5 py-6 shadow-lg shadow-slate-900/10">
          <header className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Sleep quality</p>
          </header>

          <div className="overflow-hidden rounded-full bg-slate-100">
            <div className="flex h-4 w-full overflow-hidden rounded-full">
              <div className="h-full bg-indigo-500" style={{ width: '18%' }} />
              <div className="h-full bg-sky-400" style={{ width: '28%' }} />
              <div className="h-full bg-sky-200" style={{ width: '46%' }} />
              <div className="h-full bg-slate-200" style={{ width: '8%' }} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {sleepStages.map((stage) => (
              <span key={stage.label} className={`rounded-full px-3 py-1 text-xs font-medium ${stage.className}`}>
                {stage.label}
              </span>
            ))}
          </div>

          <p className="mt-5 text-xs text-slate-400">Based on your last synced wearable data · Updated 06:45</p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/95 px-5 py-6 shadow-lg shadow-slate-900/10">
          <header className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Timing vs. your rhythm</p>
          </header>

          <div className="relative h-3 rounded-full bg-slate-100">
            <div
              className="absolute left-[12%] right-[10%] top-1/2 h-3 -translate-y-1/2 rounded-full border border-sky-300/60"
              style={{ background: 'rgba(186, 230, 253, 0.35)' }}
            />
            <div
              className="absolute left-[15%] right-[8%] top-1/2 h-3 -translate-y-1/2 rounded-full"
              style={{ background: 'linear-gradient(90deg, #38bdf8 0%, #6366f1 100%)' }}
            />
          </div>

          <div className="mt-4 space-y-1 text-sm text-slate-600">
            <p className="font-medium">
              Actual:{' '}
              <span className="font-semibold text-slate-800">
                {startLabel} – {endLabel} · {durationLabel}
              </span>
            </p>
            <p>
              Recommended for this shift: <span className="font-semibold text-slate-700">23:30 – 07:00</span>
            </p>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            You slept about 40 minutes later than your ideal wind-down time for this shift.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/95 px-5 py-6 shadow-lg shadow-slate-900/10">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Coach tip</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="text-xs font-semibold text-sky-600 transition hover:text-sky-500"
                disabled={loading}
              >
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">{tipMessage}</p>
            <button
              type="button"
              onClick={() => router.push('/sleep')}
              className="w-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.98]"
            >
              Log sleep manually
            </button>
            <button
              type="button"
              className="w-full rounded-full border border-slate-300/70 bg-white/60 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300/80 hover:text-sky-600 active:scale-[0.98]"
            >
              Sync wearable now
            </button>
            <p className="text-center text-xs text-slate-400">Last synced: Galaxy Watch · 2h ago</p>
          </div>
        </section>
      </div>
    </div>
  )
}

function formatTimeForDisplay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getSleepTip(durationMinutes: number, goalMinutes: number): string {
  if (durationMinutes <= 0) {
    return 'No recent sleep logged yet. Start tracking tonight to unlock better Shift Rhythm coaching.'
  }

  if (durationMinutes < 5 * 60) {
    return 'You’re running on low sleep—ease off today, hydrate and plan an early wind-down to recover.'
  }

  if (durationMinutes < goalMinutes) {
    return 'You’re getting close to your goal. Protect your wind-down routine tonight to close the gap.'
  }

  return 'Solid rest last night. Keep the same wind-down timing to maintain your Shift Rhythm momentum.'
}
