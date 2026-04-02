import { useEffect, useState, useRef } from 'react'
import type { FatigueRiskResult } from '@/lib/fatigue/calculateFatigueRisk'
import { authedFetch } from '@/lib/supabase/authedFetch'

type ShiftRhythmScore = {
  date: string
  sleep_score: number
  regularity_score: number
  shift_pattern_score: number
  recovery_score: number
  nutrition_score: number | null
  activity_score: number | null
  meal_timing_score: number | null
  total_score: number
}

type SocialJetlag = {
  currentMisalignmentHours: number
  weeklyAverageMisalignmentHours?: number
  category: "low" | "moderate" | "high"
  explanation: string
  baselineMidpointClock?: number
  currentMidpointClock?: number
} | null

type BingeRisk = {
  score: number
  level: "low" | "medium" | "high"
  drivers: string[]
  explanation: string
} | null

type SleepDeficit = {
  weeklyDeficit: number
  category: 'surplus' | 'low' | 'medium' | 'high'
} | null

/**
 * Hook to fetch shift rhythm score
 * GET /api/shift-rhythm automatically calculates if missing
 * 
 * @param onScoreChange - Callback when score changes significantly (>10 points)
 */
export function useShiftRhythm(onScoreChange?: (change: number, newScore: number) => void) {
  const [score, setScore] = useState<ShiftRhythmScore | null>(null)
  const [sleepDeficit, setSleepDeficit] = useState<SleepDeficit>(null)
  const [socialJetlag, setSocialJetlag] = useState<SocialJetlag>(null)
  const [bingeRisk, setBingeRisk] = useState<BingeRisk>(null)
  const [fatigueRisk, setFatigueRisk] = useState<FatigueRiskResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasData, setHasData] = useState<boolean>(true)
  const previousScoreIdRef = useRef<string | null>(null)
  const inFlightRef = useRef(false)
  const lastFetchRef = useRef(0)

  const fetchScore = async (force = false) => {
    try {
      const now = Date.now()
      if (inFlightRef.current && !force) return
      if (now - lastFetchRef.current < 5000 && !force) return // throttle within 5s (unless forced)
      inFlightRef.current = true
      lastFetchRef.current = now
      setLoading(true)
      setError(null)
      
      const url = force ? '/api/shift-rhythm?force=true' : '/api/shift-rhythm'
      const res = await authedFetch(url)

      if (!res.ok) {
        // During app boot/auth transitions the session cookie may not be ready yet.
        // Treat auth errors as a transient no-data state instead of a hard failure log.
        if (res.status === 401 || res.status === 403) {
          setError(null)
          setScore(null)
          setSleepDeficit(null)
          setSocialJetlag(null)
          setBingeRisk(null)
          setFatigueRisk(null)
          setLoading(false)
          return
        }

        // If 500, log warning but don't crash
        if (res.status === 500) {
          const errorData = await res.json().catch(() => ({}))
          console.warn('[useShiftRhythm] Server error:', errorData.error || res.status)
          setError('Unable to load score')
          setScore(null)
          setSleepDeficit(null)
          setSocialJetlag(null)
          setBingeRisk(null)
          setFatigueRisk(null)
          setLoading(false)
          return
        }
        
        console.error('[useShiftRhythm] Failed to fetch:', res.status)
        setError('Failed to load score')
        setScore(null)
        setSleepDeficit(null)
        setSocialJetlag(null)
        setBingeRisk(null)
        setFatigueRisk(null)
        setLoading(false)
        return
      }

      const data = await res.json()
      const newScore = data.score ?? null
      const yesterdayScore = data.yesterdayScore ?? null
      const deficitValue = data.sleepDeficit ?? null
      const hasRhythmData = data.hasRhythmData
      const socialJetlagValue: SocialJetlag = data.socialJetlag ?? null
      const bingeRiskValue: BingeRisk = data.bingeRisk ?? null
      const fatigueRiskValue: FatigueRiskResult | null = data.fatigueRisk ?? null
      
      setScore(newScore)
      setSleepDeficit(deficitValue)
      if (typeof hasRhythmData === 'boolean') {
        setHasData(hasRhythmData)
      }
      setSocialJetlag(socialJetlagValue)
      setBingeRisk(bingeRiskValue)
      setFatigueRisk(fatigueRiskValue)
      
      // Check for significant score change (>1 point on 0-10 scale) compared to yesterday
      if (newScore && yesterdayScore !== null) {
        const change = newScore.total_score - yesterdayScore
        if (Math.abs(change) > 1 && onScoreChange) {
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
      setSleepDeficit(null)
      setSocialJetlag(null)
      setBingeRisk(null)
      setFatigueRisk(null)
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
    return () => { isCancelled = true }
  }, [])

  const total = score?.total_score ?? null

  const refetch = (force = false) => fetchScore(force)

  return { score, total, loading, error, refetch, sleepDeficit, hasData, socialJetlag, bingeRisk, fatigueRisk }
}

