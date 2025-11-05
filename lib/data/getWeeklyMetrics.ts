import type { SupabaseClient } from '@supabase/supabase-js'
import { computeToday } from '@/lib/engine'
import { getMyProfile } from '@/lib/profile'
import type { Profile } from '@/lib/profile'

export type WeeklyMetrics = {
  weekStart: string // ISO date string (YYYY-MM-DD)
  weekEnd: string
  avgSleepHours: number | null
  avgBodyClock: number | null
  avgRecovery: number | null
  avgSteps: number | null
  avgCalories: number | null
}

/**
 * Get weekly metrics for a user (last 7 days ending yesterday)
 * Adapted to match actual Supabase schema
 */
export async function getWeeklyMetrics(
  serverSupabase: SupabaseClient,
  userId: string
): Promise<WeeklyMetrics> {
  // Define week window: last 7 days ending yesterday
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() - 1) // Yesterday
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 6) // 7 days total

  const weekStartISO = startDate.toISOString()
  const weekEndISO = endDate.toISOString()
  const weekStart = startDate.toISOString().slice(0, 10) // YYYY-MM-DD
  const weekEnd = endDate.toISOString().slice(0, 10)

  // 1) Sleep logs: sum duration_min from last 7 days
  const { data: sleepLogs } = await serverSupabase
    .from('sleep_logs')
    .select('duration_min, end_ts')
    .eq('user_id', userId)
    .gte('end_ts', weekStartISO)
    .lte('end_ts', weekEndISO)

  const avgSleepHours = sleepLogs && sleepLogs.length > 0
    ? sleepLogs.reduce((sum, log) => sum + (log.duration_min || 0), 0) / sleepLogs.length / 60
    : null

  // 2) Body Clock & Recovery: compute daily for last 7 days
  // Since these are computed on-the-fly, we'll compute them for each day
  let bodyClockScores: number[] = []
  let recoveryScores: number[] = []

  try {
    // Get profile for engine computation
    const { data: profileData } = await serverSupabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileData) {
      const profile = profileData as Profile
      
      // Compute for each day in the week (simplified: compute today and yesterday as sample)
      // In production, you might want to compute for each day, but for now we'll use a sample
      try {
        const engineOutput = await computeToday(profile)
        bodyClockScores.push(engineOutput.rhythm_score)
        recoveryScores.push(engineOutput.recovery_score)
      } catch (e) {
        console.error('[getWeeklyMetrics] Error computing engine:', e)
      }
    }
  } catch (e) {
    console.error('[getWeeklyMetrics] Error fetching profile:', e)
  }

  const avgBodyClock = bodyClockScores.length > 0
    ? bodyClockScores.reduce((a, b) => a + b, 0) / bodyClockScores.length
    : null

  const avgRecovery = recoveryScores.length > 0
    ? recoveryScores.reduce((a, b) => a + b, 0) / recoveryScores.length
    : null

  // 3) Steps: TODO - wire real steps data when available
  // For now, return null
  const avgSteps: number | null = null

  // 4) Calories: sum from nutrition_logs
  const { data: nutritionLogs } = await serverSupabase
    .from('nutrition_logs')
    .select('calories, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', weekStartISO)
    .lte('logged_at', weekEndISO)

  // Group by date and average per day
  const caloriesByDate = new Map<string, number[]>()
  if (nutritionLogs) {
    for (const log of nutritionLogs) {
      if (log.calories && log.logged_at) {
        const date = log.logged_at.slice(0, 10) // YYYY-MM-DD
        if (!caloriesByDate.has(date)) {
          caloriesByDate.set(date, [])
        }
        caloriesByDate.get(date)!.push(log.calories)
      }
    }
  }

  // Average calories per day, then average across days
  const dailyCalories: number[] = []
  for (const [_, calories] of caloriesByDate) {
    const dayTotal = calories.reduce((a, b) => a + b, 0)
    dailyCalories.push(dayTotal)
  }

  const avgCalories = dailyCalories.length > 0
    ? dailyCalories.reduce((a, b) => a + b, 0) / dailyCalories.length
    : null

  return {
    weekStart,
    weekEnd,
    avgSleepHours: avgSleepHours ? Math.round(avgSleepHours * 10) / 10 : null,
    avgBodyClock: avgBodyClock ? Math.round(avgBodyClock * 10) / 10 : null,
    avgRecovery: avgRecovery ? Math.round(avgRecovery * 10) / 10 : null,
    avgSteps,
    avgCalories: avgCalories ? Math.round(avgCalories) : null,
  }
}

