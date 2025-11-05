import { useEffect, useState } from 'react'

export type SleepHistoryEntry = {
  id: string
  date: string | null
  start_ts: string
  end_ts: string
  sleep_hours: number | null
  quality: number | null
  naps: number | null
  created_at?: string
}

export function useSleepHistory() {
  const [items, setItems] = useState<SleepHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/sleep/history')

      if (!res.ok) {
        console.error('[useSleepHistory] failed status:', res.status)
        setItems([])
        return
      }

      const data = await res.json()
      console.log('[useSleepHistory] response:', data)
      // Prefer `items`, but be defensive in case shape changes
      setItems(data.items ?? data.logs ?? [])
    } catch (err) {
      console.error('[useSleepHistory] error:', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  return { items, loading, setItems, refetch: fetchHistory }
}

