import type { WeeklyMetrics } from '@/lib/data/getWeeklyMetrics'

export type BehaviorSummary = {
  text: string
}

/**
 * Generate a behavior summary from metrics history
 * Analyzes trends and changes between weeks
 */
export function getBehaviorSummary(metricsHistory: WeeklyMetrics[]): BehaviorSummary {
  // metricsHistory could be last 2–4 weeks, most recent first
  if (!metricsHistory.length) {
    return { text: 'Not enough data to analyze behavior yet.' }
  }

  const [latest, ...past] = metricsHistory

  // Simple deltas vs previous week if available
  const prev = past[0]

  const delta = (a?: number | null, b?: number | null) =>
    a != null && b != null ? a - b : null

  const sleepDelta = delta(latest.avgSleepHours, prev?.avgSleepHours)
  const bodyDelta = delta(latest.avgBodyClock, prev?.avgBodyClock)
  const recDelta = delta(latest.avgRecovery, prev?.avgRecovery)
  const stepsDelta = delta(latest.avgSteps, prev?.avgSteps)
  const caloriesDelta = delta(latest.avgCalories, prev?.avgCalories)

  const lines: string[] = []

  lines.push(
    `Latest week averages: sleep=${latest.avgSleepHours ?? 'n/a'}h, bodyClock=${latest.avgBodyClock ?? 'n/a'}, recovery=${latest.avgRecovery ?? 'n/a'}, steps=${latest.avgSteps ?? 'n/a'}, calories=${latest.avgCalories ?? 'n/a'}.`
  )

  if (prev) {
    lines.push('Changes vs previous week:')

    if (sleepDelta != null) {
      lines.push(`- Sleep: ${sleepDelta >= 0 ? '+' : ''}${sleepDelta.toFixed(1)}h`)
    }
    if (bodyDelta != null) {
      lines.push(`- Body Clock Score: ${bodyDelta >= 0 ? '+' : ''}${bodyDelta.toFixed(1)}`)
    }
    if (recDelta != null) {
      lines.push(`- Recovery Score: ${recDelta >= 0 ? '+' : ''}${recDelta.toFixed(1)}`)
    }
    if (stepsDelta != null) {
      lines.push(`- Steps: ${stepsDelta >= 0 ? '+' : ''}${Math.round(stepsDelta)}`)
    }
    if (caloriesDelta != null) {
      lines.push(
        `- Calories: ${caloriesDelta >= 0 ? '+' : ''}${Math.round(caloriesDelta)} kcal`
      )
    }
  }

  return { text: lines.join('\n') }
}

