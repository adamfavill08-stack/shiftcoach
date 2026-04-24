// ─── ShiftCoach Circadian Engine v2 ───────────────────────────────
// Separation of concerns:
//   circadianAlignment = sleep midpoint vs 03:00 biological anchor
//   fatigueScore       = sleep duration + debt + consistency
// Both are needed but must not be conflated.
// ─────────────────────────────────────────────────────────────────

export type ShiftType = "morning" | "day" | "evening" | "night" | "rotating"

export interface CircadianInput {
  sleepStart:         Date
  sleepEnd:           Date
  avgBedtime:         number   // minutes from midnight
  avgWakeTime:        number   // minutes from midnight
  bedtimeVariance:    number   // minutes std deviation
  sleepDurationHours: number
  sleepDebtHours:     number
  shiftType:          ShiftType
  currentHour?:       number   // 0–24 decimal, defaults to now
}

export interface CircadianOutput {
  // ── Circadian alignment ──────────────────────────────────────
  misalignmentHours:  number   // raw hours from 03:00 anchor
  bodyClockHour:      number   // where body clock sits right now (0–24)
  alignmentScore:     number   // 0–100 purely circadian alignment

  // ── Alertness phase ──────────────────────────────────────────
  alertnessScore:     number   // 0–100 current alertness
  alertnessPhase:     "PEAK" | "ELEVATED" | "MODERATE" | "LOW"
  nextTroughHour:     number   // next trough in actual clock time
  nextPeakHour:       number   // next peak in actual clock time

  // ── Fatigue (separate from circadian) ────────────────────────
  fatigueScore:       number   // 0–100 sleep quality composite

  // ── Legacy — kept for backward compat with circadian_logs ────
  circadianPhase:     number   // alias for alignmentScore
  factors: {
    latestShift:      number
    sleepDuration:    number
    sleepTiming:      number
    sleepDebt:        number
    inconsistency:    number
  }
}

// ─── Constants ────────────────────────────────────────────────────
const IDEAL_MIDPOINT_MIN = 3 * 60 // 03:00 — human core temp nadir

// Expected sleep midpoint per shift type (minutes from midnight)
// Night workers sleeping at 09:00 have LOW contextual misalignment
// even though they're far from 03:00
const SHIFT_EXPECTED_MIDPOINT: Record<ShiftType, number> = {
  morning:  3 * 60,   // 03:00
  day:      3 * 60,   // 03:00
  evening:  5 * 60,   // 05:00
  night:    9 * 60,   // 09:00 — daytime sleep expected
  rotating: 5 * 60,   // 05:00
}

// Two-process alertness model (Borbély)
// Peaks ~10:00 and ~19:00, troughs ~03:30 and ~14:00
function circadianAlertnessAtHour(h: number): number {
  h = ((h % 24) + 24) % 24
  const main  = Math.sin((2 * Math.PI * (h - 10)) / 24)
  const ultra = 0.38 * Math.sin((2 * Math.PI * (h - 6)) / 12)
  return Math.max(6, Math.min(96, 50 + 30 * main + 11 * ultra))
}

function alertnessPhaseLabel(
  score: number
): "PEAK" | "ELEVATED" | "MODERATE" | "LOW" {
  if (score >= 70) return "PEAK"
  if (score >= 55) return "ELEVATED"
  if (score >= 40) return "MODERATE"
  return "LOW"
}

function nextTroughFromHour(bodyClockH: number, actualH: number): number {
  const troughs = [3.5, 14]
  const misalign = actualH - bodyClockH
  for (const t of troughs) {
    const actualTrough = ((t + misalign) % 24 + 24) % 24
    if (actualTrough > actualH) return actualTrough
  }
  return ((troughs[0] + misalign) % 24 + 24) % 24 + 24
}

function nextPeakFromHour(bodyClockH: number, actualH: number): number {
  const peaks = [10, 19]
  const misalign = actualH - bodyClockH
  for (const p of peaks) {
    const actualPeak = ((p + misalign) % 24 + 24) % 24
    if (actualPeak > actualH) return actualPeak
  }
  return ((peaks[0] + misalign) % 24 + 24) % 24 + 24
}

// ─── Main engine ──────────────────────────────────────────────────
export function calculateCircadianPhase(
  input: CircadianInput
): CircadianOutput {
  const {
    sleepStart,
    sleepEnd,
    avgBedtime,
    avgWakeTime,
    bedtimeVariance,
    sleepDurationHours,
    sleepDebtHours,
    shiftType,
  } = input

  const now = new Date()
  const currentHour =
    input.currentHour ?? now.getHours() + now.getMinutes() / 60

  // ── 1. Sleep midpoint vs biological anchor ─────────────────────
  const midpointMs  = (sleepStart.getTime() + sleepEnd.getTime()) / 2
  const midpointMin = ((midpointMs / (1000 * 60)) % 1440 + 1440) % 1440

  // Raw deviation from 03:00 — this IS the misalignment
  let rawDeviation = Math.abs(midpointMin - IDEAL_MIDPOINT_MIN)
  rawDeviation     = Math.min(rawDeviation, 1440 - rawDeviation)
  const misalignmentHours = rawDeviation / 60

  // Contextualised deviation — relative to expected midpoint for shift type
  // A night worker sleeping at 09:00 is well aligned FOR THEIR SHIFT
  // even though they're 6h from the biological 03:00 anchor
  const expectedMidpoint = SHIFT_EXPECTED_MIDPOINT[shiftType]
  let contextDeviation   = Math.abs(midpointMin - expectedMidpoint)
  contextDeviation       = Math.min(contextDeviation, 1440 - contextDeviation)
  const contextHours     = contextDeviation / 60

  // Alignment score from contextualised deviation
  // 0h = 100, 1h ≈ 89, 2h ≈ 78, 4h ≈ 56, 6h+ floors at 34
  const alignmentScore = Math.max(20, Math.min(100, 100 - contextHours * 11))

  // ── 2. Body clock hour ─────────────────────────────────────────
  // Signed offset: how far actual midpoint is from 03:00
  // Positive = sleeping later than ideal → body clock behind
  let midpointOffset = midpointMin - IDEAL_MIDPOINT_MIN
  if (midpointOffset >  720) midpointOffset -= 1440
  if (midpointOffset < -720) midpointOffset += 1440
  const bodyClockOffset = midpointOffset / 60
  const bodyClockHour   = ((currentHour - bodyClockOffset) % 24 + 24) % 24

  // ── 3. Alertness phase ─────────────────────────────────────────
  const alertnessScore = circadianAlertnessAtHour(bodyClockHour)
  const alertnessPhase = alertnessPhaseLabel(alertnessScore)
  const nextTroughHour = nextTroughFromHour(bodyClockHour, currentHour)
  const nextPeakHour   = nextPeakFromHour(bodyClockHour, currentHour)

  // ── 4. Fatigue score (separate from circadian) ─────────────────
  const sleepDurationScore =
    sleepDurationHours >= 7 ?  12 :
    sleepDurationHours >= 6 ?   4 : -8

  const sleepTimingScore =
    misalignmentHours <= 1 ?  12 :
    misalignmentHours <= 2 ?   4 : -8

  const sleepDebtScore =
    sleepDebtHours <= 2 ?  8 :
    sleepDebtHours <= 5 ?  0 : -12

  const inconsistencyPenalty =
    bedtimeVariance < 30  ?   0 :
    bedtimeVariance < 60  ?  -5 :
    bedtimeVariance < 120 ? -10 : -15

  const fatigueScore = Math.max(0, Math.min(100,
    50 + sleepDurationScore + sleepTimingScore +
    sleepDebtScore + inconsistencyPenalty
  ))

  // ── 5. Legacy factors (backward compat with circadian_logs) ────
  const shiftEffectLegacy: Record<ShiftType, number> = {
    morning: +10, day: 0, evening: -5, night: -15, rotating: -12,
  }

  return {
    misalignmentHours:  Math.round(misalignmentHours * 10) / 10,
    bodyClockHour:      Math.round(bodyClockHour * 100) / 100,
    alignmentScore:     Math.round(alignmentScore),
    alertnessScore:     Math.round(alertnessScore),
    alertnessPhase,
    nextTroughHour:     Math.round(nextTroughHour * 100) / 100,
    nextPeakHour:       Math.round(nextPeakHour * 100) / 100,
    fatigueScore:       Math.round(fatigueScore),
    circadianPhase:     Math.round(alignmentScore),
    factors: {
      latestShift:   shiftEffectLegacy[shiftType],
      sleepDuration: sleepDurationScore,
      sleepTiming:   sleepTimingScore,
      sleepDebt:     sleepDebtScore,
      inconsistency: inconsistencyPenalty,
    },
  }
}

