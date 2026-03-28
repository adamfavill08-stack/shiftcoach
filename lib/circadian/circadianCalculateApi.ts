import type { CircadianOutput } from './calcCircadianPhase'

/**
 * Contract for GET /api/circadian/calculate (see `app/api/circadian/calculate/route.ts`).
 *
 * - Trust payload only when `status === 'ok'` and `circadian` is non-null. Many 200 responses use
 *   `circadianUnavailable` (e.g. insufficient sleep) — not an HTTP error, but not authoritative biology.
 * - `source` is set when `status === 'ok'` (`cached_today` | `recalculated`). `sleepDebtAssumedZero`
 *   is set on recalculated success if sleep deficit could not be loaded and debt was taken as 0.
 * - Errors (5xx/503) also return `circadian: null` and `status: 'error'` when using helpers.
 * - Legacy deploys: if `status` is missing, fall back to `circadian ?? null` (old shape).
 * - In-app consumers: `app/(dashboard)/dashboard/page.tsx` (`fetchCircadian`),
 *   `components/dashboard/pages/AdjustedCaloriesPage.tsx` (energy card copy / `authoritativeCircadian`).
 */
export type CircadianCalculateStatus =
  | 'ok'
  | 'insufficient_data'
  | 'no_main_sleep'
  | 'invalid_sleep_timestamps'
  | 'error'

export type CircadianCalculateSource = 'cached_today' | 'recalculated'

export type CircadianCalculateResponseBody = {
  circadian: CircadianOutput | null
  status: CircadianCalculateStatus
  /** Detail when status !== 'ok' or for debugging */
  reason?: string
  source?: CircadianCalculateSource
  /** True when sleep debt helper failed and the engine used 0h debt */
  sleepDebtAssumedZero?: boolean
  /** Legacy mirror of `reason` for older clients */
  error?: string
}

export function circadianOk(
  circadian: CircadianOutput,
  source: CircadianCalculateSource,
  sleepDebtAssumedZero?: boolean
): CircadianCalculateResponseBody {
  return {
    circadian,
    status: 'ok',
    source,
    ...(sleepDebtAssumedZero ? { sleepDebtAssumedZero: true } : {}),
  }
}

export function circadianUnavailable(
  status: Exclude<CircadianCalculateStatus, 'ok'>,
  reason: string
): CircadianCalculateResponseBody {
  return {
    circadian: null,
    status,
    reason,
    error: reason,
  }
}
