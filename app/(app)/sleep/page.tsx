'use client'

import { FormEvent, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

const QUALITY_OPTIONS = [
  { value: 1, label: 'Broken' },
  { value: 2, label: 'Light' },
  { value: 3, label: 'Solid' },
  { value: 4, label: 'Excellent' },
]

export default function SleepLogPage() {
  const router = useRouter()

  const [startMinutes, setStartMinutes] = useState(23 * 60)
  const [endMinutes, setEndMinutes] = useState(7 * 60)
  const [quality, setQuality] = useState<number | null>(4)
  const [restedScore, setRestedScore] = useState(7)
  const [hasNap, setHasNap] = useState(false)
  const [napStartMinutes, setNapStartMinutes] = useState(14 * 60)
  const [napEndMinutes, setNapEndMinutes] = useState(14 * 60 + 30)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { durationMinutes, durationHours, formattedDuration } = useMemo(() => {
    let diff = endMinutes - startMinutes
    if (diff <= 0) diff += 24 * 60

    const hours = Math.floor(diff / 60)
    const minutes = diff % 60
    return {
      durationMinutes: diff,
      durationHours: hours,
      formattedDuration: `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`,
    }
  }, [startMinutes, endMinutes])

  const napMinutes = useMemo(() => {
    if (!hasNap) return 0
    let diff = napEndMinutes - napStartMinutes
    if (diff <= 0) diff += 24 * 60
    return diff
  }, [hasNap, napEndMinutes, napStartMinutes])

  const totalSleepMinutes = (durationMinutes ?? 0) + napMinutes
  const totalSleepLabel = totalSleepMinutes > 0 ? formatMinutes(totalSleepMinutes) : '0h 00m'
  const progress = Math.min(1, Math.max(0, totalSleepMinutes / (8 * 60)))
  const qualityLabel = quality != null ? QUALITY_OPTIONS.find((option) => option.value === quality)?.label ?? 'Select quality' : 'Select quality'

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isSubmitting) return

    if (quality == null) {
      setError('Let me know how your sleep felt so I can coach you better.')
      return
    }

    const { startIso, endIso } = buildSleepTimestampsFromMinutes(startMinutes, endMinutes)

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/sleep/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: startIso,
          endTime: endIso,
          quality,
          naps: hasNap ? 1 : 0,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.message || data?.error || `Failed to save sleep (${res.status})`)
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dashboardPage', '1')
      }
      router.push('/dashboard')
    } catch (err) {
      console.error('[sleep/log] submit error', err)
      setError(err instanceof Error ? err.message : 'Something went wrong saving your sleep.')
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pt-4 pb-12">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.localStorage.setItem('dashboardPage', '1')
              }
              router.push('/dashboard')
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--card)] shadow-sm shadow-slate-300/30 transition hover:-translate-y-0.5"
            aria-label="Back to sleep"
          >
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </button>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">ShiftCoach</p>
            <h1 className="text-xl font-semibold text-[var(--text-main)]">Log sleep & naps</h1>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section
            className="rounded-3xl border px-5 py-6 space-y-6 backdrop-blur-2xl"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'radial-gradient(circle at top left, rgba(79,70,229,0.14), transparent 55%), var(--card)',
              boxShadow: '0 18px 45px rgba(15,23,42,0.32)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Sleep summary</p>
                <p className="mt-1 text-sm text-[var(--text-soft)]">{formattedDuration || 'Pick your main sleep times to see your total.'}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-semibold text-[var(--text-main)]">{durationHours != null ? `${durationHours}h` : '--h'}</span>
                <p className="text-xs text-[var(--text-soft)]">{durationMinutes ?? 0} min total</p>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <SleepDial progress={progress} label={totalSleepLabel} />
              <p className="mt-3 text-xs text-[var(--text-soft)]">Main sleep + naps contribute to your Shift Rhythm.</p>
            </div>

            <div className="space-y-5">
              <div
                className="rounded-2xl border px-4 py-4 space-y-4"
                style={{ backgroundColor: 'var(--card-subtle)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Main sleep</p>
                  <span className="text-[11px] text-[var(--text-soft)]">Usually last night</span>
                </div>

                <div className="space-y-3">
                  <TimeStepper label="Sleep start" minutes={startMinutes} onChange={setStartMinutes} />
                  <TimeStepper label="Wake time" minutes={endMinutes} onChange={setEndMinutes} />
                </div>

                <div className="rounded-2xl border border-[var(--border-subtle)] bg-white/70 px-4 py-3">
                  <p className="text-xs text-[var(--text-soft)]">
                    Main sleep duration:{' '}
                    <span className="font-semibold text-[var(--text-main)]">{formattedDuration || '0h 00m'}</span>
                  </p>
                </div>
              </div>

              <div
                className="rounded-2xl border px-4 py-4 space-y-3"
                style={{ backgroundColor: 'var(--card-subtle)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Sleep quality</p>
                    <p className="mt-1 text-xs text-[var(--text-soft)]">Choose how the sleep felt overall.</p>
                  </div>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[var(--text-soft)] border border-[var(--border-subtle)]">
                    {qualityLabel}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {QUALITY_OPTIONS.map((option) => {
                    const isActive = quality === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setQuality(option.value)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                          isActive
                            ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow'
                            : 'border border-[var(--border-subtle)] bg-white/70 text-[var(--text-soft)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>

                <div className="pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-main)]">How rested did you feel?</p>
                      <p className="text-xs text-[var(--text-soft)]">0 = exhausted · 10 = fully recharged</p>
                    </div>
                    <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-semibold text-white">{restedScore}/10</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={restedScore}
                    onChange={(e) => setRestedScore(Number(e.target.value))}
                    className="mt-3 w-full accent-sky-500"
                  />
                </div>
              </div>

              <div
                className="rounded-2xl border px-4 py-4 space-y-3"
                style={{ backgroundColor: 'var(--card-subtle)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Naps</p>
                    <p className="mt-1 text-xs text-[var(--text-soft)]">Optional, but helps ShiftCoach tune your coaching.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasNap((prev) => !prev)}
                    className="rounded-full border px-3 py-1 text-xs font-semibold transition"
                    style={{
                      backgroundColor: hasNap ? 'rgba(59,130,246,0.12)' : 'transparent',
                      borderColor: 'var(--border-subtle)',
                      color: hasNap ? '#2563eb' : 'var(--text-soft)',
                    }}
                  >
                    {hasNap ? 'Remove nap' : 'Add nap'}
                  </button>
                </div>

                {hasNap && (
                  <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <TimeStepper label="Nap start" minutes={napStartMinutes} onChange={setNapStartMinutes} />
                    <TimeStepper label="Nap end" minutes={napEndMinutes} onChange={setNapEndMinutes} />
                    <p className="text-xs text-[var(--text-soft)]">
                      Nap duration:{' '}
                      <span className="font-semibold text-[var(--text-main)]">{formatMinutes(napMinutes) || '0h 00m'}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Save sleep'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('dashboardPage', '1')
                }
                router.push('/dashboard')
              }}
              className="w-full py-1.5 text-xs font-medium text-[var(--text-soft)] transition hover:text-[var(--text-main)]"
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

function formatMinutes(mins: number): string {
  if (!mins || mins <= 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const hStr = `${h}h`
  const mStr = m === 0 ? '00m' : `${m}m`
  return `${hStr} ${mStr}`
}

function buildSleepTimestampsFromMinutes(startMinutes: number, endMinutes: number) {
  const now = new Date()
  const wakeBase = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)

  const wake = new Date(wakeBase)
  wake.setMinutes(endMinutes)

  const sleepStart = new Date(wakeBase)
  if (endMinutes <= startMinutes) {
    sleepStart.setDate(sleepStart.getDate() - 1)
  }
  sleepStart.setMinutes(startMinutes)

  return {
    startIso: sleepStart.toISOString(),
    endIso: wake.toISOString(),
  }
}

function formatMinutesToTime(totalMinutes: number): string {
  const mins = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60)
  const hours = Math.floor(mins / 60)
  const minutes = mins % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

type TimeStepperProps = {
  label: string
  minutes: number
  onChange: (value: number) => void
}

function TimeStepper({ label, minutes, onChange }: TimeStepperProps) {
  const display = formatMinutesToTime(minutes)

  const adjust = (delta: number) => {
    const next = minutes + delta
    const wrapped = ((next % (24 * 60)) + (24 * 60)) % (24 * 60)
    onChange(wrapped)
  }

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 backdrop-blur"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <div className="flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-soft)' }}>
          {label}
        </span>
        <span className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: 'var(--text-main)' }}>
          {display}
        </span>
        <span className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Tap ± to adjust in 15-minute steps
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => adjust(15)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold shadow-sm active:scale-95 transition"
          style={{
            background: 'linear-gradient(to right, #0ea5e9, #6366f1)',
            color: '#ffffff',
          }}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => adjust(-15)}
          className="flex h-9 w-9 items-center justify-center rounded-full border text-lg font-semibold active:scale-95 transition"
          style={{
            backgroundColor: 'var(--card-subtle)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)',
          }}
          aria-label={`Decrease ${label}`}
        >
          –
        </button>
      </div>
    </div>
  )
}

type SleepDialProps = {
  progress: number
  label: string
}

function SleepDial({ progress, label }: SleepDialProps) {
  const size = 220
  const strokeWidth = 14
  const radius = size / 2 - strokeWidth / 2
  const circumference = 2 * Math.PI * radius
  const dash = circumference * progress
  const remainder = circumference - dash

  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-lg shadow-sky-500/30">
          🌙
        </span>
      </div>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="sleep-log-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c1c3" />
            <stop offset="40%" stopColor="#4f46e5" />
            <stop offset="80%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#22c1c3" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E2E8F0" strokeWidth={strokeWidth} fill="none" />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#sleep-log-ring)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${remainder}`}
            strokeDashoffset="0"
            fill="none"
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-slate-900">{label}</span>
      </div>
    </div>
  )
}