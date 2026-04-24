/**
 * App locales offered in Settings. Locales without a lazy UI bundle in `lib/i18n/locale-bundles/`
 * fall back to English strings until a full translation is added.
 */

export const APP_LOCALE_CODES = [
  'en',
  'es',
  'de',
  'fr',
  'pt',
  'pt-BR',
  'it',
  'nl',
  'pl',
  'ru',
  'sv',
  'da',
  'nb',
  'fi',
  'cs',
  'ro',
  'hu',
  'el',
  'tr',
  'uk',
  'ar',
  'he',
  'hi',
  'id',
  'ms',
  'th',
  'vi',
  'ja',
  'ko',
  'zh-CN',
  'zh-TW',
] as const

export type AppLocaleCode = (typeof APP_LOCALE_CODES)[number]

const CODE_SET = new Set<string>(APP_LOCALE_CODES)

/**
 * Locales with merged UI strings (English eager; others lazy-loaded from `locale-bundles/`).
 * Choosing any other code in settings used to leave `t()` on English fallback with no feedback.
 */
export const APP_MESSAGE_BUNDLE_LOCALES: readonly AppLocaleCode[] = [
  'en',
  'es',
  'de',
  'fr',
  'pt-BR',
  'pl',
]

const MESSAGE_BUNDLE_SET = new Set<string>(APP_MESSAGE_BUNDLE_LOCALES)

/** Map browser/device locale to a locale that has UI strings (fallback `en`). */
export function resolveEffectiveAppLocale(code: AppLocaleCode): AppLocaleCode {
  if (MESSAGE_BUNDLE_SET.has(code)) return code
  if (code === 'pt') return 'pt-BR'
  return 'en'
}

/**
 * Sign-in / sign-up: show language picker only when the user is on “device” language but the
 * browser locale is not English and we have no UI bundle for it (effective locale is English).
 */
export function shouldShowAuthLanguagePicker(
  preference: 'device' | AppLocaleCode,
  deviceResolved: AppLocaleCode,
): boolean {
  if (preference !== 'device') return false
  if (deviceResolved === 'en') return false
  return resolveEffectiveAppLocale(deviceResolved) === 'en'
}

/**
 * Normalize `localStorage` value: migrate legacy `pt` → `pt-BR`, unsupported explicit codes → `en`.
 */
export function normalizeStoredLanguagePreference(stored: string | null): 'device' | AppLocaleCode {
  if (!stored || stored === 'device') return 'device'
  if (!isAppLocaleCode(stored)) return 'en'
  const code = stored as AppLocaleCode
  if (code === 'pt') return 'pt-BR'
  if (MESSAGE_BUNDLE_SET.has(code)) return code
  return 'en'
}

export function isAppLocaleCode(value: string): value is AppLocaleCode {
  return CODE_SET.has(value)
}

/** BCP 47 tag for Intl / toLocaleDateString */
export const LOCALE_META: Record<
  AppLocaleCode,
  { native: string; badge: string; intl: string; rtl?: boolean }
> = {
  en: { native: 'English', badge: 'EN', intl: 'en-GB' },
  es: { native: 'Español', badge: 'ES', intl: 'es' },
  de: { native: 'Deutsch', badge: 'DE', intl: 'de' },
  fr: { native: 'Français', badge: 'FR', intl: 'fr' },
  pt: { native: 'Português', badge: 'PT', intl: 'pt' },
  'pt-BR': { native: 'Português (Brasil)', badge: 'BR', intl: 'pt-BR' },
  it: { native: 'Italiano', badge: 'IT', intl: 'it' },
  nl: { native: 'Nederlands', badge: 'NL', intl: 'nl' },
  pl: { native: 'Polski', badge: 'PL', intl: 'pl' },
  ru: { native: 'Русский', badge: 'RU', intl: 'ru' },
  sv: { native: 'Svenska', badge: 'SV', intl: 'sv' },
  da: { native: 'Dansk', badge: 'DA', intl: 'da' },
  nb: { native: 'Norsk (bokmål)', badge: 'NO', intl: 'nb' },
  fi: { native: 'Suomi', badge: 'FI', intl: 'fi' },
  cs: { native: 'Čeština', badge: 'CS', intl: 'cs' },
  ro: { native: 'Română', badge: 'RO', intl: 'ro' },
  hu: { native: 'Magyar', badge: 'HU', intl: 'hu' },
  el: { native: 'Ελληνικά', badge: 'EL', intl: 'el' },
  tr: { native: 'Türkçe', badge: 'TR', intl: 'tr' },
  uk: { native: 'Українська', badge: 'UK', intl: 'uk' },
  ar: { native: 'العربية', badge: 'AR', intl: 'ar', rtl: true },
  he: { native: 'עברית', badge: 'HE', intl: 'he', rtl: true },
  hi: { native: 'हिन्दी', badge: 'HI', intl: 'hi' },
  id: { native: 'Bahasa Indonesia', badge: 'ID', intl: 'id' },
  ms: { native: 'Bahasa Melayu', badge: 'MS', intl: 'ms' },
  th: { native: 'ไทย', badge: 'TH', intl: 'th' },
  vi: { native: 'Tiếng Việt', badge: 'VI', intl: 'vi' },
  ja: { native: '日本語', badge: 'JA', intl: 'ja' },
  ko: { native: '한국어', badge: 'KO', intl: 'ko' },
  'zh-CN': { native: '简体中文', badge: '简', intl: 'zh-CN' },
  'zh-TW': { native: '繁體中文', badge: '繁', intl: 'zh-TW' },
}

export function intlLocaleForApp(code: AppLocaleCode): string {
  return LOCALE_META[code]?.intl ?? 'en-GB'
}

export function resolveBrowserLocale(): AppLocaleCode {
  if (typeof navigator === 'undefined') return 'en'
  const raw = (navigator.language || 'en').toLowerCase().replace(/_/g, '-')

  if (CODE_SET.has(raw)) return raw as AppLocaleCode

  if (raw.startsWith('zh-tw') || raw.startsWith('zh-hk') || raw.startsWith('zh-mo')) return 'zh-TW'
  if (raw.startsWith('zh')) return 'zh-CN'

  if (raw === 'pt-br' || raw.startsWith('pt-br')) return 'pt-BR'
  if (raw.startsWith('pt')) return 'pt'

  const primary = raw.split('-')[0] || 'en'
  if (CODE_SET.has(primary)) return primary as AppLocaleCode

  const legacy: Record<string, AppLocaleCode> = { no: 'nb', iw: 'he', in: 'id' }
  if (legacy[primary]) return legacy[primary]

  return 'en'
}

/** @deprecated use AppLocaleCode */
export type SupportedLanguage = AppLocaleCode
