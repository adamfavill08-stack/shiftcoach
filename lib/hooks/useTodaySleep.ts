'use client'

import { useCallback, useEffect, useState } from 'react'
import { authedFetch } from '@/lib/supabase/authedFetch'
import { rowCountsAsPrimarySleep } from '@/lib/sleep/utils'

function anchorYmdInTimeZone(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

type SleepTodayPayload = {
  sleep?: {
    duration_min?: number | null
    start_ts?: string | null
    end_ts?: string | null
  } | null
}

/** Latest completed primary sleep from /api/sleep/today (DB + phone fallback). */
async function fetchLastPrimarySleepMinutes(): Promise<number> {
  try {
    const res = await authedFetch('/api/sleep/today', { cache: 'no-store' })
    if (!res.ok) return 0
    const json = (await res.json()) as SleepTodayPayload
    const s = json.sleep
    if (!s) return 0
    if (typeof s.duration_min === 'number' && Number.isFinite(s.duration_min) && s.duration_min > 0) {
      return Math.round(s.duration_min)
    }
    const start = s.start_ts
    const end = s.end_ts
    if (start && end) {
      const ms = Date.parse(end) - Date.parse(start)
      if (Number.isFinite(ms) && ms > 0) return Math.round(ms / 60000)
    }
  } catch {
    /* fall through */
  }
  return 0
}

type SessionLike = {
  id?: string
  start_at: string
  end_at: string
  type?: string | null
  durationHours?: number
}

function fullMinutesFromSession(s: SessionLike): number {
  const a = Date.parse(s.start_at)
  const b = Date.parse(s.end_at)
  if (Number.isFinite(a) && Number.isFinite(b) && b > a) {
    return Math.round((b - a) / 60000)
  }
  if (typeof s.durationHours === 'number' && Number.isFinite(s.durationHours) && s.durationHours > 0) {
    return Math.round(s.durationHours * 60)
  }
  return 0
}

function dedupeSessions(sessions: SessionLike[]): SessionLike[] {
  const byKey = new Map<string, SessionLike>()
  for (const s of sessions) {
    if (!s.start_at || !s.end_at) continue
    const key = s.id != null && String(s.id).trim() !== '' ? String(s.id) : `${s.start_at}|${s.end_at}`
    byKey.set(key, s)
  }
  return [...byKey.values()]
}

/**
 * Same idea as ShiftWorkerSleepPage `lastSleepHero`: merge 7-day + 14 shifted sessions, dedupe,
 * latest primary by wake time, full length from timestamps (matches overview card when /api/sleep/today misses).
 */
async function fetchLatestPrimaryFullMinutesMerged(): Promise<number> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const anchorDate = anchorYmdInTimeZone(tz)
  const collected: SessionLike[] = []

  try {
    const params7 = new URLSearchParams({ tz, anchorDate })
    const res7 = await authedFetch(`/api/sleep/7days?${params7.toString()}`, { cache: 'no-store' })
    if (res7.ok) {
      const json7 = (await res7.json()) as { days?: Array<{ sessions?: SessionLike[] }> }
      for (const d of json7.days ?? []) {
        for (const s of d.sessions ?? []) {
          if (s?.start_at && s.end_at) collected.push(s)
        }
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const resG = await authedFetch(
      `/api/sleep/24h-grouped?days=14&tz=${encodeURIComponent(tz)}`,
      { cache: 'no-store' },
    )
    if (resG.ok) {
      const jsonG = (await resG.json()) as { days?: Array<{ sessions?: SessionLike[] }> }
      for (const d of jsonG.days ?? []) {
        for (const s of d.sessions ?? []) {
          if (s?.start_at && s.end_at) collected.push(s)
        }
      }
    }
  } catch {
    /* ignore */
  }

  const merged = dedupeSessions(collected)
  const primaries = merged.filter((s) => rowCountsAsPrimarySleep({ type: s.type }))
  const pool = primaries.length > 0 ? primaries : merged
  if (!pool.length) return 0
  const best = [...pool].sort((a, b) => Date.parse(b.end_at) - Date.parse(a.end_at))[0]
  const mins = fullMinutesFromSession(best)
  return mins > 0 ? mins : 0
}

type TodaySleepState = {
  /** Latest primary sleep, full session minutes (aligned with /sleep overview hero). */
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
      let total = await fetchLatestPrimaryFullMinutesMerged()
      if (total <= 0) {
        total = await fetchLastPrimarySleepMinutes()
      }
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
    let debounce: ReturnType<typeof setTimeout> | null = null
    const onRefresh = () => {
      if (debounce != null) clearTimeout(debounce)
      debounce = setTimeout(() => {
        debounce = null
        void fetchSleep()
      }, 250)
    }
    window.addEventListener('sleep-refreshed', onRefresh)
    window.addEventListener('wearables-synced', onRefresh)
    return () => {
      window.removeEventListener('sleep-refreshed', onRefresh)
      window.removeEventListener('wearables-synced', onRefresh)
      if (debounce != null) clearTimeout(debounce)
    }
  }, [fetchSleep])

  return { totalMinutes, loading, error, refetch: fetchSleep }
}
