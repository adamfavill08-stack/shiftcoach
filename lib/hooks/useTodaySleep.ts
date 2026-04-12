'use client'

import { useCallback, useEffect, useState } from 'react'
import { authedFetch } from '@/lib/supabase/authedFetch'

function anchorYmdInTimeZone(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Total sleep minutes for the same "today" window as /sleep (ShiftWorkerSleepPage):
 * prefer calendar-day totals from /api/sleep/7days, else current shifted day from /api/sleep/24h-grouped.
 */
async function fetchSleepTotalAlignedWithSleepPage(): Promise<number> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const anchorDate = anchorYmdInTimeZone(tz)

  try {
    const params7 = new URLSearchParams({
      tz,
      anchorDate,
    })
    const res7 = await authedFetch(`/api/sleep/7days?${params7.toString()}`, { cache: 'no-store' })
    if (res7.ok) {
      const json7 = (await res7.json()) as {
        days?: Array<{ date?: string; totalMinutes?: number }>
      }
      const days = json7.days ?? []
      const row = days.find((d) => String(d.date ?? '').slice(0, 10) === anchorDate)
      if (row && typeof row.totalMinutes === 'number') {
        return Math.max(0, Math.round(row.totalMinutes))
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const resG = await authedFetch(
      `/api/sleep/24h-grouped?days=14&tz=${encodeURIComponent(tz)}`,
      { cache: 'no-store' },
    )
    if (resG.ok) {
      const jsonG = (await resG.json()) as {
        days?: Array<{ date?: string; totalMinutes?: number }>
        currentShiftedDay?: string
      }
      const key = jsonG.currentShiftedDay
      if (key) {
        const row = (jsonG.days ?? []).find((d) => d.date === key)
        if (row && typeof row.totalMinutes === 'number') {
          return Math.max(0, Math.round(row.totalMinutes))
        }
      }
    }
  } catch {
    /* fall through */
  }

  return 0
}

type TodaySleepState = {
  /** Total sleep (main + naps) aligned with the /sleep hub headline. */
  totalMinutes: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTodaySleep(): TodaySleepState {
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSleep = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const total = await fetchSleepTotalAlignedWithSleepPage()
      setTotalMinutes(total)
    } catch (err) {
      console.error('[useTodaySleep] failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to load sleep')
      setTotalMinutes(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSleep()
  }, [fetchSleep])

  useEffect(() => {
    const onRefresh = () => {
      void fetchSleep()
    }
    window.addEventListener('sleep-refreshed', onRefresh)
    return () => window.removeEventListener('sleep-refreshed', onRefresh)
  }, [fetchSleep])

  return { totalMinutes, loading, error, refetch: fetchSleep }
}
