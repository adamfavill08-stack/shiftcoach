import { useEffect, useState } from 'react'

export type WeeklySummary = {
  id: string
  week_start: string
  summary_text: string
  sleep_hours_avg: number | null
  body_clock_avg: number | null
  recovery_avg: number | null
  steps_avg: number | null
  calories_avg: number | null
  created_at: string
}

export function useWeeklySummary() {
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/weekly-summary/latest')
        if (!res.ok) {
          console.error('[useWeeklySummary] Failed to fetch:', res.status)
          return
        }
        const data = await res.json()
        setSummary(data.summary ?? null)
      } catch (err) {
        console.error('[useWeeklySummary] Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [])

  return { summary, loading }
}

