'use client'

import { useCallback, useEffect, useState } from 'react'
import { authedFetch } from '@/lib/supabase/authedFetch'

export type HydrationWeekPayload = {
  todayHydrationDayKey: string
  dayKeys: string[]
  days: string[]
  hydrationTargetMl: number[]
  hydrationActualMl: number[]
}

const empty: HydrationWeekPayload = {
  todayHydrationDayKey: '',
  dayKeys: [],
  days: [],
  hydrationTargetMl: [],
  hydrationActualMl: [],
}

export function useHydrationWeek() {
  const [data, setData] = useState<HydrationWeekPayload>(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tz =
    typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await authedFetch(
        `/api/hydration/weekly?tz=${encodeURIComponent(tz)}`,
        { cache: 'no-store' },
      )
      if (!res.ok) {
        setData(empty)
        setError('load_failed')
        return
      }
      const json = (await res.json()) as HydrationWeekPayload
      if (
        Array.isArray(json.days) &&
        json.days.length === 7 &&
        Array.isArray(json.hydrationTargetMl) &&
        json.hydrationTargetMl.length === 7 &&
        Array.isArray(json.hydrationActualMl) &&
        json.hydrationActualMl.length === 7
      ) {
        setData(json)
      } else {
        setData(empty)
        setError('invalid_payload')
      }
    } catch {
      setData(empty)
      setError('network')
    } finally {
      setLoading(false)
    }
  }, [tz])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onWater = () => void load()
    window.addEventListener('water-logged', onWater)
    return () => window.removeEventListener('water-logged', onWater)
  }, [load])

  return { data, loading, error, refresh: load }
}
