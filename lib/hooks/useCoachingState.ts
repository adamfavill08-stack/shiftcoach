import { useEffect, useState } from 'react'
import type { CoachingStateStatus } from '@/lib/coach/getCoachingState'

export type CoachingState = {
  status: CoachingStateStatus
  label: string
  summary: string
}

export function useCoachingState() {
  const [state, setState] = useState<CoachingState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/api/coach/state')
        if (!res.ok) {
          console.error('[useCoachingState] Failed to fetch:', res.status)
          return
        }
        const data = await res.json()
        setState(data)
      } catch (err) {
        console.error('[useCoachingState] Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchState()
  }, [])

  return { state, loading }
}

