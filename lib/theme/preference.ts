/** Settings theme preference — shared by ThemeProvider, appearance UI, and native Android bars. */

export const THEME_STORAGE_EVENT = 'shiftcoach-theme'
export const THEME_PREFERENCE_KEY = 'theme_preference'
/** Legacy localStorage key before `theme_preference`. */
export const THEME_LEGACY_STORAGE_KEY = 'theme'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function getStoredThemePreference(storage: Storage): ThemePreference {
  const saved = storage.getItem(THEME_PREFERENCE_KEY)
  if (isThemePreference(saved)) return saved

  const legacy = storage.getItem(THEME_LEGACY_STORAGE_KEY)
  if (legacy === 'dark' || legacy === 'light') return legacy

  return 'system'
}

export function resolveThemePreference(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === 'dark') return 'dark'
  if (preference === 'light') return 'light'
  return prefersDark ? 'dark' : 'light'
}

export function setStoredThemePreference(storage: Storage, preference: ThemePreference) {
  storage.setItem(THEME_PREFERENCE_KEY, preference)
  storage.removeItem(THEME_LEGACY_STORAGE_KEY)
}

export function applyThemePreference(preference: ThemePreference, prefersDark: boolean) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const resolvedTheme = resolveThemePreference(preference, prefersDark)
  root.classList.toggle('dark', resolvedTheme === 'dark')
}

/** Resolved light/dark for the current preference + system appearance. */
export function readResolvedAppTheme(storage: Storage, prefersColorSchemeDark: boolean): ResolvedTheme {
  return resolveThemePreference(getStoredThemePreference(storage), prefersColorSchemeDark)
}
