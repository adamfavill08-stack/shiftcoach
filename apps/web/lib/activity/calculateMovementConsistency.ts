/**
 * Calculate movement consistency for shift workers
 * Works with both manual entry and wearable data
 * Ready for future wearable device integration
 */

export type DailyActivityData = {
  date: string // YYYY-MM-DD
  steps: number
  activeMinutes: number | null
  source?: 'manual' | 'apple' | 'fitbit' | 'google' | 'garmin' | 'other'
  shiftType?: 'day' | 'night' | 'off' | 'other'
}

export type MovementConsistencyResult = {
  consistencyScore: number // 0-100
  weeklyAverageSteps: number
  weeklyAverageActiveMinutes: number | null
  dailyData: Array<{
    date: string
    dayLabel: string // 'M', 'T', 'W', etc.
    steps: number
    activeMinutes: number | null
    percentageOfAverage: number // How this day compares to weekly average
    hasData: boolean
    source?: string
  }>
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data'
  insights: string[]
}

/**
 * Calculate movement consistency score
 * Lower variance = higher consistency
 */
function calculateConsistencyScore(values: number[]): number {
  if (values.length < 2) return 0

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)

  // For steps: lower stdDev relative to mean = higher consistency
  // Map to 0-100 score
  // If stdDev is 0, score is 100 (perfect consistency)
  // If stdDev is > 50% of mean, score is lower
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 1
  
  // Score: 100 - (CV * 50), clamped to 0-100
  // CV of 0 = 100 score
  // CV of 2.0 = 0 score
  const score = Math.max(0, Math.min(100, Math.round(100 - (coefficientOfVariation * 50))))
  
  return score
}

/**
 * Get day label for a date
 */
function getDayLabel(date: Date): string {
  const day = date.getDay() // 0 = Sunday, 1 = Monday, etc.
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  return labels[day]
}

/**
 * Calculate movement consistency from weekly activity data
 */
export function calculateMovementConsistency(
  weeklyData: DailyActivityData[]
): MovementConsistencyResult {
  // Sort by date (oldest first)
  const sortedData = [...weeklyData].sort((a, b) => 
    a.date.localeCompare(b.date)
  )

  // Get last 7 days (or available days)
  const last7Days = sortedData.slice(-7)

  // Calculate weekly averages
  const stepsValues = last7Days.map(d => d.steps).filter(s => s > 0)
  const activeMinutesValues = last7Days
    .map(d => d.activeMinutes)
    .filter((m): m is number => m !== null && m > 0)

  const weeklyAverageSteps = stepsValues.length > 0
    ? Math.round(stepsValues.reduce((sum, s) => sum + s, 0) / stepsValues.length)
    : 0

  const weeklyAverageActiveMinutes = activeMinutesValues.length > 0
    ? Math.round(activeMinutesValues.reduce((sum, m) => sum + m, 0) / activeMinutesValues.length)
    : null

  // Calculate consistency score from steps (primary metric)
  const consistencyScore = stepsValues.length >= 2
    ? calculateConsistencyScore(stepsValues)
    : 0

  // Build daily data with day labels
  const today = new Date()
  const dailyData = last7Days.map((dayData, index) => {
    const date = new Date(dayData.date)
    const dayLabel = getDayLabel(date)
    const percentageOfAverage = weeklyAverageSteps > 0
      ? (dayData.steps / weeklyAverageSteps) * 100
      : 0

    return {
      date: dayData.date,
      dayLabel,
      steps: dayData.steps,
      activeMinutes: dayData.activeMinutes,
      percentageOfAverage,
      hasData: dayData.steps > 0 || (dayData.activeMinutes !== null && dayData.activeMinutes > 0),
      source: dayData.source,
    }
  })

  // If we don't have 7 days, fill in missing days
  if (dailyData.length < 7) {
    const existingDates = new Set(dailyData.map(d => d.date))
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 6) // 7 days ago

    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(startDate)
      checkDate.setDate(startDate.getDate() + i)
      const dateStr = checkDate.toISOString().slice(0, 10)

      if (!existingDates.has(dateStr)) {
        const dayLabel = getDayLabel(checkDate)
        dailyData.push({
          date: dateStr,
          dayLabel,
          steps: 0,
          activeMinutes: null,
          percentageOfAverage: 0,
          hasData: false,
          source: undefined,
        })
      }
    }

    // Re-sort by date
    dailyData.sort((a, b) => a.date.localeCompare(b.date))
  }

  // Determine trend (last 3 days vs first 3 days)
  let trend: 'improving' | 'stable' | 'declining' | 'insufficient_data' = 'insufficient_data'
  if (stepsValues.length >= 6) {
    const firstHalf = stepsValues.slice(0, Math.floor(stepsValues.length / 2))
    const secondHalf = stepsValues.slice(Math.floor(stepsValues.length / 2))
    const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length
    const change = ((secondAvg - firstAvg) / firstAvg) * 100

    if (change > 10) trend = 'improving'
    else if (change < -10) trend = 'declining'
    else trend = 'stable'
  } else if (stepsValues.length >= 2) {
    trend = 'stable'
  }

  // Generate insights
  const insights: string[] = []
  
  if (consistencyScore >= 80) {
    insights.push('Your movement patterns are very consistent this week.')
  } else if (consistencyScore >= 60) {
    insights.push('Your movement is fairly consistent, with some variation.')
  } else if (consistencyScore >= 40) {
    insights.push('Your movement patterns vary quite a bit this week.')
  } else {
    insights.push('Your movement is inconsistent. Consider establishing a more regular routine.')
  }

  if (trend === 'improving') {
    insights.push('Your activity is trending upward this week.')
  } else if (trend === 'declining') {
    insights.push('Your activity has decreased this week.')
  }

  // Check for shift-specific patterns
  const shiftTypes = last7Days.map(d => d.shiftType).filter((t): t is 'day' | 'night' | 'off' | 'other' => !!t)
  if (shiftTypes.length > 0) {
    const uniqueShifts = new Set(shiftTypes)
    if (uniqueShifts.size > 1) {
      insights.push('Activity varies across different shift types, which is normal for shift workers.')
    }
  }

  return {
    consistencyScore,
    weeklyAverageSteps,
    weeklyAverageActiveMinutes,
    dailyData,
    trend,
    insights,
  }
}

