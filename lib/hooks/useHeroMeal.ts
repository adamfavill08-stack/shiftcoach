import { useCallback, useEffect, useState } from 'react'

export type HeroMeal = {
  id: string
  label: string
  suggestedTime: string
  calories: number
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  healthScore: number // 0–10
}

export function useHeroMeal() {
  const [heroMeal, setHeroMeal] = useState<HeroMeal | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/meals/hero')
      if (!res.ok) {
        setHeroMeal(null)
        setImageUrl(null)
        setError(`Failed: ${res.status}`)
        return
      }
      const json = await res.json()
      setHeroMeal(json.heroMeal ?? null)
      setImageUrl(json.imageUrl ?? null)
    } catch (e: any) {
      setError(e?.message || 'Network error')
      setHeroMeal(null)
      setImageUrl(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return { heroMeal, imageUrl, loading, error, refresh: fetchData }
}


