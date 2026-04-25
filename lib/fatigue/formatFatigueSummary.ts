import type { FatigueRiskResult } from '@/lib/fatigue/calculateFatigueRisk'

type FormatFatigueSummaryInput = {
  score: number
  fatigueRisk?: FatigueRiskResult | null
}

export function formatFatigueSummary({ score, fatigueRisk }: FormatFatigueSummaryInput): string {
  const safeScore = Number.isFinite(score) ? score : 0
  const score100 = Math.max(0, Math.min(100, Math.round(safeScore)))

  const driverHint = `${fatigueRisk?.drivers?.join(' ') ?? ''} ${fatigueRisk?.explanation ?? ''}`.toLowerCase()
  const transitionSignal =
    driverHint.includes('transition') ||
    driverHint.includes('rotate') ||
    driverHint.includes('day to night') ||
    driverHint.includes('night to day') ||
    driverHint.includes('circadian')

  if (fatigueRisk?.confidenceLabel === 'low') {
    return 'Confidence builds as more sleep and shift data syncs.'
  }
  if (score100 >= 65 && transitionSignal) {
    return 'High transition strain from switching shift timing.'
  }
  if (score100 >= 65) {
    return 'High fatigue load - recovery is needed before peak performance.'
  }
  if (fatigueRisk?.drivers?.[0]) {
    return fatigueRisk.drivers[0]
  }
  return 'Rolling risk from fatigue and sleep rhythm.'
}

