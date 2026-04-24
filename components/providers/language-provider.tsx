'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import enMessages from '@/lib/i18n/locale-bundles/en'
import {
  type AppLocaleCode,
  LOCALE_META,
  normalizeStoredLanguagePreference,
  resolveBrowserLocale,
  resolveEffectiveAppLocale,
} from '@/lib/i18n/supportedLocales'

export type { AppLocaleCode, SupportedLanguage } from '@/lib/i18n/supportedLocales'

type LanguagePreference = 'device' | AppLocaleCode

type BundleLocale = 'es' | 'de' | 'fr' | 'pt-BR' | 'pl'

const LOCALE_CHUNK_LOADERS: Record<
  BundleLocale,
  () => Promise<{ default: Record<string, string> }>
> = {
  es: () => import('@/lib/i18n/locale-bundles/es'),
  de: () => import('@/lib/i18n/locale-bundles/de'),
  fr: () => import('@/lib/i18n/locale-bundles/fr'),
  'pt-BR': () => import('@/lib/i18n/locale-bundles/pt-BR'),
  pl: () => import('@/lib/i18n/locale-bundles/pl'),
}

function isBundleLocale(code: AppLocaleCode): code is BundleLocale {
  return (
    code === 'es' ||
    code === 'de' ||
    code === 'fr' ||
    code === 'pt-BR' ||
    code === 'pl'
  )
}

type LanguageContextValue = {
  preference: LanguagePreference
  language: AppLocaleCode
  setPreference: (pref: LanguagePreference) => void
  /** Lazy-loaded strings for the active non-English locale; null while the chunk loads. */
  localeOverlay: Record<string, string> | null
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

function LanguageDocumentAttributes() {
  const { language } = useLanguage()
  useEffect(() => {
    if (typeof document === 'undefined') return
    const meta = LOCALE_META[language]
    document.documentElement.lang = meta.intl
    document.documentElement.dir = meta.rtl ? 'rtl' : 'ltr'
  }, [language])
  return null
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>('device')
  const [language, setLanguage] = useState<AppLocaleCode>('en')
  const [localeOverlay, setLocaleOverlay] = useState<Record<string, string> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('shiftcoach:language')
    const pref = normalizeStoredLanguagePreference(stored)
    if (stored != null && stored !== pref) {
      window.localStorage.setItem('shiftcoach:language', pref)
    }
    setPreferenceState(pref)
    const raw = pref === 'device' ? resolveBrowserLocale() : pref
    setLanguage(resolveEffectiveAppLocale(raw))
  }, [])

  useEffect(() => {
    const effective = resolveEffectiveAppLocale(language)
    if (!isBundleLocale(effective)) {
      setLocaleOverlay(null)
      return
    }
    let cancelled = false
    setLocaleOverlay(null)
    LOCALE_CHUNK_LOADERS[effective]()
      .then((mod) => {
        if (!cancelled) setLocaleOverlay(mod.default)
      })
      .catch(() => {
        if (!cancelled) setLocaleOverlay(null)
      })
    return () => {
      cancelled = true
    }
  }, [language])

  const setPreference = useCallback((pref: LanguagePreference) => {
    setPreferenceState(pref)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('shiftcoach:language', pref)
    }
    const raw = pref === 'device' ? resolveBrowserLocale() : pref
    setLanguage(resolveEffectiveAppLocale(raw))
  }, [])

  const value = useMemo(
    () => ({
      preference,
      language,
      setPreference,
      localeOverlay,
    }),
    [preference, language, setPreference, localeOverlay],
  )

  return (
    <LanguageContext.Provider value={value}>
      <LanguageDocumentAttributes />
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return ctx
}

export type TranslationParams = Record<string, string | number | undefined>

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template
  let s = template
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue
    s = s.split(`{${k}}`).join(String(v))
  }
  return s
}

export function useTranslation() {
  const { language, localeOverlay } = useLanguage()
  const t = useCallback(
    (key: string, params?: TranslationParams) => {
      const effective = resolveEffectiveAppLocale(language)
      const localized =
        effective !== 'en' && localeOverlay ? (localeOverlay[key] ?? undefined) : undefined
      const raw = (localized ?? enMessages[key] ?? key) as string
      return interpolate(raw, params)
    },
    [language, localeOverlay],
  )
  return useMemo(() => ({ t }), [t])
}
