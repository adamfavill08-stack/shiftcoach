/**
 * Theme Configuration
 * 
 * Current Status:
 * - Only "light" theme is currently supported
 * - Additional themes (dark, system) will be added in the future
 */

export type Theme = 'light' | 'dark' | 'system'

/**
 * The currently active theme
 * Only 'light' is supported at this time
 */
export const CURRENT_THEME: Theme = 'light'

/**
 * List of supported themes
 * Currently only includes 'light', but will be expanded in the future
 */
export const SUPPORTED_THEMES: readonly Theme[] = ['light'] as const

/**
 * Check if a theme is currently supported
 */
export function isThemeSupported(theme: Theme): boolean {
  return SUPPORTED_THEMES.includes(theme)
}

/**
 * Get the display name for a theme
 */
export function getThemeDisplayName(theme: Theme): string {
  const names: Record<Theme, string> = {
    light: 'Light',
    dark: 'Dark',
    system: 'System',
  }
  return names[theme]
}

/**
 * Theme configuration metadata
 */
export const THEME_CONFIG = {
  current: CURRENT_THEME,
  supported: SUPPORTED_THEMES,
  futureThemes: ['dark', 'system'] as const,
  isLightOnly: true,
} as const

