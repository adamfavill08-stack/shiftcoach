import {
  normalizeStoredLanguagePreference,
  resolveBrowserLocale,
  resolveEffectiveAppLocale,
  type AppLocaleCode,
} from '@/lib/i18n/supportedLocales'

/** Effective UI bundle code for server routes (matches `resolveEffectiveAppLocale`). */
export function getClientAppLocaleForApi(): AppLocaleCode {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem('shiftcoach:language')
  const pref = normalizeStoredLanguagePreference(stored)
  const base = pref === 'device' ? resolveBrowserLocale() : pref
  return resolveEffectiveAppLocale(base)
}
