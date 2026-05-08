/**
 * Contract for GET /api/wearables/heart-rate.
 * Clients must use `status === 'ok'` (and non-null heart metrics) as authoritative — not HTTP 200 alone.
 */

export type HeartRateApiStatus =
  | 'ok'
  | 'no_device'
  | 'no_recent_data'
  | 'insufficient_data'
  | 'error'

/** Outside-gap resting baseline (10th percentile) — `building` until enough spread + samples */
export type HeartBaselineStatus = 'ready' | 'building'

export type HeartMetrics = {
  resting_bpm: number | null
  avg_bpm: number | null
  recovery_delta_bpm: number | null
  sample_count: number
  window_start: string | null
  window_end: string | null
  /** Wearable sleep (e.g. Health Connect) overlapping the between-shift window, hours */
  sleep_hours_in_window?: number | null
  sleep_sessions_in_window?: number
  /** Resting estimate from ~14d outside the current gap (when enough samples) */
  baseline_resting_bpm?: number | null
  /** Window resting minus baseline; positive = higher than your usual */
  resting_vs_baseline_bpm?: number | null
  /** Combined sleep + HR vs baseline + spread */
  recovery_band?: 'low' | 'medium' | 'good' | null
  recovery_score?: number | null
  baseline_status?: HeartBaselineStatus
}

export type HeartWeeklyDay = {
  date: string
  resting_bpm: number | null
  avg_bpm: number | null
  recovery_delta_bpm: number | null
  sample_count: number
  /** Enough samples and time span to show that day’s row meaningfully */
  enough_data: boolean
}

export type HeartRateResponseBody = {
  status: HeartRateApiStatus
  reason?: string
  /** Legacy mirror for older clients */
  error?: string
  heart: HeartMetrics | null
  weeklyTrend: HeartWeeklyDay[] | null
  /** Human label, e.g. "Since your last shift" */
  sourceWindowLabel?: string
  /** Primary window used rolling 24h (no usable between-shift gap) */
  usedFallbackWindow?: boolean
  /** When status is ok — optional legacy fields */
  resting_bpm?: number
  avg_bpm?: number
  samples?: number
  source?: string
}

export function heartRateOk(
  heart: HeartMetrics,
  weeklyTrend: HeartWeeklyDay[] | null,
  extras?: {
    sourceWindowLabel?: string
    usedFallbackWindow?: boolean
    wearableSource?: string
  }
): HeartRateResponseBody {
  const resting = heart.resting_bpm
  const avg = heart.avg_bpm
  return {
    status: 'ok',
    heart,
    weeklyTrend,
    ...(extras?.sourceWindowLabel ? { sourceWindowLabel: extras.sourceWindowLabel } : {}),
    ...(extras?.usedFallbackWindow ? { usedFallbackWindow: true } : {}),
    ...(typeof resting === 'number' && typeof avg === 'number'
      ? {
          resting_bpm: resting,
          avg_bpm: avg,
          samples: heart.sample_count,
          source: extras?.wearableSource ?? 'wearable',
        }
      : {}),
  }
}

export function heartRateUnavailable(
  status: Exclude<HeartRateApiStatus, 'ok'>,
  reason: string,
  partial?: {
    heart?: HeartMetrics | null
    weeklyTrend?: HeartWeeklyDay[] | null
    usedFallbackWindow?: boolean
    sourceWindowLabel?: string
  }
): HeartRateResponseBody {
  return {
    status,
    reason,
    error: reason,
    heart: partial?.heart ?? null,
    weeklyTrend: partial?.weeklyTrend ?? null,
    ...(partial?.usedFallbackWindow ? { usedFallbackWindow: true } : {}),
    ...(partial?.sourceWindowLabel ? { sourceWindowLabel: partial.sourceWindowLabel } : {}),
  }
}
