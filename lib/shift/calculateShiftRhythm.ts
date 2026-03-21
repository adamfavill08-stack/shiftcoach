import type { SupabaseClient } from '@supabase/supabase-js'

// Clamp helper
const clamp = (num: number, min: number, max: number) =>
  Math.min(Math.max(num, min), max)

// Map helper
function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin)
}

export type ShiftRhythmScore = {
  date: string
  sleep_score: number
  regularity_score: number
  shift_pattern_score: number
  recovery_score: number
  total_score: number
}

/**
 * Calculate Shift Rhythm Score for a user
 * Combines sleep length & timing, regularity, shift pattern load, and recovery quality
 */
export async function calculateShiftRhythm(
  supabase: SupabaseClient,
  userId: string
): Promise<ShiftRhythmScore> {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  // 1️⃣ Fetch recent sleep data (last 7 days)
  const { data: sleepData } = await supabase
    .from('sleep_logs')
    .select('sleep_hours, start_ts, end_ts, quality')
    .eq('user_id', userId)
    .gte('start_ts', sevenDaysAgo)
    .order('start_ts', { ascending: false })

  // Calculate sleep hours from sleep_hours column or compute from timestamps
  const sleepDataWithHours = (sleepData || []).map((s) => {
    let hours = s.sleep_hours
    if (hours == null && s.start_ts && s.end_ts) {
      // Fallback: compute from timestamps
      const durationMs = new Date(s.end_ts).getTime() - new Date(s.start_ts).getTime()
      hours = durationMs / 3600000
    }
    return {
      ...s,
      sleep_hours: hours ?? 0,
    }
  })

  const todaySleep = sleepDataWithHours[0] // Most recent sleep
  const avgSleep =
    sleepDataWithHours.length > 0
      ? sleepDataWithHours.reduce((sum, s) => sum + s.sleep_hours, 0) / sleepDataWithHours.length
      : 0

  // 2️⃣ Sleep Length & Timing (0-30 pts)
  let sleepScore = clamp((avgSleep / 8) * 30, 0, 30)

  // Check sleep timing (start time)
  if (todaySleep?.start_ts) {
    const startTime = new Date(todaySleep.start_ts)
    const startHour = startTime.getHours()

    // Good timing: 10 PM - 2 AM (22-23, 0-2)
    if ((startHour >= 22 || startHour <= 2) && startHour !== 23) {
      sleepScore += 5
    }
    // Poor timing: 10 AM - 3 PM (daytime sleep)
    if (startHour >= 10 && startHour <= 15) {
      sleepScore -= 5
    }
  }

  sleepScore = clamp(sleepScore, 0, 30)

  // 3️⃣ Regularity (0-25 pts) - std deviation of bedtimes
  let regularityScore: number
  if (sleepDataWithHours.length > 2) {
    const bedHours = sleepDataWithHours
      .map((s) => {
        if (!s.start_ts) return null
        const startTime = new Date(s.start_ts)
        return startTime.getHours() + startTime.getMinutes() / 60
      })
      .filter((h): h is number => h !== null)

    if (bedHours.length > 1) {
      const mean = bedHours.reduce((sum, h) => sum + h, 0) / bedHours.length
      const variance =
        bedHours.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / bedHours.length
      const stdDev = Math.sqrt(variance)

      // Lower stdDev = more regular = higher score
      // Map stdDev 0-3 hours to score 25-0
      regularityScore = clamp(mapRange(stdDev, 0, 3, 25, 0), 0, 25)
    } else {
      regularityScore = 15 // Default if not enough data
    }
  } else {
    regularityScore = 15 // Default if not enough data
  }

  // 4️⃣ Shift Pattern Load (0-25 pts) - flip detection
  // Fetch shifts from last 7 days
  const { data: shiftData } = await supabase
    .from('shifts')
    .select('label, start_ts, date')
    .eq('user_id', userId)
    .gte('date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
    .order('date', { ascending: true })

  const flips = (() => {
    if (!shiftData || shiftData.length < 2) return 0

    let count = 0
    for (let i = 1; i < shiftData.length; i++) {
      const prev = shiftData[i - 1].label
      const curr = shiftData[i].label

      // Count transitions between different shift types
      if (prev && curr && prev !== curr) {
        count++
      }
    }

    return count
  })()

  // More flips = lower score
  // Each flip costs 5 points, max 25 points
  const shiftPatternScore = clamp(25 - flips * 5, 0, 25)

  // 5️⃣ Recovery Quality (0-20 pts)
  // Get sleep quality from most recent sleep
  const quality = todaySleep?.quality ?? 3 // Default to 3/5 if not available

  // Try to get recovery score from engine (if available)
  // For now, we'll use sleep quality as a proxy
  let recoveryScore = (quality / 5) * 15 // 0-15 based on quality

  // Check for excessive naps (if we have nap data)
  // For now, we'll assume no nap data and adjust based on sleep quality
  // If quality is low, assume recovery is poor
  if (quality <= 2) {
    recoveryScore -= 5
  }

  recoveryScore = clamp(recoveryScore, 0, 20)

  // Calculate total score
  const total = Math.round(
    sleepScore + regularityScore + shiftPatternScore + recoveryScore
  )

  return {
    date: today,
    sleep_score: Math.round(sleepScore),
    regularity_score: Math.round(regularityScore),
    shift_pattern_score: Math.round(shiftPatternScore),
    recovery_score: Math.round(recoveryScore),
    total_score: total,
  }
}

