'use client'

import { useMemo } from 'react'
import { useShiftRhythm } from '@/lib/hooks/useShiftRhythm'

export default function FatigueRiskPage() {
  const { fatigueRisk, loading } = useShiftRhythm()
  const score = fatigueRisk?.score ?? 20
  const score10 = Math.max(1, Math.min(10, Math.round(score / 10)))
  const levelRaw = fatigueRisk?.level ?? 'low'
  const level = `${levelRaw[0].toUpperCase()}${levelRaw.slice(1)}`
  const confidenceLabel = fatigueRisk?.confidenceLabel
    ? `${fatigueRisk.confidenceLabel[0].toUpperCase()}${fatigueRisk.confidenceLabel.slice(1)}`
    : 'Low'
  const explanation =
    fatigueRisk?.explanation ?? 'Fatigue risk updates as your sleep, shift and rhythm data sync.'
  const drivers =
    fatigueRisk?.drivers?.length
      ? fatigueRisk.drivers
      : ['Keep logging sleep and shift data to unlock personalized fatigue drivers.']

  const timeline = useMemo(() => {
    const base = Math.max(12, Math.min(92, score))
    const confidenceBoost = fatigueRisk?.confidenceLabel === 'high' ? 4 : fatigueRisk?.confidenceLabel === 'low' ? -3 : 0
    const highShift = levelRaw === 'high' ? 8 : levelRaw === 'moderate' ? 3 : -4
    const clamp = (n: number) => Math.max(8, Math.min(96, Math.round(n)))
    return [
      { time: '06:00', value: clamp(base - 16 + highShift) },
      { time: '10:00', value: clamp(base - 28 + confidenceBoost) },
      { time: '14:00', value: clamp(base - 22) },
      { time: '18:00', value: clamp(base - 8 + confidenceBoost) },
      { time: '22:00', value: clamp(base + 4 + highShift) },
      { time: '03:00', value: clamp(base + 14 + highShift) },
    ]
  }, [score, fatigueRisk?.confidenceLabel, levelRaw])

  const getRiskColor = (value: number) => {
    if (value < 35) return 'bg-emerald-400'
    if (value < 60) return 'bg-lime-400'
    if (value < 75) return 'bg-amber-400'
    return 'bg-orange-500'
  }

  const nowHour = new Date().getHours()
  const currentPoint = useMemo(() => {
    if (nowHour >= 4 && nowHour < 8) return timeline[0]
    if (nowHour >= 8 && nowHour < 12) return timeline[1]
    if (nowHour >= 12 && nowHour < 16) return timeline[2]
    if (nowHour >= 16 && nowHour < 20) return timeline[3]
    if (nowHour >= 20 || nowHour < 1) return timeline[4]
    return timeline[5]
  }, [nowHour, timeline])
  const scoreLabel = useMemo(() => (loading ? '...' : String(score10)), [loading, score10])
  const markerLeft = `${Math.max(3, Math.min(97, score))}%`
  const levelBadgeClass =
    levelRaw === 'high'
      ? 'bg-orange-100 text-orange-800'
      : levelRaw === 'moderate'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-emerald-100 text-emerald-700'

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 md:p-6">
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-sm dark:shadow-[0_14px_36px_rgba(0,0,0,0.38)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">Fatigue Risk</p>
              <div className="mt-3 flex items-end gap-3">
                <h1 className="text-5xl font-semibold tracking-tight text-[var(--text-main)]">{scoreLabel}</h1>
                <span className={`mb-1 rounded-full px-3 py-1 text-sm font-medium ${levelBadgeClass}`}>
                  {level}
                </span>
              </div>
              <p className="mt-3 max-w-[28ch] text-sm leading-6 text-[var(--text-soft)]">{explanation}</p>
            </div>
            <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-soft)]">
              {confidenceLabel} confidence
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Current window</span>
              <span>{currentPoint.time}</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-[var(--card-subtle)]">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-300 via-lime-300 via-60% to-orange-400" />
              <div
                className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow dark:bg-slate-100"
                style={{ left: markerLeft, transform: 'translate(-50%, -50%)' }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-sm dark:shadow-[0_14px_36px_rgba(0,0,0,0.38)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-main)]">Today's fatigue curve</h2>
            <span className="text-xs text-[var(--text-muted)]">Live estimate</span>
          </div>

          <div className="mt-5 flex h-40 items-end gap-3">
            {timeline.map((point) => (
              <div key={point.time} className="flex flex-1 flex-col items-center justify-end gap-2">
                <div className="flex h-28 w-full items-end">
                  <div className={`w-full rounded-t-2xl ${getRiskColor(point.value)}`} style={{ height: `${point.value}%` }} />
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">{point.time}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm leading-6 text-[var(--text-soft)]">
            Risk is lowest after aligned recovery sleep and rises into late biological-night hours.
          </p>
        </div>

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-sm dark:shadow-[0_14px_36px_rgba(0,0,0,0.38)]">
          <h2 className="text-base font-semibold text-[var(--text-main)]">What's driving your risk</h2>
          <div className="mt-4 grid gap-3">
            {drivers.map((driver) => (
              <div key={driver} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 py-3 text-sm text-[var(--text-soft)]">
                {driver}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-sm dark:shadow-[0_14px_36px_rgba(0,0,0,0.38)]">
          <h2 className="text-base font-semibold text-[var(--text-main)]">How to lower fatigue risk</h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-[var(--text-soft)]">
            <div>
              <p className="font-medium text-[var(--text-main)]">Protect post-shift sleep</p>
              <p>Aim for an immediate recovery sleep block after your shift to reduce the next risk peak.</p>
            </div>
            <div>
              <p className="font-medium text-[var(--text-main)]">Use a pre-shift nap if needed</p>
              <p>A short nap before the next duty window can reduce strain from consecutive shifts.</p>
            </div>
            <div>
              <p className="font-medium text-[var(--text-main)]">Watch the 02:00-06:00 window</p>
              <p>This is your highest-risk period, so use extra caution with driving, decisions, and workload.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
