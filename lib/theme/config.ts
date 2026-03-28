/**
 * Theme: light only for now.
 * Tailwind `darkMode` is off (`tailwind.config.ts`); add dark/system here when you implement it.
 */
export type Theme = 'light'

export const CURRENT_THEME: Theme = 'light'

export const SUPPORTED_THEMES: readonly Theme[] = ['light'] as const

export function isThemeSupported(theme: string): theme is Theme {
  return theme === 'light'
}

export function getThemeDisplayName(_theme: Theme): string {
  return 'Light'
}

export const THEME_CONFIG = {
  current: CURRENT_THEME,
  supported: SUPPORTED_THEMES,
  isLightOnly: true,
} as const
