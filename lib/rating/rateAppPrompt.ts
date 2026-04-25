const STORAGE_KEY = 'shiftcoach_rate_app_prompt_v1'
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.shiftcoach.app'

type RatePromptState = {
  appOpenCount: number
  rated: boolean
  dismissed: boolean
  highlighted: boolean
}

const DEFAULT_STATE: RatePromptState = {
  appOpenCount: 0,
  rated: false,
  dismissed: false,
  highlighted: false,
}

function readState(): RatePromptState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<RatePromptState>
    return {
      appOpenCount:
        typeof parsed.appOpenCount === 'number' ? parsed.appOpenCount : 0,
      rated: !!parsed.rated,
      dismissed: !!parsed.dismissed,
      highlighted: !!parsed.highlighted,
    }
  } catch {
    return DEFAULT_STATE
  }
}

function writeState(next: RatePromptState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function trackAppOpenForRatingPrompt() {
  if (typeof window === 'undefined') return
  const state = readState()
  if (state.rated || state.dismissed) return

  const nextCount = state.appOpenCount + 1
  const highlighted = state.highlighted || nextCount >= 5
  writeState({
    ...state,
    appOpenCount: nextCount,
    highlighted,
  })
}

export function shouldHighlightRateAction(): boolean {
  const state = readState()
  return state.highlighted && !state.rated && !state.dismissed
}

export function markRateActionCompleted() {
  const state = readState()
  writeState({
    ...state,
    rated: true,
    highlighted: false,
  })
}

export function dismissRatePrompt() {
  const state = readState()
  writeState({
    ...state,
    dismissed: true,
    highlighted: false,
  })
}

export function getPlayStoreUrl(): string {
  return PLAY_STORE_URL
}
