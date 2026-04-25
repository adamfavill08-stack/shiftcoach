const MS_PER_DAY = 24 * 60 * 60 * 1000
const PROMPT_INTERVAL_DAYS = 7

export const IN_APP_REVIEW_FIRST_OPEN_MS_KEY = 'shiftcoach_in_app_review_first_open_ms'
export const IN_APP_REVIEW_LAST_PROMPT_MS_KEY = 'shiftcoach_in_app_review_last_prompt_ms'

export type InAppReviewEligibilityInput = {
  nowMs: number
  firstOpenMs: number | null
  lastPromptMs: number | null
}

function readMs(storage: Storage, key: string): number | null {
  const raw = storage.getItem(key)
  if (raw == null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function writeMs(storage: Storage, key: string, ms: number) {
  storage.setItem(key, String(ms))
}

/** Ensures first-open timestamp exists (set once). */
export function touchFirstOpen(storage: Storage, nowMs: number) {
  if (readMs(storage, IN_APP_REVIEW_FIRST_OPEN_MS_KEY) == null) {
    writeMs(storage, IN_APP_REVIEW_FIRST_OPEN_MS_KEY, nowMs)
  }
}

/**
 * Eligible after PROMPT_INTERVAL_DAYS from first open, then every PROMPT_INTERVAL_DAYS
 * since the last time we successfully invoked the native review flow.
 */
export function computeInAppReviewEligibility(input: InAppReviewEligibilityInput): boolean {
  const { nowMs, firstOpenMs, lastPromptMs } = input
  if (firstOpenMs == null) return false
  if (nowMs - firstOpenMs < PROMPT_INTERVAL_DAYS * MS_PER_DAY) return false
  if (lastPromptMs != null && nowMs - lastPromptMs < PROMPT_INTERVAL_DAYS * MS_PER_DAY) {
    return false
  }
  return true
}

export function markInAppReviewPrompted(storage: Storage, nowMs: number) {
  writeMs(storage, IN_APP_REVIEW_LAST_PROMPT_MS_KEY, nowMs)
}

export async function maybeRequestInAppReview(
  requestReview: () => Promise<unknown>,
  storage: Storage = typeof window !== 'undefined' ? window.localStorage : (null as unknown as Storage),
): Promise<boolean> {
  if (typeof window === 'undefined' || !storage) return false

  const now = Date.now()
  touchFirstOpen(storage, now)

  const firstOpenMs = readMs(storage, IN_APP_REVIEW_FIRST_OPEN_MS_KEY)
  const lastPromptMs = readMs(storage, IN_APP_REVIEW_LAST_PROMPT_MS_KEY)

  if (!computeInAppReviewEligibility({ nowMs: now, firstOpenMs, lastPromptMs })) {
    return false
  }

  try {
    await requestReview()
    markInAppReviewPrompted(storage, Date.now())
    return true
  } catch {
    return false
  }
}
