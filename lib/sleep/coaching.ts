import type { SleepType } from '@/lib/sleep/types'

type ShiftCoachingInput = {
  shiftLabel: string
  totalMinutes: number
  targetMinutes: number
  primaryMinutes: number
  napMinutes: number
  dominantType: SleepType | null
  sourceSummary: 'none' | 'manual' | 'wearable' | 'mixed'
  sleepDebtMinutes: number | null
  circadianAlignment: 'good' | 'ok' | 'poor' | null
}

/** i18n key for `sleepInsight.*` messages in language-provider. */
export function getShiftAwareInsightKey(input: ShiftCoachingInput): string {
  const {
    shiftLabel,
    totalMinutes,
    targetMinutes,
    primaryMinutes,
    napMinutes,
    dominantType,
    sourceSummary,
    sleepDebtMinutes,
    circadianAlignment,
  } = input

  if (totalMinutes <= 0) {
    if (shiftLabel === 'NIGHT') return 'sleepInsight.nightEmpty'
    return 'sleepInsight.defaultEmpty'
  }

  if (sleepDebtMinutes != null && sleepDebtMinutes >= 120) {
    if (shiftLabel === 'NIGHT') return 'sleepInsight.nightDebt'
    return 'sleepInsight.defaultDebt'
  }

  if (primaryMinutes <= 0 && napMinutes > 0) {
    return 'sleepInsight.onlyNaps'
  }

  if (shiftLabel === 'NIGHT' && dominantType === 'post_shift_sleep') {
    return 'sleepInsight.postShiftDominant'
  }

  if (circadianAlignment === 'poor') {
    if (shiftLabel === 'NIGHT') return 'sleepInsight.poorNight'
    return 'sleepInsight.poorDefault'
  }

  if (sourceSummary === 'manual') {
    return 'sleepInsight.manualSource'
  }

  if (totalMinutes >= targetMinutes) {
    if (shiftLabel === 'NIGHT') return 'sleepInsight.targetNight'
    return 'sleepInsight.targetDefault'
  }

  if (shiftLabel === 'NIGHT') {
    return 'sleepInsight.gapNight'
  }

  return 'sleepInsight.gapDefault'
}

/** @deprecated Use getShiftAwareInsightKey + t() for localized copy. */
export function getShiftAwareInsight(input: ShiftCoachingInput): string {
  const key = getShiftAwareInsightKey(input)
  const fallbacks: Record<string, string> = {
    'sleepInsight.nightEmpty':
      'Start with your post-shift sleep block to give the app a reliable recovery signal for this night-shift day.',
    'sleepInsight.defaultEmpty':
      "Start with your main sleep block or a recovery nap to improve today's body clock signal.",
    'sleepInsight.nightDebt':
      'You are carrying meaningful sleep debt before or after a night shift. Prioritize a protected recovery sleep block.',
    'sleepInsight.defaultDebt':
      'You are carrying meaningful sleep debt. Prioritize recovery sleep before your next demanding shift.',
    'sleepInsight.onlyNaps':
      'You have only logged naps so far. Add your main sleep block to improve guidance accuracy.',
    'sleepInsight.postShiftDominant':
      'Post-shift sleep is doing most of the work today. Keep logging it consistently after night shifts.',
    'sleepInsight.poorNight':
      'Your post-shift sleep timing looks off your rota. A more consistent daytime sleep window may improve recovery.',
    'sleepInsight.poorDefault':
      'Your sleep timing looks off your usual rhythm. A more consistent main sleep window may improve recovery.',
    'sleepInsight.manualSource':
      'Manual logging is active. Connecting a wearable can improve stage estimates and sync freshness.',
    'sleepInsight.targetNight':
      'You have met your target for this night-shift day. Keep logging to maintain accurate recovery guidance.',
    'sleepInsight.targetDefault':
      'You have met your target for this shifted day. Keep logging to maintain accurate recovery guidance.',
    'sleepInsight.gapNight':
      "A short pre-shift nap or longer post-shift recovery sleep could help close today's gap.",
    'sleepInsight.gapDefault': "A short nap or added recovery sleep could help close today's gap.",
  }
  return fallbacks[key] ?? ''
}
