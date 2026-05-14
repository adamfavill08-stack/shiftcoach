import type { ShiftRelativeSleepAnalysis } from '@/lib/sleep/shiftRelativeSleepClassification'
import { isNightLikeInstant } from '@/lib/sleep/sleepShiftWallClock'
import type { ShiftInstant } from '@/lib/sleep/nightShiftSleepPlan'

function formatNextShort(next: ShiftInstant | null, timeZone: string): string {
  if (!next) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(next.startMs))
  } catch {
    return ''
  }
}

/**
 * i18n key + params for the recovery-status body under the headline state.
 * Keys live under `sleepPlan.shiftRelative.recoveryExplainer.*` (same namespace as classification / recovery state).
 */
export function resolveLogSleepRecoveryExplainer(
  analysis: ShiftRelativeSleepAnalysis,
  timeZone: string,
): { key: string; params: Record<string, string> } {
  const tz = (timeZone ?? 'UTC').trim() || 'UTC'
  const { recoveryState, features, upcomingWork } = analysis
  const nextNight = upcomingWork != null && isNightLikeInstant(upcomingWork, tz)
  const nextSnippet = formatNextShort(upcomingWork, tz)
  const params: Record<string, string> = {}
  if (nextSnippet) params.next = nextSnippet

  if (features.quickTurnaroundPrevNext) {
    return { key: 'sleepPlan.shiftRelative.recoveryExplainer.quickTurnaround', params }
  }

  if (recoveryState === 'reset_mode') {
    return { key: 'sleepPlan.shiftRelative.recoveryExplainer.reset_mode', params }
  }

  if (recoveryState === 'recovery_needed') {
    if (nextNight && nextSnippet) {
      return { key: 'sleepPlan.shiftRelative.recoveryExplainer.recovery_needed_next_night', params }
    }
    return { key: 'sleepPlan.shiftRelative.recoveryExplainer.recovery_needed_generic', params }
  }

  if (recoveryState === 'a_little_short') {
    return { key: 'sleepPlan.shiftRelative.recoveryExplainer.a_little_short', params }
  }

  return {
    key: nextSnippet
      ? 'sleepPlan.shiftRelative.recoveryExplainer.on_track_next'
      : 'sleepPlan.shiftRelative.recoveryExplainer.on_track_generic',
    params,
  }
}
