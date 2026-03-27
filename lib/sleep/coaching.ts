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

export function getShiftAwareInsight(input: ShiftCoachingInput): string {
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
    if (shiftLabel === 'NIGHT') {
      return 'Start with your post-shift sleep block to give the app a reliable recovery signal for this night-shift day.'
    }
    return 'Start with your main sleep block or a recovery nap to improve today\'s body clock signal.'
  }

  if (sleepDebtMinutes != null && sleepDebtMinutes >= 120) {
    if (shiftLabel === 'NIGHT') {
      return 'You are carrying meaningful sleep debt before or after a night shift. Prioritize a protected recovery sleep block.'
    }
    return 'You are carrying meaningful sleep debt. Prioritize recovery sleep before your next demanding shift.'
  }

  if (primaryMinutes <= 0 && napMinutes > 0) {
    return 'You have only logged naps so far. Add your main sleep block to improve guidance accuracy.'
  }

  if (shiftLabel === 'NIGHT' && dominantType === 'post_shift_sleep') {
    return 'Post-shift sleep is doing most of the work today. Keep logging it consistently after night shifts.'
  }

  if (circadianAlignment === 'poor') {
    if (shiftLabel === 'NIGHT') {
      return 'Your post-shift sleep timing looks off your rota. A more consistent daytime sleep window may improve recovery.'
    }
    return 'Your sleep timing looks off your usual rhythm. A more consistent main sleep window may improve recovery.'
  }

  if (sourceSummary === 'manual') {
    return 'Manual logging is active. Connecting a wearable can improve stage estimates and sync freshness.'
  }

  if (totalMinutes >= targetMinutes) {
    if (shiftLabel === 'NIGHT') {
      return 'You have met your target for this night-shift day. Keep logging to maintain accurate recovery guidance.'
    }
    return 'You have met your target for this shifted day. Keep logging to maintain accurate recovery guidance.'
  }

  if (shiftLabel === 'NIGHT') {
    return 'A short pre-shift nap or longer post-shift recovery sleep could help close today\'s gap.'
  }

  return 'A short nap or added recovery sleep could help close today\'s gap.'
}
