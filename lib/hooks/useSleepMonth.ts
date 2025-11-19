import { useCallback, useEffect, useState } from 'react'

type SleepLog = {
  id: string; start_at: string; end_at: string; minutes: number;
  kind: 'main'|'nap'; quality: number|null; notes: string|null;
}

export function useSleepMonth(month: number, year: number) {
  const [loading, setLoading] = useState(true)
  const [targetMin, setTargetMin] = useState(480)
  const [logs, setLogs] = useState<SleepLog[]>([])
  const [error, setError] = useState<string|null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/sleep/month?month=${month}&year=${year}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const json = await res.json()
      setTargetMin(json.targetMin)
      setLogs(json.logs || [])
      setError(null)
    } catch (e: any) {
      console.error('[useSleepMonth] failed', e)
      setError(e.message || 'failed')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { fetchData() }, [fetchData])

  return { loading, error, targetMin, logs, refresh: fetchData }
}

