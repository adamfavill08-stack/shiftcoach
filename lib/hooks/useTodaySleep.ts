'use client'

import { useCallback, useEffect, useState } from 'react'

export type TodaySleep = {
  id: string
  start_ts: string
  end_ts: string
  quality: number | null
  naps: number | null
  duration_min: number | null
}

type TodaySleepState = {
  sleep: TodaySleep | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTodaySleep(): TodaySleepState {
  const [sleep, setSleep] = useState<TodaySleep | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSleep = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/sleep/today', {
        method: 'GET',
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || data?.message || `Failed to fetch sleep (${res.status})`)
      }

      const json = (await res.json()) as { sleep: TodaySleep | null }
      setSleep(json.sleep ?? null)
    } catch (err) {
      console.error('[useTodaySleep] failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to load sleep')
      setSleep(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSleep()
  }, [fetchSleep])

  return { sleep, loading, error, refetch: fetchSleep }
}
