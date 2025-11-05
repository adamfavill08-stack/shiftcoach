import type { SupabaseClient } from '@supabase/supabase-js'
import { computeToday } from '@/lib/engine'
import { isoLocalDate } from '@/lib/shifts'
import type { Profile } from '@/lib/profile'

function utcDayRange() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

export type UserMetrics = {
  bodyClockScore: number | null
  sleepHoursLast24: number | null
  recoveryScore: number | null
  shiftType: string | null
  adjustedCalories: number | null
  steps: number | null
  moodScore: number | null // 1-5
  focusScore: number | null // 1-5
}

/**
 * Get current user metrics for AI Coach context
 * Fetches profile, computes engine output, and gets latest data
 */
export async function getUserMetrics(
  userId: string,
  supabase: SupabaseClient
): Promise<UserMetrics> {
  try {
    
    // Get profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (!profileData) {
      return {
        bodyClockScore: null,
        sleepHoursLast24: null,
        recoveryScore: null,
        shiftType: null,
        adjustedCalories: null,
        steps: null,
        moodScore: null,
        focusScore: null,
      }
    }

    const profile = profileData as Profile

    // Compute engine output (gives us body clock, recovery, adjusted calories)
    // Note: computeToday uses client-side Supabase, but it should work in server context
    // as long as the profile has the user_id set correctly
    let bodyClockScore: number | null = null
    let recoveryScore: number | null = null
    let adjustedCalories: number | null = null

    try {
      // Ensure profile has user_id for computeToday
      if (profile.user_id === userId) {
        const engineOutput = await computeToday(profile)
        bodyClockScore = engineOutput.rhythm_score
        recoveryScore = engineOutput.recovery_score
        adjustedCalories = engineOutput.adjusted_kcal
      }
    } catch (engineError) {
      console.error('[/api/coach] Error computing engine:', engineError)
      // Continue with null values - engine computation is optional
    }

    // Get latest sleep (last 24 hours)
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    const { data: recentSleep } = await supabase
      .from('sleep_logs')
      .select('duration_min, start_ts, end_ts')
      .eq('user_id', userId)
      .gte('end_ts', yesterday.toISOString())
      .order('end_ts', { ascending: false })
      .limit(5)

    let sleepHoursLast24: number | null = null
    if (recentSleep && recentSleep.length > 0) {
      const totalMinutes = recentSleep.reduce((sum, s) => sum + (s.duration_min || 0), 0)
      sleepHoursLast24 = Math.round((totalMinutes / 60) * 10) / 10 // Round to 1 decimal
    }

    // Get today's shift
    const todayISO = isoLocalDate(new Date())
    const { data: todayShift } = await supabase
      .from('shifts')
      .select('label, start_ts, end_ts')
      .eq('user_id', userId)
      .eq('date', todayISO)
      .maybeSingle()

    let shiftType: string | null = null
    if (todayShift) {
      shiftType = todayShift.label || null
      // If no label, classify from times
      if (!shiftType && todayShift.start_ts && todayShift.end_ts) {
        const start = new Date(todayShift.start_ts)
        const startH = start.getHours()
        if (startH >= 18 || startH < 8) shiftType = 'NIGHT'
        else if (startH >= 12) shiftType = 'LATE'
        else shiftType = 'DAY'
      }
    }

    // Get steps (for now, return null - TODO: wire real steps data)
    // Steps might be in daily_metrics or a separate steps table
    const steps: number | null = null // TODO: implement when steps tracking is available

    // Get latest mood and focus scores
    const { startISO } = utcDayRange()
    const { data: moodLog } = await supabase
      .from('mood_logs')
      .select('mood, focus')
      .eq('user_id', userId)
      .gte('ts', startISO)
      .order('ts', { ascending: false })
      .limit(1)
      .maybeSingle()

    const moodScore = moodLog?.mood ?? null
    const focusScore = moodLog?.focus ?? null

    return {
      bodyClockScore,
      sleepHoursLast24,
      recoveryScore,
      shiftType,
      adjustedCalories,
      steps,
      moodScore,
      focusScore,
    }
  } catch (error) {
    console.error('[/api/coach] Error fetching user metrics:', error)
    // Return all nulls on error
    return {
      bodyClockScore: null,
      sleepHoursLast24: null,
      recoveryScore: null,
      shiftType: null,
      adjustedCalories: null,
      steps: null,
      moodScore: null,
      focusScore: null,
    }
  }
}

