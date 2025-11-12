'use client'

import { useEffect, useState, MouseEvent, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'

type ShiftRhythmCardProps = {
  score?: number
}

export function ShiftRhythmCard({ score = 50 }: ShiftRhythmCardProps) {
  const clamped = Math.max(0, Math.min(100, score))
  const display = Math.round(clamped)
  const progress = clamped / 100

  const router = useRouter()

  const [coachTip, setCoachTip] = useState<string | null>(null)
  const [coachTipLoading, setCoachTipLoading] = useState(false)
  const [coachTipError, setCoachTipError] = useState<string | null>(null)

  const fetchCoachTip = async () => {
    try {
      setCoachTipLoading(true)
      setCoachTipError(null)

      const res = await fetch('/api/coach/tip', {
        method: 'GET',
        credentials: 'include',
      })

      if (!res.ok) {
        console.error('[ShiftRhythmCard] coach tip failed:', res.status)
        throw new Error('Failed to load coach tip')
      }

      const data = await res.json()
      setCoachTip(typeof data.tip === 'string' ? data.tip : 'No tip available right now.')
    } catch (err) {
      console.error('[ShiftRhythmCard] coach tip error:', err)
      setCoachTipError("I couldn't load a tip right now.")
    } finally {
      setCoachTipLoading(false)
    }
  }

  useEffect(() => {
    fetchCoachTip()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpenShiftRhythm = () => {
    router.push('/shift-rhythm')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOpenShiftRhythm()
    }
  }

  const handleRefresh = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    fetchCoachTip()
  }

  const size = 280
  const strokeWidth = 20
  const radius = size / 2 - strokeWidth / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius
  const dash = circumference * progress
  const gap = circumference - dash

  return (
    <section className="w-full flex justify-center px-4">
      <div
        onClick={handleOpenShiftRhythm}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Open detailed Shift Rhythm page"
        className="w-full rounded-3xl border border-slate-200 px-5 py-6 shadow-lg shadow-slate-900/10 bg-white/90 cursor-pointer transition-transform transition-shadow duration-200 hover:-translate-y-0.5 hover:shadow-2xl active:scale-[0.98]"
      >
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <defs>
                <linearGradient id="sr-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22C55E" />
                  <stop offset="25%" stopColor="#FACC15" />
                  <stop offset="50%" stopColor="#FB923C" />
                  <stop offset="75%" stopColor="#EC4899" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>

                <radialGradient id="sr-bg" cx="50%" cy="30%" r="65%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#E5EDF9" />
                </radialGradient>
              </defs>

              <circle cx={cx} cy={cy} r={radius - strokeWidth} fill="url(#sr-bg)" />

              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke="#E3EBF7"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />

              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i / 12) * 2 * Math.PI - Math.PI / 2
                const inner = radius - 12
                const outer = radius - 4
                const x1 = cx + inner * Math.cos(angle)
                const y1 = cy + inner * Math.sin(angle)
                const x2 = cx + outer * Math.cos(angle)
                const y2 = cy + outer * Math.sin(angle)

                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#D5DEEB"
                    strokeWidth={i % 3 === 0 ? 2 : 1.4}
                    strokeLinecap="round"
                  />
                )
              })}

              <g transform={`rotate(-90 ${cx} ${cy})`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke="url(#sr-ring)"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset="0"
                />
              </g>
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[88px] leading-none font-semibold tracking-tight text-slate-900">{display}</div>
              <div className="mt-1 text-[20px] font-medium tracking-wide text-slate-500">Shift Rhythm</div>
            </div>
          </div>
        </div>

        <div className="mt-5 px-4 text-center space-y-1">
          <p className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-400">
            Your Shift Rhythm explained
          </p>
          <p className="text-sm leading-relaxed text-slate-600">
            Your Shift Rhythm score reflects how well your body clock is synced with your current shift pattern. It combines sleep timing, recovery, activity and meal timing into a single 0–100 score so you can see, at a glance, how aligned you are today.
          </p>
          <p className="text-sm leading-relaxed text-slate-600">
            Higher scores mean your routine is working with your biology, not against it. Lower scores are a cue to ease off, recover and make small adjustments.
          </p>
        </div>

        <div
          className="mt-6 w-full rounded-2xl border backdrop-blur-xl px-4 py-3 shadow-sm"
          style={{
            background: 'linear-gradient(135deg, rgba(15,23,42,0.02), rgba(56,189,248,0.04))',
            borderColor: 'rgba(148,163,184,0.4)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at 30% 20%, #38bdf8, #0f172a)',
                  boxShadow: '0 0 12px rgba(56,189,248,0.4)',
                }}
              >
                <span className="text-xs text-white">✦</span>
              </div>
              <span className="text-xs font-semibold tracking-wide uppercase text-slate-600">
                Coach tip
              </span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={coachTipLoading}
              className="text-[11px] font-medium px-3 py-1 rounded-full border border-slate-300/70 bg-white/70 hover:bg-slate-50 hover:border-sky-300/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {coachTipLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          <p className="text-[13px] leading-relaxed text-slate-700">
            {coachTipLoading && !coachTip
              ? 'Asking your coach for a quick tip…'
              : coachTipError
              ? coachTipError
              : coachTip ||
                'As soon as you start logging sleep and shifts, your coach will drop a personalised tip here.'}
          </p>
        </div>
      </div>
    </section>
  )
}

