export const CIRCADIAN_ANCHOR_HOUR = 3

const DEBT_ACCUMULATE_RATE         = 0.18
const DEBT_DECAY_RATE              = 0.03
const MISALIGNMENT_NEUTRAL_LOW     = 1.0
const MISALIGNMENT_NEUTRAL_HIGH    = 2.0
const ROTATING_SHIFT_DEBT_FLOOR    = 8

export interface CircadianDebtInput {
  historicalMidpointOffsets: number[]
  currentDebt: number
  isRotatingShiftWorker: boolean
}

export interface CircadianDebtResult {
  debt: number
  trend: 'improving' | 'stable' | 'worsening'
  daysToHalfDebt: number | null
  message: string
}

export function computeCircadianDebt(input: CircadianDebtInput): CircadianDebtResult {
  const { historicalMidpointOffsets, currentDebt, isRotatingShiftWorker } = input
  const todayOffset = historicalMidpointOffsets.at(-1) ?? 0
  const absOffset   = Math.abs(todayOffset)

  let delta: number
  let trend: CircadianDebtResult['trend']

  if (absOffset > MISALIGNMENT_NEUTRAL_HIGH) {
    delta = (absOffset - MISALIGNMENT_NEUTRAL_HIGH) * DEBT_ACCUMULATE_RATE
    trend = 'worsening'
  } else if (absOffset < MISALIGNMENT_NEUTRAL_LOW) {
    delta = -DEBT_DECAY_RATE
    trend = currentDebt > 5 ? 'improving' : 'stable'
  } else {
    delta = 0
    trend = 'stable'
  }

  const floor = isRotatingShiftWorker ? ROTATING_SHIFT_DEBT_FLOOR : 0
  const debt  = Math.min(100, Math.max(floor, Math.round((currentDebt + delta) * 10) / 10))
  const daysToHalfDebt = debt > 10 ? Math.round(debt / 2 / DEBT_DECAY_RATE) : null

  return { debt, trend, daysToHalfDebt, message: buildDebtMessage(debt, trend, daysToHalfDebt) }
}

function buildDebtMessage(debt: number, trend: CircadianDebtResult['trend'], daysToHalf: number | null): string {
  if (debt < 10) return 'Your body clock is well aligned.'
  if (debt < 30) return trend === 'improving'
    ? 'Mild circadian debt — improving with recent consistency.'
    : 'Mild circadian debt. Keep sleep timing stable to recover.'
  if (debt < 60) return daysToHalf
    ? `Moderate circadian debt. ~${daysToHalf} consistent days to halve it.`
    : 'Moderate circadian debt. Consistent sleep timing will help.'
  return 'High circadian debt from sustained misalignment. Recovery takes weeks of consistent behaviour.'
}

export function applyDebtPenalty(regularityScore: number, debt: number): number {
  const penalty = (debt / 100) * 40
  return Math.max(0, Math.round(regularityScore - penalty))
}

export function isRotatingShiftWorker(recentShiftLabels: Array<string | null>): boolean {
  const distinct = new Set(recentShiftLabels.filter(Boolean).map((l) => l!.toLowerCase().trim()))
  return distinct.size > 1
}
