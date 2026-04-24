'use client'

import { useEffect, useState, useCallback } from 'react'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

type WorkBlockStatus = 'well_recovered' | 'slight_debt' | 'high_debt'

type LastWorkBlockPayload = {
  totalSleepMinutes: number
  shiftCount: number
  status: WorkBlockStatus
  blockStartDate: string
  blockEndDate: string
  expectedSleepMinutes: number
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
    insight: 'You stayed well recovered across this work stretch.',
    dot: 'bg-emerald-500',
    badge: 'bg-[var(--card-subtle)] text-[var(--text-main)] ring-1 ring-[var(--border-subtle)]',
  },
  slight_debt: {
    label: 'Slight sleep debt',
    insight: 'You built up some sleep debt during this block.',
    dot: 'bg-amber-500',
    badge: 'bg-[var(--card-subtle)] text-[var(--text-main)] ring-1 ring-[var(--border-subtle)]',
  },
  high_debt: {
    label: 'High sleep debt',
    insight: 'Your sleep was low for the number of shifts worked.',
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

  return (
    <section
      className={`rounded-lg bg-[var(--card)] p-5 transition-all duration-200 hover:bg-[var(--card-subtle)] ${inter.className}`}
      aria-labelledby="last-work-block-heading"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="last-work-block-heading" className="text-xs font-medium tracking-wide text-[var(--text-muted)]">
          Sleep over last work block
        </h2>
        <p className="text-xs tabular-nums text-[var(--text-muted)]">{dateRange}</p>
      </div>

      <p
        className="mb-1 text-[2.75rem] font-semibold leading-none tracking-tight text-[var(--text-main)]"
        aria-label={`Total sleep: ${sleepLabel}`}
      >
        {sleepLabel}
      </p>

      <p className="mb-5 text-sm text-[var(--text-soft)]">
        Across {block.shiftCount} {block.shiftCount === 1 ? 'shift' : 'shifts'}
      </p>

      <span
        className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.badge}`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>

      <p className="text-sm leading-relaxed text-[var(--text-soft)]">{cfg.insight}</p>
    </section>
  )
}
