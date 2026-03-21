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
        const monthRes = await fetch(`/api/rota/month?month=${m + 1}&year=${y}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        })

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

            // Deduplicate events that are effectively the same holiday/entry on a given day.
            // This protects against accidental duplicate inserts or migration artefacts that can
            // show many identical "Holiday" blocks stacked on one date, especially in production.
            const seenKeys = new Set<string>()
            const dedupedEvents: RotaEvent[] = []
            for (const ev of eventsList) {
              const rawEventDate = (ev as any).event_date as string | undefined
              const rawDate =
                rawEventDate ||
                ev.date ||
                (ev as any).start_at ||
                null

              // Prefer the event_date string directly to avoid any timezone shift
              const dateStr = rawEventDate
                ? rawEventDate.slice(0, 10)
                : rawDate
                ? new Date(rawDate).toISOString().slice(0, 10)
                : null

              if (!dateStr) continue

              const key = `${dateStr}|${ev.title ?? ''}`
              if (seenKeys.has(key)) continue
              seenKeys.add(key)
              dedupedEvents.push(ev)
            }

            const map = new Map<string, RotaEvent[]>()
            for (const ev of dedupedEvents) {
              const rawEventDate = (ev as any).event_date as string | undefined
              let dateStr: string | null = null

              if (rawEventDate) {
                dateStr = rawEventDate.slice(0, 10)
              } else if (ev?.date) {
                dateStr = ev.date.slice(0, 10)
              } else if ((ev as any)?.start_at) {
                dateStr = new Date((ev as any).start_at).toISOString().slice(0, 10)
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
