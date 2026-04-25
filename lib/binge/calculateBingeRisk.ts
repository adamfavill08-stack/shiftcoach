import { isoLocalDate } from '@/lib/shifts'
import { addCalendarDaysToYmd } from '@/lib/sleep/utils'

/**
 * Calculate binge risk score for shift workers
 * 
 * Factors considered:
 * - Sleep duration and quality
 * - Sleep debt accumulation
 * - Shift pattern (night shifts, quick turnarounds)
 * - Meal timing and fasting windows
 * - Circadian misalignment
 * - Time of day context
 */

export type BingeRiskLevel = 'low' | 'medium' | 'high'

export type BingeRiskResult = {
  score: number // 0-100
  level: BingeRiskLevel
  drivers: string[]
  explanation: string
}

type SleepData = {
  date: string
  start: string
  end: string
  durationHours: number
  quality: number | null
}

type ShiftData = {
  date: string
  type: 'night' | 'day' | 'off' | 'morning' | 'afternoon'
}

type MealData = {
  logged_at: string
  calories: number
}

type BingeRiskInputs = {
  // Last 7 days of sleep
  sleepLogs: SleepData[]
  // Last 7 days of shifts
  shifts: ShiftData[]
  // Last 7 days of meals
  meals: MealData[]
  // Current time context
  now: Date
  // Circadian data (optional)
  circadianPhase?: number
  sleepDebtHours?: number
  shiftLagScore?: number
  // Today's activity level (optional)
  activityLevel?: 'very_light' | 'light' | 'moderate' | 'busy' | 'intense' | null
}

export function calculateBingeRisk(inputs: BingeRiskInputs): BingeRiskResult {
  const { sleepLogs, shifts, meals, now, circadianPhase, sleepDebtHours, shiftLagScore, activityLevel } = inputs
  
  // If we have essentially no behavioural data yet, return a safe, low-risk baseline
  const hasSleepData = sleepLogs && sleepLogs.length > 0
  const hasShiftData = shifts && shifts.length > 0
  const hasMealData = meals && meals.length > 0
  const hasDebtOrLag = (sleepDebtHours ?? 0) > 0 || shiftLagScore !== undefined

  // If there's no recent sleep logged at all, always treat risk as baseline low,
  // even if old debt/lag numbers exist in the database.
  if (!hasSleepData) {
    return {
      score: 5,
      level: 'low',
      drivers: ['Not enough sleep, shift or meal data yet'],
      explanation:
        'Binge risk stays low until we have a few days of sleep, shift and meal data. Log your rota and sleep to unlock personalised binge-risk coaching.',
    }
  }

  let totalScore = 0
  const drivers: string[] = []

  // 1. SLEEP FACTORS (0-40 points)
  const lastSleep = sleepLogs[0] // Most recent sleep
  const lastSleepHours = lastSleep?.durationHours ?? 0
  const lastSleepQuality = lastSleep?.quality ?? null
  
  // Sleep duration scoring
  if (lastSleepHours < 4) {
    totalScore += 40
    drivers.push(`Very low sleep (${formatHours(lastSleepHours)})`)
  } else if (lastSleepHours < 5) {
    totalScore += 35
    drivers.push(`Low sleep (${formatHours(lastSleepHours)})`)
  } else if (lastSleepHours < 6) {
    totalScore += 25
    drivers.push(`Low sleep (${formatHours(lastSleepHours)})`)
  } else if (lastSleepHours < 7) {
    totalScore += 15
    if (!drivers.some(d => d.includes('sleep'))) {
      drivers.push(`Moderate sleep (${formatHours(lastSleepHours)})`)
    }
  }

  // Sleep quality impact
  if (lastSleepQuality !== null && lastSleepQuality < 3) {
    totalScore += 10
    if (!drivers.some(d => d.includes('quality'))) {
      drivers.push('Poor sleep quality')
    }
  }

  // Sleep debt impact
  if (sleepDebtHours !== undefined && sleepDebtHours > 0) {
    if (sleepDebtHours > 14) {
      totalScore += 20
      drivers.push(`High sleep debt (${sleepDebtHours.toFixed(1)}h)`)
    } else if (sleepDebtHours > 7) {
      totalScore += 12
      drivers.push(`Sleep debt (${sleepDebtHours.toFixed(1)}h)`)
    } else if (sleepDebtHours > 3) {
      totalScore += 6
    }
  }

  // 2. SHIFT PATTERN FACTORS (0-30 points)
  const today = isoLocalDate(now)
  const currentShift = shifts.find(s => s.date === today)
  const isNightShift = currentShift?.type === 'night'
  const isAfterNightShift = checkIfJustFinishedNightShift(shifts, now)
  
  // Night shift impact
  if (isNightShift) {
    totalScore += 25
    drivers.push('Night shift')
  } else if (isAfterNightShift) {
    totalScore += 20
    drivers.push('Post-night shift')
  }

  // Quick turnaround detection (check last 3 days)
  const recentShifts = shifts.slice(0, 3)
  const hasQuickTurnaround = checkQuickTurnaround(recentShifts, sleepLogs)
  if (hasQuickTurnaround) {
    totalScore += 15
    drivers.push('Quick shift turnaround')
  }

  // Long shift detection (12+ hours - approximate from shift type)
  // This is a simplified check - in production, use actual shift start/end times
  if (currentShift && currentShift.type !== 'off') {
    // Assume night shifts are often 12h+
    if (currentShift.type === 'night') {
      totalScore += 8
    }
  }

  // 2.5. ACTIVITY LEVEL FACTORS (0-15 points)
  // High physical demand increases binge risk due to stress, fatigue, and missed meals
  if (activityLevel) {
    if (activityLevel === 'intense') {
      totalScore += 15
      if (!drivers.some(d => d.includes('Intense') || d.includes('activity'))) {
        drivers.push('Intense shift (high physical demand)')
      }
    } else if (activityLevel === 'busy') {
      totalScore += 10
      if (!drivers.some(d => d.includes('Busy') || d.includes('activity'))) {
        drivers.push('Busy shift (elevated activity)')
      }
    } else if (activityLevel === 'moderate') {
      totalScore += 5
    }
    // very_light and light don't add to binge risk
  }

  // 3. MEAL TIMING FACTORS (0-20 points)
  // Only apply meal-related penalties when meal logging data exists.
  // This keeps the score credible in apps where meals are not currently logged.
  const hasMealLogs = meals.length > 0
  const lastMeal = hasMealLogs ? meals[0] : null
  if (lastMeal) {
    const lastMealTime = new Date(lastMeal.logged_at)
    const hoursSinceLastMeal = (now.getTime() - lastMealTime.getTime()) / (1000 * 60 * 60)
    
    if (hoursSinceLastMeal > 16) {
      totalScore += 20
      drivers.push(`Very long fasting window (${Math.round(hoursSinceLastMeal)}h)`)
    } else if (hoursSinceLastMeal > 14) {
      totalScore += 15
      drivers.push(`Long fasting window (${Math.round(hoursSinceLastMeal)}h)`)
    } else if (hoursSinceLastMeal > 12) {
      totalScore += 10
      drivers.push(`Extended fasting (${Math.round(hoursSinceLastMeal)}h)`)
    }

    // Eating during biological night (12am-6am)
    const lastMealHour = new Date(lastMeal.logged_at).getHours()
    if (lastMealHour >= 0 && lastMealHour < 6) {
      totalScore += 8
      drivers.push('Eating during biological night')
    }
  }

  // 4. CIRCADIAN ALIGNMENT (0-10 points)
  if (circadianPhase !== undefined && circadianPhase < 50) {
    totalScore += 8
    drivers.push('Circadian misalignment')
  }

  if (shiftLagScore !== undefined && shiftLagScore > 50) {
    totalScore += 6
    if (!drivers.some(d => d.includes('misalignment'))) {
      drivers.push('High shift lag')
    }
  }

  // 5. AWAKE-DURATION PROGRESSION (0-18 points)
  // Binge risk should rise through prolonged wakefulness as fatigue/decision control worsen.
  const hoursAwake = getHoursAwakeFromMostRecentSleep(sleepLogs, now)
  if (hoursAwake !== null) {
    let awakePenalty = 0
    if (hoursAwake >= 18) {
      awakePenalty = 18
    } else if (hoursAwake >= 16) {
      awakePenalty = 14
    } else if (hoursAwake >= 14) {
      awakePenalty = 11
    } else if (hoursAwake >= 12) {
      awakePenalty = 8
    } else if (hoursAwake >= 10) {
      awakePenalty = 5
    } else if (hoursAwake >= 8) {
      awakePenalty = 3
    }

    // Night-shift wake windows tend to extend late into biological night; increase progression slightly.
    if ((isNightShift || isAfterNightShift) && hoursAwake >= 12) {
      awakePenalty += 2
    }

    totalScore += awakePenalty

    if (hoursAwake >= 12) {
      drivers.push(`Long awake window (${Math.round(hoursAwake)}h awake)`)
    }
  }

  // 6. TIME OF DAY CONTEXT (0-6 points)
  // Keep a smaller time-of-day bump as secondary context.
  const currentHour = now.getHours()
  if (currentHour >= 22 || currentHour < 2) {
    totalScore += 6
  } else if (currentHour >= 20 || currentHour < 4) {
    totalScore += 4
  } else if (currentHour >= 18) {
    totalScore += 2
  }

  // Clamp score to 0-100
  const finalScore = Math.min(Math.max(totalScore, 0), 100)

  // Determine level
  let level: BingeRiskLevel = 'low'
  if (finalScore >= 70) {
    level = 'high'
  } else if (finalScore >= 30) {
    level = 'medium'
  }

  // Generate explanation
  const explanation = generateExplanation(finalScore, level, drivers, lastSleepHours, isNightShift)

  return {
    score: finalScore,
    level,
    drivers: drivers.slice(0, 3), // Top 3 drivers
    explanation
  }
}

function getHoursAwakeFromMostRecentSleep(sleepLogs: SleepData[], now: Date): number | null {
  const lastSleep = sleepLogs[0]
  if (!lastSleep?.end) return null
  const end = new Date(lastSleep.end)
  if (Number.isNaN(end.getTime())) return null
  const diffHours = (now.getTime() - end.getTime()) / (1000 * 60 * 60)
  if (!Number.isFinite(diffHours) || diffHours < 0) return null
  return diffHours
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) {
    return `${h}h`
  }
  return `${h}h ${m}m`
}

function checkIfJustFinishedNightShift(shifts: ShiftData[], now: Date): boolean {
  const yesterdayStr = addCalendarDaysToYmd(isoLocalDate(now), -1)
  
  const yesterdayShift = shifts.find(s => s.date === yesterdayStr)
  if (yesterdayShift?.type === 'night') {
    // Check if it's within 12 hours of shift end (approximate)
    const hoursSinceMidnight = now.getHours() + now.getMinutes() / 60
    return hoursSinceMidnight < 12 // Morning hours after night shift
  }
  return false
}

function checkQuickTurnaround(recentShifts: ShiftData[], sleepLogs: SleepData[]): boolean {
  // Simplified: check if there are consecutive shifts with <12h gap
  // In production, use actual shift start/end times
  if (recentShifts.length < 2) return false
  
  // Check if sleep between shifts is very short
  const recentSleep = sleepLogs.slice(0, 2)
  const hasShortSleep = recentSleep.some(s => s.durationHours < 6)
  
  return hasShortSleep && recentShifts[0].type !== 'off' && recentShifts[1].type !== 'off'
}

function generateExplanation(
  score: number,
  level: BingeRiskLevel,
  drivers: string[],
  lastSleepHours: number,
  isNightShift: boolean
): string {
  if (level === 'high') {
    if (isNightShift) {
      return `You're at high risk of overeating tonight. You got ${formatHours(lastSleepHours)} sleep and you're on nights. Eat every 3-4 hours to avoid bingeing.`
    }
    // Check if main driver is about meals or sleep
    const mainDriver = drivers[0] || ''
    if (mainDriver.includes('fasting') || mainDriver.includes('meal')) {
      return `High risk tonight. You slept ${formatHours(lastSleepHours)} and haven't eaten in a while. Have a meal now, then another in 3-4 hours.`
    }
    return `High risk tonight. You slept ${formatHours(lastSleepHours)} and ${mainDriver.toLowerCase()}. Eat every 3-4 hours today.`
  } else if (level === 'medium') {
    const mainIssue = drivers[0] || 'You need to watch your eating'
    // Simplify driver text
    let simpleIssue = mainIssue
    if (mainIssue.includes('sleep')) {
      simpleIssue = "You're short on sleep"
    } else if (mainIssue.includes('fasting') || mainIssue.includes('meal')) {
      simpleIssue = "Long gap since last meal"
    } else if (mainIssue.includes('debt')) {
      simpleIssue = "You're building sleep debt"
    } else if (mainIssue.includes('shift')) {
      simpleIssue = "Your shift pattern is tough"
    }
    return `Moderate risk. ${simpleIssue}. Eat every 4-5 hours today.`
  } else {
    return `Low risk. You're doing well. Keep eating regularly and getting enough sleep.`
  }
}

