'use client'

import { Activity } from 'lucide-react'
import { ActivitySummary } from '../types'

interface ActivityPageProps {
  summary: ActivitySummary | null
  onViewHistory: () => void
}

export function ActivityPage({ summary, onViewHistory }: ActivityPageProps) {
  const steps = summary?.steps ?? 0
  const goal = summary?.goal ?? 10000
  const progress = goal ? Math.min(steps / goal, 1.2) : 0

  return (
    <div className="flex h-full flex-col rounded-3xl bg-white/90 p-6 text-slate-900 shadow-lg shadow-slate-900/10 dark:bg-slate-900/90 dark:text-slate-50 dark:shadow-slate-900/40">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Activity & steps</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Wearable-ready insights</p>
        </div>
        <Activity className="h-5 w-5 text-slate-400 dark:text-slate-500" />
      </header>

      <div className="mt-6 rounded-2xl bg-slate-900/90 p-5 text-white dark:bg-slate-800">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Steps today</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-semibold">{steps.toLocaleString()}</span>
          <span className="text-sm text-slate-300">/ {goal.toLocaleString()}</span>
        </div>
        <ProgressBar className="mt-4" progress={progress} />
        <p className="mt-3 text-xs text-slate-300">
          Active minutes: {summary?.activeMinutes ?? '—'}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          {summary?.lastSyncedAt
            ? `Last sync ${formatTime(summary.lastSyncedAt)} via ${summary.source ?? 'wearable'}`
            : 'No wearable connected yet'}
        </p>
      </div>

      <button
        type="button"
        onClick={onViewHistory}
        className="mt-auto inline-flex h-12 w-full items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        View activity history
      </button>
    </div>
  )
}

function ProgressBar({ progress, className }: { progress: number; className?: string }) {
  const pct = Math.max(0, Math.min(progress, 1)) * 100
  return (
    <div className={['h-2 w-full rounded-full bg-white/10', className].filter(Boolean).join(' ')}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}
