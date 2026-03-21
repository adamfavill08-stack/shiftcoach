import { useEffect, useState } from 'react'

export type WeeklyGoals = {
  id: string
  week_start: string
  goals: string
  focus_area_sleep: boolean
  focus_area_steps: boolean
  focus_area_nutrition: boolean
  focus_area_mood: boolean
  focus_area_recovery: boolean
  created_at: string
}

export function useWeeklyGoals() {
  const [goals, setGoals] = useState<WeeklyGoals | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const res = await fetch('/api/weekly-goals/latest')
        if (!res.ok) {
          console.error('[useWeeklyGoals] Failed to fetch:', res.status)
          return
        }
        const data = await res.json()
        setGoals(data.goals ?? null)
      } catch (err) {
        console.error('[useWeeklyGoals] Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGoals()
  }, [])

  return { goals, loading }
}

