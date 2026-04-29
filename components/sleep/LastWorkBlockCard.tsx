'use client'

import { useEffect, useState, useCallback } from 'react'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

type WorkBlockStatus = 'well_recovered' | 'slight_debt' | 'high_debt'

type LastWorkBlockPayload = {
  totalSleepMinutes: number
  dayCount: number
  status: WorkBlockStatus
  blockStartDate: string
  blockEndDate: string
  expectedSleepMinutes: number
  whoAgeYears: number | null
  whoRecommendedDailyHoursMin: number
  whoRecommendedDailyHoursMax: number
  whoRecommendedDailyHoursMid: number
  sleepDebtMinutes: number
  sleepAheadMinutes: number
}

type Props = {
  timeZone?: string | null
  authedFetch: (url: string, init?: RequestInit) => Promise<Response>
}

function formatTotalSleep(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatHours(hours: number, decimals = 1): string {
  if (!Number.isFinite(hours)) return '0.0h'
  return `${hours.toFixed(decimals)}h`
}

function formatDateRange(start: string, end: string, tz: string): string {
  const fmt = (ymd: string) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      day: 'numeric',
      month: 'short',
    }).format(new Date(`${ymd}T12:00:00Z`))
  if (start === end) return fmt(start)
  return `${fmt(start)} – ${fmt(end)}`
}

const STATUS_CONFIG: Record<
  WorkBlockStatus,
  { label: string; insight: string; dot: string; badge: string }
> = {
  well_recovered: {
    label: 'Well recovered',
    insight: 'You are well recovered versus WHO recommended sleep for the last 7 days.',
    dot: 'bg-emerald-500',
    badge: 'bg-[var(--card-subtle)] text-[var(--text-main)] ring-1 ring-[var(--border-subtle)]',
  },
  slight_debt: {
    label: 'Slight sleep debt',
    insight: 'You are carrying some sleep debt versus WHO recommended sleep for the last 7 days.',
    dot: 'bg-amber-500',
    badge: 'bg-[var(--card-subtle)] text-[var(--text-main)] ring-1 ring-[var(--border-subtle)]',
  },
  high_debt: {
    label: 'High sleep debt',
    insight: 'Your sleep was below WHO recommended sleep for the last 7 days.',
    dot: 'bg-rose-500',
    badge: 'bg-[var(--card-subtle)] text-[var(--text-main)] ring-1 ring-[var(--border-subtle)]',
  },
}

function Skeleton() {
  return (
    <div className={`animate-pulse rounded-lg bg-[var(--card)] p-5 ${inter.className}`}>
      <div className="mb-5 h-3.5 w-28 rounded bg-[var(--card-subtle)]" />
      <div className="mb-2 h-10 w-36 rounded bg-[var(--card-subtle)]" />
      <div className="mb-5 h-3 w-20 rounded bg-[var(--card-subtle)]" />
      <div className="mb-4 h-6 w-32 rounded-full bg-[var(--card-subtle)]" />
      <div className="h-3 w-3/4 rounded bg-[var(--card-subtle)]" />
    </div>
  )
}

export function LastWorkBlockCard({ timeZone, authedFetch }: Props) {
  const tz = timeZone ?? 'UTC'
  const [block, setBlock] = useState<LastWorkBlockPayload | null | undefined>(undefined)

  const fetchBlock = useCallback(async () => {
    try {
      const res = await authedFetch(`/api/sleep/last-work-block?tz=${encodeURIComponent(tz)}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        setBlock(null)
        return
      }
      const json = await res.json()
      setBlock(json.block ?? null)
    } catch {
      setBlock(null)
    }
  }, [tz, authedFetch])

  useEffect(() => {
    void fetchBlock()
  }, [fetchBlock])

  if (block === undefined) return <Skeleton />
  if (block === null) return null

  const cfg = STATUS_CONFIG[block.status]
  const sleepLabel = formatTotalSleep(block.totalSleepMinutes)
  const dateRange = formatDateRange(block.blockStartDate, block.blockEndDate, tz)

  const whoMinHours = block.whoRecommendedDailyHoursMin
  const whoMaxHours = block.whoRecommendedDailyHoursMax
  const whoAvgHours = block.whoRecommendedDailyHoursMid
  const whoAgeYears = block.whoAgeYears

  const debtHours = block.sleepDebtMinutes / 60
  const aheadHours = block.sleepAheadMinutes / 60

  return (
    <section
      className={`rounded-lg bg-[var(--card)] p-5 transition-all duration-200 hover:bg-[var(--card-subtle)] ${inter.className}`}
      aria-labelledby="last-work-block-heading"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="last-work-block-heading" className="text-xs font-medium tracking-wide text-[var(--text-muted)]">
          Sleep over last 7 days
        </h2>
        <p className="text-xs tabular-nums text-[var(--text-muted)]">{dateRange}</p>
      </div>

      <p
        className="mb-1 text-[2.75rem] font-semibold leading-none tracking-tight text-[var(--text-main)]"
        aria-label={`Total sleep: ${sleepLabel}`}
      >
        {sleepLabel}
      </p>

      <p className="mb-3 text-sm text-[var(--text-soft)]">
        WHO recommends {whoMinHours}–{whoMaxHours} hours per night · avg {formatHours(whoAvgHours, 1)}
      </p>

      <p className="mb-4 text-sm text-[var(--text-soft)]">
        {aheadHours > 0 ? (
          <>
            You are ahead by{' '}
            <span className="font-semibold text-[var(--text-main)]">{formatHours(aheadHours, 1)}</span>
          </>
        ) : (
          <>
            You are carrying{' '}
            <span className="font-semibold text-[var(--text-main)]">{formatHours(debtHours, 1)}</span> sleep debt vs WHO
          </>
        )}
      </p>

      <span
        className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.badge}`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>

      <p className="text-sm leading-relaxed text-[var(--text-soft)]">{cfg.insight}</p>

      <span className="mt-4 inline-flex w-fit items-center rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200/70 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-900/40">
        WHO = World Health Organization
      </span>
    </section>
  )
}
