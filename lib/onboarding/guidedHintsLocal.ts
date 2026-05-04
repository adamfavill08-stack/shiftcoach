/**
 * Fallback when profile columns are missing (migration not applied) or update fails.
 * TODO: remove localStorage path once onboarding hint columns are deployed everywhere.
 */
const LS_KEY = 'shiftcoach:guidedHints:v1'

export type GuidedHintsLocalState = {
  onboarding_hints_enabled: boolean | null
  onboarding_hints_completed: boolean
  onboarding_step: number
}

const defaultState: GuidedHintsLocalState = {
  onboarding_hints_enabled: null,
  onboarding_hints_completed: false,
  onboarding_step: 0,
}

export function readGuidedHintsLocal(): GuidedHintsLocalState {
  if (typeof window === 'undefined') return defaultState
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw) as Partial<GuidedHintsLocalState>
    return {
      onboarding_hints_enabled:
        parsed.onboarding_hints_enabled === true ||
        parsed.onboarding_hints_enabled === false
          ? parsed.onboarding_hints_enabled
          : null,
      onboarding_hints_completed: Boolean(parsed.onboarding_hints_completed),
      onboarding_step:
        typeof parsed.onboarding_step === 'number' && parsed.onboarding_step >= 0
          ? Math.min(4, Math.floor(parsed.onboarding_step))
          : 0,
    }
  } catch {
    return defaultState
  }
}

export function writeGuidedHintsLocal(next: Partial<GuidedHintsLocalState>) {
  if (typeof window === 'undefined') return
  try {
    const prev = readGuidedHintsLocal()
    const merged: GuidedHintsLocalState = { ...prev, ...next }
    window.localStorage.setItem(LS_KEY, JSON.stringify(merged))
  } catch {
    // ignore
  }
}
