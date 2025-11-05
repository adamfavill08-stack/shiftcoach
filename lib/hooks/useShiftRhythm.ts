import { useEffect, useState, useRef } from 'react'

type ShiftRhythmScore = {
  date: string
  sleep_score: number
  regularity_score: number
  shift_pattern_score: number
  recovery_score: number
  total_score: number
}

/**
 * Hook to fetch shift rhythm score
 * GET /api/shift-rhythm automatically calculates if missing
 * 
 * @param onScoreChange - Callback when score changes significantly (>10 points)
 */
export function useShiftRhythm(onScoreChange?: (change: number, newScore: number) => void) {
  const [score, setScore] = useState<ShiftRhythmScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const previousScoreIdRef = useRef<string | null>(null)
  const inFlightRef = useRef(false)
  const lastFetchRef = useRef(0)

  const fetchScore = async () => {
    try {
      const now = Date.now()
      if (inFlightRef.current) return
      if (now - lastFetchRef.current < 5000) return // throttle within 5s
      inFlightRef.current = true
      lastFetchRef.current = now
      console.log('[useShiftRhythm] fetching score...')
      setLoading(true)
      setError(null)
      
      const res = await fetch('/api/shift-rhythm')

      if (!res.ok) {
        // If 500, log warning but don't crash
        if (res.status === 500) {
          const errorData = await res.json().catch(() => ({}))
          console.warn('[useShiftRhythm] Server error:', errorData.error || res.status)
          setError('Unable to load score')
          setScore(null)
          setLoading(false)
          return
        }
        
        console.error('[useShiftRhythm] Failed to fetch:', res.status)
        setError('Failed to load score')
        setScore(null)
        setLoading(false)
        return
      }

      const data = await res.json()
      const newScore = data.score ?? null
      const yesterdayScore = data.yesterdayScore ?? null
      
      setScore(newScore)
      
      // Check for significant score change (>10 points) compared to yesterday
      if (newScore && yesterdayScore !== null) {
        const change = newScore.total_score - yesterdayScore
        if (Math.abs(change) > 10 && onScoreChange) {
          // Only trigger once per score update
          const scoreId = `${newScore.date}-${newScore.total_score}-${change > 0 ? 'up' : 'down'}`
          const lastChangeId = previousScoreIdRef.current
          
          if (lastChangeId !== scoreId) {
            onScoreChange(change, newScore.total_score)
            previousScoreIdRef.current = scoreId
          }
        }
      }
    } catch (err) {
      console.error('[useShiftRhythm] Error:', err)
      setError('Network error')
      setScore(null)
    } finally {
      setLoading(false)
      inFlightRef.current = false
    }
  }

  useEffect(() => {
    let isCancelled = false
    const run = async () => {
      if (!isCancelled) await fetchScore()
    }
    run()
    const interval = setInterval(() => { if (!isCancelled) fetchScore() }, 5 * 60 * 1000)
    return () => { isCancelled = true; clearInterval(interval) }
  }, [])

  const total = score?.total_score ?? null

  return { score, total, loading, error, refetch: fetchScore }
}

