import { useCallback, useEffect, useState } from 'react'
import type { RotaDay } from '@/lib/data/buildRotaMonth'

export type RotaPatternPayload = {
  shift_length: string
  pattern_id: string
  pattern_slots: string[]
  current_shift_index: number
  start_date: string
  color_config: Record<string, string | null>
  notes?: string | null
} | null

export type RotaEvent = {
  id: string
  date: string
  title: string
  type: string
  color?: string | null
  isAllDay?: boolean
}

export type RotaMonthResponse = {
  month: number
  year: number
  pattern: RotaPatternPayload
  weeks: RotaDay[][]
}

export type RotaEventsResponse = {
  events?: RotaEvent[]
}

const EMPTY_MONTH: RotaMonthResponse = {
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  pattern: null,
  weeks: [],
}

export function useRotaMonth(month: number, year: number) {
  const [monthData, setMonthData] = useState<RotaMonthResponse | null>(null)
  const [eventsByDate, setEventsByDate] = useState<Map<string, RotaEvent[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(
    async (targetMonth?: number, targetYear?: number) => {
      const m = typeof targetMonth === 'number' ? targetMonth : month
      const y = typeof targetYear === 'number' ? targetYear : year

      setLoading(true)
      setError(null)

      try {
        const monthRes = await fetch(`/api/rota/month?month=${m + 1}&year=${y}`)

        if (!monthRes.ok) {
          const text = await monthRes.text().catch(() => null)
          console.error('[useRotaMonth] failed to load month', {
            status: monthRes.status,
            preview: text?.slice(0, 200) ?? null,
          })
          setMonthData({ ...EMPTY_MONTH, month: m + 1, year: y })
          setEventsByDate(new Map())
          setError(`Failed to load rota month (status ${monthRes.status})`)
          return
        }

        const monthJson = (await monthRes.json()) as RotaMonthResponse
        setMonthData(monthJson)

        try {
          const eventsRes = await fetch(`/api/rota/event?month=${m + 1}&year=${y}`, { cache: 'no-store' })

          if (!eventsRes.ok) {
            const text = await eventsRes.text().catch(() => null)
            console.error('[useRotaMonth] failed to load events', {
              status: eventsRes.status,
              preview: text?.slice(0, 200) ?? null,
            })
            setEventsByDate(new Map())
          } else {
            const eventsJson = (await eventsRes.json().catch(() => null)) as RotaEventsResponse | null
            const eventsList: RotaEvent[] = Array.isArray(eventsJson?.events) ? (eventsJson!.events as RotaEvent[]) : []
            console.log('[useRotaMonth] loaded events', {
              month: m + 1,
              year: y,
              count: eventsList.length,
              events: eventsList,
            })
            const map = new Map<string, RotaEvent[]>()
            for (const ev of eventsList) {
              // Extract date from start_at field (primary after migration), event_date, date, or start_at ISO string
              let dateStr: string | null = null
              if (ev?.start_at) {
                dateStr = new Date(ev.start_at).toISOString().slice(0, 10)
              } else if (ev?.event_date) {
                dateStr = ev.event_date.slice(0, 10)
              } else if (ev?.date) {
                dateStr = ev.date.slice(0, 10)
              }
              if (!dateStr) continue
              const key = dateStr
              const existing = map.get(key) ?? []
              existing.push(ev)
              map.set(key, existing)
            }
            
            setEventsByDate(map)
          }
        } catch (eventsErr) {
          console.error('[useRotaMonth] events fetch error', eventsErr)
          setEventsByDate(new Map())
        }
      } catch (err: any) {
        console.error('[useRotaMonth] fetch error', err)
        setMonthData({ ...EMPTY_MONTH, month: m + 1, year: y })
        setEventsByDate(new Map())
        setError(err?.message ?? 'Failed to load rota month')
      } finally {
        setLoading(false)
      }
    },
    [month, year],
  )

  useEffect(() => {
    fetchData(month, year)
  }, [fetchData, month, year])

  return {
    data: monthData,
    eventsByDate,
    loading,
    error,
    refetch: fetchData,
  }
}
