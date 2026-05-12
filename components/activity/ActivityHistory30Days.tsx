'use client'

import { useEffect, useMemo, useState } from 'react'
import { authedFetch } from '@/lib/supabase/authedFetch'
import {
  buildActivityHistory30Days,
  summarizeActivityHistoryWindow,
  type ActivityHistoryItem,
  type ActivityHistory30DaysResult,
  type ActivityHistoryDayType,
} from '@/lib/activity/activityHistory30Days'

const HISTORY_RANGE_OPTIONS = [7, 14, 30] as const
type HistoryRangeDays = (typeof HISTORY_RANGE_OPTIONS)[number]

type HistoryApiPayload = {
  shifts?: Array<{
    date: string | null
    label?: string | null
    shift_type?: string | null
    start_ts?: string | null
    end_ts?: string | null
    start_time?: string | null
    end_time?: string | null
  }>
  stepSamples?: Array<{ bucket_start_utc: string; bucket_end_utc: string | null; steps: number }>
}

function typeChip(type: ActivityHistoryDayType): { label: string; cls: string } {
  switch (type) {
    case 'night_shift':
      return { label: 'Night shift', cls: 'bg-indigo-100 text-indigo-700' }
    case 'evening_shift':
      return { label: 'Evening shift', cls: 'bg-violet-100 text-violet-700' }
    case 'day_shift':
      return { label: 'Day shift', cls: 'bg-sky-100 text-sky-700' }
    case 'recovery':
      return { label: 'Recovery', cls: 'bg-amber-100 text-amber-700' }
    default:
      return { label: 'Day off', cls: 'bg-slate-100 text-slate-600' }
  }
}

function verdictClass(v: ActivityHistoryItem['verdict']): string {
  if (v === 'High') return 'text-emerald-700'
  if (v === 'Good') return 'text-sky-700'
  return 'text-amber-700'
}

export function ActivityHistory30Days() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ActivityHistory30DaysResult | null>(null)
  const [rangeDays, setRangeDays] = useState<HistoryRangeDays>(7)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const tz =
          typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function'
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : 'UTC'
        const res = await authedFetch(`/api/activity/history-30d?tz=${encodeURIComponent(tz)}`)
        if (!res.ok) throw new Error('history_fetch_failed')
        const body = (await res.json().catch(() => ({}))) as HistoryApiPayload & {
          range?: { timeZone?: string }
        }
        const built = buildActivityHistory30Days({
          timeZone: typeof body.range?.timeZone === 'string' && body.range.timeZone.length > 0 ? body.range.timeZone : tz,
          shiftRows: Array.isArray(body.shifts) ? body.shifts : [],
          sampleRows: Array.isArray(body.stepSamples) ? body.stepSamples : [],
        })
        if (!cancelled) setResult(built)
      } catch {
        if (!cancelled) setError('Could not load 30-day history right now.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const start = () => {
      if (!cancelled) void load()
    }
    let idleId: ReturnType<typeof requestIdleCallback> | ReturnType<typeof setTimeout>
    if (typeof requestIdleCallback === 'function') {
      idleId = requestIdleCallback(start, { timeout: 2000 })
    } else {
      idleId = setTimeout(start, 0)
    }
    return () => {
      cancelled = true
      if (typeof requestIdleCallback === 'function') {
        cancelIdleCallback(idleId as number)
      } else {
        clearTimeout(idleId as ReturnType<typeof setTimeout>)
      }
    }
  }, [])

  const topItems = useMemo(
    () => (result ? result.items.slice(0, rangeDays) : []),
    [result, rangeDays],
  )

  const displaySummary = useMemo(
    () => (result ? summarizeActivityHistoryWindow(topItems) : null),
    [result, topItems],
  )

  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-[var(--border-subtle)] dark:bg-zinc-900/75">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-900 dark:text-[var(--text-main)]">
            Last {rangeDays} days
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Shift-aware movement history with overnight shifts kept together.
          </p>
        </div>
        <label className="flex shrink-0 flex-col gap-0.5 sm:items-end">
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Show
          </span>
          <select
            className="min-w-[8.5rem] cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 shadow-sm outline-none ring-slate-400/40 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-[var(--text-main)] dark:ring-zinc-500/50"
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value) as HistoryRangeDays)}
            aria-label="Number of days to show in movement history"
          >
            {HISTORY_RANGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                Last {n} days
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="space-y-2" aria-hidden>
          <div className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
          <div className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
          <div className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
        </div>
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      ) : result && displaySummary ? (
        <>
          {!result.hasAnyStepSamples ? (
            <p className="mb-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-zinc-800/80 dark:text-slate-300">
              No wearable step samples synced in this window yet.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2 dark:bg-zinc-800/70">
            <div className="rounded-md bg-white px-2 py-2 dark:bg-zinc-900">
              <p className="text-[11px] text-slate-500">Shifts tracked</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-[var(--text-main)]">{displaySummary.shiftsTracked}</p>
            </div>
            <div className="rounded-md bg-white px-2 py-2 dark:bg-zinc-900">
              <p className="text-[11px] text-slate-500">Avg during-shift</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-[var(--text-main)]">
                {displaySummary.averageDuringShiftSteps.toLocaleString()}
              </p>
            </div>
            <div className="rounded-md bg-white px-2 py-2 dark:bg-zinc-900">
              <p className="text-[11px] text-slate-500">Low movement shifts</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-[var(--text-main)]">{displaySummary.lowMovementShifts}</p>
            </div>
            <div className="rounded-md bg-white px-2 py-2 dark:bg-zinc-900">
              <p className="text-[11px] text-slate-500">Best shift</p>
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-[var(--text-main)]">
                {displaySummary.bestShift
                  ? `${displaySummary.bestShift.label} (${displaySummary.bestShift.steps.toLocaleString()})`
                  : 'No shift data'}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {topItems.map((item) => {
              const chip = typeChip(item.type)
              const primarySteps = item.duringShiftSteps ?? item.totalSteps
              return (
                <article key={item.key} className="rounded-lg border border-slate-200 px-3 py-3 dark:border-zinc-700">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-[var(--text-main)]">{item.dateLabel}</p>
                      {item.rosterTimeRange ? (
                        <p className="mt-0.5 truncate text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
                          {item.rosterTimeRange}
                        </p>
                      ) : null}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip.cls}`}>{chip.label}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      {item.duringShiftSteps != null ? 'During shift steps' : 'Daily steps'}
                    </p>
                    <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-[var(--text-main)]">
                      {item.missingData ? '—' : primarySteps.toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-slate-500">Verdict</p>
                    <p className={`text-xs font-semibold ${verdictClass(item.verdict)}`}>{item.verdict}</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{item.insight}</p>
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    {item.segments.map((seg) => (
                      <div key={seg.label} className="rounded-md bg-slate-50 px-2 py-1.5 text-center dark:bg-zinc-800">
                        <p className="text-[10px] text-slate-500">{seg.label}</p>
                        <p className="text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                          {item.missingData ? '—' : seg.steps.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </>
      ) : null}
    </section>
  )
}

