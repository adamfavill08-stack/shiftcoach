/**
 * Copy for body-clock UI panels driven by circadianState (+ optional shift context).
 */
import type { CircadianState } from '@/lib/circadian/calculateCircadianScore'
import type { UserShiftState } from '@/lib/shift-agent/types'

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function formatWeekdayLocal(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long' })
}

export function buildForecastRecoveryLine(forecast: CircadianState['forecast']): string {
  const d = forecast.recoveryDays
  if (forecast.tomorrow >= 75) {
    return 'You’re already at or near a 75+ trajectory tomorrow if sleep stays steady.'
  }
  if (d <= 0) {
    return 'With aligned sleep from tonight, you could reach 75+ very quickly — keep midpoints stable.'
  }
  if (d === 1) {
    return 'Back to 75+ in about 1 day if you align your sleep from tonight.'
  }
  return `Back to 75+ in about ${d} days if you align your sleep from tonight.`
}

/** Narrative when a rota transition is active and may affect circadian score. */
export function buildTransitionForecastNote(shift: UserShiftState | null): string | null {
  const at = shift?.activeTransition
  if (!at?.nextShiftStart) return null
  const day = formatWeekdayLocal(at.nextShiftStart)
  const to = String(at.to ?? '').toUpperCase()
  const from = String(at.from ?? '').toUpperCase()
  const toNight = to.includes('NIGHT')
  const toDay = to.includes('DAY') && !toNight

  if (toNight) {
    return `Your score may dip further when you flip to nights (${day}). Minimise it: bank sleep before the first night, cap late caffeine, and anchor one main meal after your night-sleep wake.`
  }
  if (toDay) {
    return `Moving onto days around ${day} can still stress your clock. Get bright outdoor light soon after waking and keep breakfast at a consistent time to pull earlier.`
  }
  if (from && to && from !== to) {
    return `You have a shift change landing ${day} (${from} → ${to}). Hold sleep timing as steady as you can around the flip to limit score drops.`
  }
  return null
}

function hoursFromIdealLabel(cs: CircadianState): string {
  const a = round1(Math.abs(cs.sleepMidpointOffset))
  return `${a} hour${a === 1 ? '' : 's'}`
}

function keyActionForLowScore(cs: CircadianState): string {
  const o = cs.sleepMidpointOffset
  if (o > 1) {
    return 'anchoring an earlier main sleep window (and morning bright light right after waking)'
  }
  if (o < -1) {
    return 'avoiding very early bedtimes and too much bright light late in the evening'
  }
  return 'keeping the same sleep midpoint for several nights in a row'
}

function hoursCloserToIdealVsYesterday(cs: CircadianState): number | null {
  const hist = [...cs.sleepMidpointHistory].sort((a, b) => a.date.localeCompare(b.date))
  if (hist.length < 2) return null
  const prev = hist[hist.length - 2]!
  const last = hist[hist.length - 1]!
  const gain = Math.abs(prev.offset) - Math.abs(last.offset)
  if (gain <= 0.05) return null
  return round1(gain)
}

function reinforcementForHighScore(cs: CircadianState): string {
  if (cs.sleepMidpointOffset > 0.5) {
    return 'Keep protecting morning light and a consistent first-breakfast time.'
  }
  if (cs.sleepMidpointOffset < -0.5) {
    return 'Keep dimming evenings and a steady wind-down so you don’t drift too early.'
  }
  return 'Keep the same sleep midpoint and meal anchors you’ve been using — they’re working.'
}

export function buildTodaysTakeaway(cs: CircadianState): string {
  const score = cs.score

  if (cs.adaptedPattern) {
    return 'Your body has adapted to your shift pattern. Your rhythm is stable for night work even though it differs from the biological ideal.'
  }

  if (score > 75) {
    return `Your body clock is syncing well with your shifts. ${reinforcementForHighScore(cs)}`
  }

  if (score < 30) {
    const ideal = hoursFromIdealLabel(cs)
    const action = keyActionForLowScore(cs)
    return `Your body clock is severely out of sync. Your sleep midpoint is ${ideal} from ideal. Focus on ${action} today.`
  }

  if (score >= 30 && score <= 55 && cs.trend === 'declining') {
    const n = cs.consecutiveMisalignedDays
    const streak =
      n > 0
        ? `${n} consecutive day${n === 1 ? '' : 's'} misaligned.`
        : 'Your alignment has been slipping recently.'
    const action = keyActionForLowScore(cs)
    return `Your rhythm is drifting further out of sync. ${streak} Key action: ${action}.`
  }

  if (score >= 30 && score <= 55 && cs.trend === 'improving') {
    const hrs = hoursCloserToIdealVsYesterday(cs)
    if (hrs != null) {
      return `You're recovering — about ${hrs} hour${hrs === 1 ? '' : 's'} closer to alignment than your prior night. Keep going.`
    }
    return "You're recovering — your last nights look better aligned. Keep the same sleep window and anchors."
  }

  if (cs.trend === 'improving') {
    return "You're moving in the right direction. Hold your sleep timing steady for a few more days."
  }
  if (cs.trend === 'declining') {
    return `Your alignment is slipping. ${keyActionForLowScore(cs)}`
  }

  return `Your alignment is moderate (${round1(score)}/100). ${keyActionForLowScore(cs)}`
}

function formatSleepMidpointOffsetLabel(offsetHours: number): string {
  const abs = Math.round(Math.abs(offsetHours) * 10) / 10
  if (abs < 0.05) return 'Near biological anchor (03:00)'
  if (offsetHours > 0) return `${abs} hour${abs === 1 ? '' : 's'} delayed`
  return `${abs} hour${abs === 1 ? '' : 's'} advanced`
}

/** Lines for the “Score factors” panel (body-clock page). */
export function buildCircadianScoreFactorRows(
  cs: CircadianState,
): { key: string; line: string }[] {
  const b = cs.scoreBreakdown
  const rows: { key: string; line: string }[] = [
    {
      key: 'mid',
      line: `Sleep midpoint offset: ${formatSleepMidpointOffsetLabel(cs.sleepMidpointOffset)} vs 03:00 anchor`,
    },
  ]
  if (b.driftPenalty > 0 && cs.consecutiveMisalignedDays > 0) {
    rows.push({
      key: 'drift',
      line: `${cs.consecutiveMisalignedDays} consecutive day${
        cs.consecutiveMisalignedDays === 1 ? '' : 's'
      } misaligned — drift penalty −${b.driftPenalty} pts`,
    })
  }
  if (b.recoveryBonus > 0) {
    rows.push({
      key: 'rec',
      line: `Recovery trajectory bonus +${b.recoveryBonus} pts`,
    })
  }
  if (b.shiftFitBonus > 0) {
    rows.push({
      key: 'fit',
      line: cs.adaptedPattern
        ? `Adapted pattern (stable timing ≥7d) +${b.shiftFitBonus} pts`
        : `Shift / timing fit +${b.shiftFitBonus} pts`,
    })
  }
  if (b.durationPenalty > 0) {
    const avg = cs.recentAvgSleepHours
    const avgBit =
      avg != null ? ` Recent main sleep ~${avg.toFixed(1)}h/night avg vs your goal.` : ''
    rows.push({
      key: 'dur',
      line: `Sleep amount vs goal −${b.durationPenalty} pts.${avgBit} Steady bedtimes still count, but short sleep caps how “aligned” we call the rhythm.`,
    })
  }
  if (b.wakeGapPenalty > 0) {
    const maxGap =
      b.maxInterSleepGapHours != null
        ? ` Longest stretch awake between sleeps ~${b.maxInterSleepGapHours}h.`
        : ''
    const recover =
      b.wakeGapDaysUntilClear != null && b.wakeGapDaysUntilClear > 0
        ? ` Normal awake windows for ${b.wakeGapDaysUntilClear} more consecutive day${
            b.wakeGapDaysUntilClear === 1 ? '' : 's'
          } to clear this.`
        : ''
    rows.push({
      key: 'wakegap',
      line: `Long awake gaps between sleeps −${b.wakeGapPenalty} pts.${maxGap}${recover}`,
    })
  }
  return rows
}

export function buildCircadianHabitBullets(cs: CircadianState): string[] {
  if (cs.adaptedPattern) {
    return [
      'Keep your current sleep midpoint within about 90 minutes day to day — small drifts add up on nights.',
      'Use the same “anchor” meal after main sleep (even if it’s your evening) to stabilise digestion and alertness.',
      'On back-to-back nights, avoid stacking extra caffeine in the last 4 hours before planned sleep.',
    ]
  }

  const o = cs.sleepMidpointOffset
  if (o > 0.5) {
    return [
      'Within an hour of waking, get 10–20 minutes of outdoor light (or a bright light box) — your clock is running late.',
      'Eat breakfast or your first meal within ~1 hour of that light to anchor daytime physiology.',
      'Tonight, dim screens 60–90 minutes before target sleep; avoid a heavy late-night meal that pushes sleep later.',
    ]
  }

  if (o < -0.5) {
    return [
      'Keep indoor lighting softer after sunset; your clock is early — extra evening light can delay sleep helpfully.',
      'Shift your last big meal a little later (without eating right before bed) so hunger doesn’t pull you earlier.',
      'If you wake too early, resist a bright-phone scroll; low light until your target wake time.',
    ]
  }

  return [
    'Hold your sleep midpoint steady for at least 3 nights — you’re close to the anchor.',
    'Match light to intent: brighter mornings, dimmer last hour before bed.',
    'Keep meal times within ~30 minutes day to day to support the same rhythm.',
  ]
}
