'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useActivityToday } from '@/lib/hooks/useActivityToday'

function clsx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function formatMinutes(total?: number | null) {
  if (!total || total <= 0) return '—'
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (!hours) return `${minutes}m`
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

function percentage(value: number, target: number) {
  if (target <= 0) return 0
  const pct = (value / target) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

function GradientDial({ value, max, labelTop, subLabel }: { value: number; max: number; labelTop?: string; subLabel?: string }) {
  const pct = percentage(value, max)
  const radius = 96
  const circumference = 2 * Math.PI * radius
  const strokeLength = (pct / 100) * circumference

  return (
    <div className="relative h-[260px] w-[260px] mx-auto">
      <svg viewBox="0 0 240 240" className="h-full w-full">
        <defs>
          <linearGradient id="stepsGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3bb2ff" />
            <stop offset="50%" stopColor="#5f7aff" />
            <stop offset="100%" stopColor="#ff5ca8" />
          </linearGradient>
          <filter id="dialShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.1" />
          </filter>
        </defs>
        <circle cx="120" cy="120" r={radius} stroke="rgba(15,23,42,0.08)" strokeWidth="14" fill="none" />
        <g transform="rotate(-90 120 120)">
          <circle
            cx="120"
            cy="120"
            r={radius}
            stroke="url(#stepsGradient)"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
            filter="url(#dialShadow)"
          />
        </g>
      </svg>

      {labelTop && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-3 rounded-full px-3 py-1 text-[11px] font-medium"
          style={{ background: 'var(--card-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-soft)' }}
        >
          {labelTop}
        </div>
      )}

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>
          {Intl.NumberFormat().format(value)}
        </div>
        <div className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          of {Intl.NumberFormat().format(max)} steps
        </div>
        {subLabel && (
          <div className="mt-1 text-xs font-medium" style={{ color: 'var(--text-soft)' }}>
            {subLabel}
          </div>
        )}
      </div>
    </div>
  )
}

function MacroChip({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="rounded-full px-3 py-1.5 text-[12px]"
      style={{ background: 'var(--card-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-soft)' }}
    >
      {label}: {value}
    </span>
  )
}

export default function ActivityAndStepsPage() {
  const router = useRouter()
  const { data, loading } = useActivityToday()

  const steps = loading ? 0 : Math.max(0, data.steps ?? 0)
  const target = Math.max(1, data.stepTarget ?? 9000)
  const subLabel = data.activeMinutes ? `${data.activeMinutes} active min · ${data.intensity ?? 'light'}` : undefined

  const recoveryBadge = useMemo(() => {
    const signal = data.recoverySignal ?? 'AMBER'
    const tone =
      signal === 'GREEN' ? 'bg-emerald-50 text-emerald-600'
      : signal === 'RED' ? 'bg-rose-50 text-rose-600'
      : 'bg-amber-50 text-amber-600'
    return <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semibold', tone)}>{signal}</span>
  }, [data])

  const wearableChip = useMemo(() => {
    const text = data.source ? `Synced · ${data.source.toUpperCase()}` : 'Connect wearable'
    return (
      <button
        onClick={() => router.push('/settings')}
        className="rounded-full px-2.5 py-1 text-[11px] font-medium"
        style={{ background: 'var(--card-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-soft)' }}
      >
        {text}
      </button>
    )
  }, [data.source, router])

  const timeline = data.timeline ?? []

  const coachMessage = useMemo(() => {
    if (data.nextCoachMessage) return data.nextCoachMessage
    if (steps < target - 1500) {
      return 'You’re a little under target. A 15–20 min easy walk before your shift would balance today nicely.'
    }
    if (steps > target * 1.4 && data.recoverySignal !== 'GREEN') {
      return 'You’ve pushed hard on limited recovery. Keep the rest of the day gentle to avoid tomorrow’s crash.'
    }
    return 'Nice pacing so far. Keep movement light in your wind-down window to support better sleep.'
  }, [data.nextCoachMessage, data.recoverySignal, steps, target])

  return (
    <div className="min-h-full w-full">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 pb-24">
        <section
          className="rounded-3xl border border-slate-200 bg-white/95 px-6 py-7 shadow-[0_20px_40px_rgba(15,23,42,0.06)] backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-[0.24em] text-slate-400">ACTIVITY & STEPS</h2>
              {recoveryBadge}
            </div>
            {wearableChip}
          </div>

          <div className="mt-4">
            <GradientDial
              value={steps}
              max={target}
              labelTop={data.shiftType ? `${data.shiftType} shift` : undefined}
              subLabel={subLabel}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
              <div className="text-[11px] text-slate-400">Today</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{Intl.NumberFormat().format(steps)} steps</div>
              <div className="text-[11px] text-slate-500">Active {formatMinutes(data.activeMinutes)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
              <div className="text-[11px] text-slate-400">Shift context</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{data.shiftType ? `${data.shiftType} shift` : '—'}</div>
              <div className="text-[11px] text-slate-500">Target {Intl.NumberFormat().format(target)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
              <div className="text-[11px] text-slate-400">Recovery</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{data.recoverySignal ?? 'AMBER'}</div>
              <div className="text-[11px] text-slate-500">Energy score {data.energyScore ?? '—'}/10</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-[11px] font-medium text-slate-400">Activity timeline</div>
            <div className="mt-2 rounded-2xl border border-slate-200/70 bg-white/70 p-4">
              <div className="flex h-7 items-end gap-1">
                {timeline.map((slot, index) => (
                  <div
                    key={`${slot.hour}-${index}`}
                    className="flex-1 rounded-md"
                    style={{
                      height: slot.level === 3 ? 24 : slot.level === 2 ? 18 : slot.level === 1 ? 12 : 6,
                      background:
                        slot.level > 0
                          ? 'linear-gradient(90deg,#3bb2ff,#5f7aff)'
                          : 'rgba(148,163,184,0.35)',
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                <span>Wake</span>
                <span>Mid</span>
                <span>Wind-down</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                {data.mostActiveWindow
                  ? `Most active: ${data.mostActiveWindow.start}–${data.mostActiveWindow.end}`
                  : 'Most active window not detected yet.'}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <MacroChip label="Longest sit" value={formatMinutes(data.sitLongest)} />
            <MacroChip label="Stand reminders" value={`${data.standHits ?? 0}/12`} />
            <MacroChip label="Floors" value={data.floors != null ? String(data.floors) : '—'} />
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3">
            <div className="text-xl">💡</div>
            <p className="text-sm leading-relaxed text-slate-600">{coachMessage}</p>
          </div>
        </section>

        <div className="pb-2">
          <button
            type="button"
            onClick={() => router.push('/activity/log')}
            className="w-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.98]"
          >
            Log activity
          </button>
        </div>
      </div>
    </div>
  )
}
