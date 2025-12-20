'use client'

import type { ComponentType } from 'react'
import { Droplet, Coffee, Flame, Info } from 'lucide-react'
import { NutritionSummary } from '../types'
import { Tooltip } from '@/components/ui/Tooltip'

interface CaloriesPageProps {
  summary: NutritionSummary | null
}

function ProgressBar({ progress, className }: { progress: number; className?: string }) {
  const pct = Math.max(0, Math.min(progress, 1)) * 100
  return (
    <div className={['h-2 w-full rounded-full bg-white/10', className].filter(Boolean).join(' ')}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function CaloriesPage({ summary }: CaloriesPageProps) {
  const adjusted = summary?.adjustedCalories ?? null
  const consumed = summary?.consumedCalories ?? null
  const progress = adjusted ? Math.min((consumed ?? 0) / adjusted, 1.2) : 0

  const macros = summary?.macros

  return (
    <div className="relative flex h-full flex-col rounded-3xl bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 p-6 text-slate-900 dark:text-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]">
      {/* Highlight overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
      
      {/* Subtle colored glow hints - dark mode only */}
      <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
      
      {/* Inner ring for premium feel */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />
      
      <div className="relative z-10">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold">Energy &amp; macros</h2>
            <Tooltip
              content={
                <span>
                  We adjust your daily calories and macros based on your shift pattern, recent sleep and activity, so
                  nights and days don&apos;t get the same target.
                </span>
              }
            >
              <Info className="h-3 w-3" />
            </Tooltip>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Targets personalised to today&apos;s shift</p>
        </div>
        <Flame className="h-5 w-5 text-slate-400 dark:text-slate-500" />
      </header>

      <div className="mt-6 rounded-2xl bg-slate-900/90 dark:bg-slate-800/70 p-5 text-white">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300 dark:text-slate-400">Adjusted calories</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-semibold">
            {adjusted != null ? adjusted.toLocaleString() : '—'}
          </span>
          <span className="text-sm text-slate-300 dark:text-slate-400">kcal</span>
        </div>
        <ProgressBar className="mt-4" progress={progress} />
        <p className="mt-3 text-xs text-slate-300 dark:text-slate-400">
          Consumed {consumed != null ? consumed.toLocaleString() : 0} kcal so far
        </p>
      </div>

      {macros && (
        <div className="mt-5 grid grid-cols-2 gap-4">
          {['protein', 'carbs', 'fat', 'satFat'].map((key) => {
            const macro = macros[key as keyof typeof macros]
            if (!macro) return null
            const ratio =
              macro.target && macro.consumed != null
                ? Math.min(macro.consumed / macro.target, 1.2)
                : null
            return (
              <div
                key={key}
                className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/50 dark:bg-slate-800/30 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  {macro.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {macro.consumed != null ? `${Math.round(macro.consumed)} g` : '—'}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Target {macro.target != null ? `${Math.round(macro.target)} g` : '—'}
                </p>
                {ratio != null && <ProgressBar className="mt-3" progress={ratio} />}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4">
        <HydrationCard
          icon={Droplet}
          label="Water"
          target={summary?.hydration.water.target ?? null}
          consumed={summary?.hydration.water.consumed ?? null}
          unit="ml"
        />
        <HydrationCard
          icon={Coffee}
          label="Caffeine"
          target={summary?.hydration.caffeine.limit ?? null}
          consumed={summary?.hydration.caffeine.consumed ?? null}
          unit="mg"
        />
      </div>
    </div>
  )
}

function HydrationCard({
  icon: Icon,
  label,
  target,
  consumed,
  unit,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  target: number | null
  consumed: number | null
  unit: string
}) {
  const ratio = target ? Math.min((consumed ?? 0) / target, 1.2) : null
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/50 dark:bg-slate-800/30 px-4 py-3">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {consumed != null ? `${Math.round(consumed)} ${unit}` : '—'}
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Target {target != null ? `${Math.round(target)} ${unit}` : '—'}
        </p>
      </div>
      <Icon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
      {ratio != null && (
        <div className="ml-3 h-12 w-12 rounded-full border border-slate-200/70 dark:border-slate-700/50">
          <div className="relative h-full w-full">
            <svg viewBox="0 0 36 36" className="h-full w-full">
              <path
                className="text-slate-200 dark:text-slate-700"
                stroke="currentColor"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-sky-500 dark:text-sky-400"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${ratio * 100}, 100`}
                d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-500 dark:text-slate-300">
              {Math.round(ratio * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
