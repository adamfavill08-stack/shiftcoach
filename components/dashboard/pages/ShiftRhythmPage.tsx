'use client'

import { RefreshCw } from 'lucide-react'
import { ShiftSubScores } from '../types'

interface ShiftRhythmPageProps {
  totalScore: number | null
  loading: boolean
  message: string
  onRefresh: () => void
  refreshing: boolean
  subScores?: ShiftSubScores
}

export function ShiftRhythmPage({
  totalScore,
  loading,
  message,
  onRefresh,
  refreshing,
  subScores,
}: ShiftRhythmPageProps) {
  return (
    <div className="flex h-full flex-col justify-between rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-900/40 p-6 text-slate-50 shadow-[0_20px_60px_rgba(14,22,48,0.35)] dark:from-slate-900/95 dark:via-slate-900/70 dark:to-slate-900/60">
      <div>
        <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Rhythm engine</div>
        <div className="mt-3 text-2xl font-semibold">Today&apos;s rhythm</div>
      </div>
      <GaugeCard score={totalScore} loading={loading} />
      <p className="mt-6 text-sm leading-relaxed text-slate-300">{message}</p>
      {subScores && (
        <div className="mt-4 rounded-2xl bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Breakdown</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            {renderSubScore('Sleep', subScores.sleep_score)}
            {renderSubScore('Regularity', subScores.regularity_score)}
            {renderSubScore('Shift align', subScores.shift_pattern_score)}
            {renderSubScore('Recovery', subScores.recovery_score)}
            {renderSubScore('Nutrition', subScores.nutrition_score)}
            {renderSubScore('Activity', subScores.activity_score)}
            {renderSubScore('Meals', subScores.meal_timing_score)}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onRefresh}
        className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/20"
        disabled={refreshing}
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        {refreshing ? 'Refreshing…' : 'Refresh score'}
      </button>
    </div>
  )
}

function GaugeCard({ score, loading }: { score: number | null; loading: boolean }) {
  const radius = 120
  const stroke = 14
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const cappedScore = Math.min(Math.max(score ?? 0, 0), 10)
  const progress = circumference - (cappedScore / 10) * circumference

  return (
    <div className="relative mx-auto mt-6 flex h-[260px] w-[260px] items-center justify-center">
      <svg height={radius * 2} width={radius * 2}>
        <defs>
          <linearGradient id="rhythm-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <circle
          stroke="rgba(255,255,255,0.15)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="url(#rhythm-gradient)"
          fill="transparent"
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={progress}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-5xl font-semibold">
          {loading ? '—' : score?.toFixed(1) ?? '—'}
        </span>
        <span className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-400">
          Shift Rhythm
        </span>
      </div>
    </div>
  )
}

function renderSubScore(label: string, value?: number | null) {
  if (value == null) return null
  return (
    <div className="rounded-xl bg-slate-900/30 px-3 py-2 text-slate-200">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="text-base font-semibold">{Math.round(value)}</p>
    </div>
  )
}
