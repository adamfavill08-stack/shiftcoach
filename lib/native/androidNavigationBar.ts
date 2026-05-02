'use client'

import { Capacitor } from '@capacitor/core'
import { readResolvedAppTheme } from '@/lib/theme/preference'

/** Light mode: solid white nav bar (separate from status / app `--bg`). */
export const ANDROID_NAV_BAR_BG_LIGHT = '#ffffff'

/** Dark mode nav chrome. */
export const ANDROID_NAV_BAR_BG_DARK = '#17171d'

function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

async function applyNavigationBarOnce(resolved: 'light' | 'dark'): Promise<void> {
  const isDark = resolved === 'dark'
  const { NavigationBar } = await import('@capgo/capacitor-navigation-bar')
  await NavigationBar.setNavigationBarColor({
    color: isDark ? ANDROID_NAV_BAR_BG_DARK : ANDROID_NAV_BAR_BG_LIGHT,
    darkButtons: !isDark,
  })
}

/**
 * Apply navigation bar for an already-resolved theme (no extra storage read).
 */
export async function applyAndroidNavigationBarForResolvedTheme(resolved: 'light' | 'dark'): Promise<void> {
  if (typeof window === 'undefined' || !isAndroidNative()) return
  try {
    await applyNavigationBarOnce(resolved)
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    await applyNavigationBarOnce(resolved)
  } catch (e) {
    console.warn('[AndroidNavigationBar] apply failed', e)
  }
}

/**
 * Android navigation bar only (Capacitor). Light: white bar + dark buttons; dark: #17171d + light buttons.
 */
export async function applyAndroidNavigationBarFromDocument(): Promise<void> {
  if (typeof window === 'undefined' || !isAndroidNative()) return
  const resolved = readResolvedAppTheme(window.localStorage, window.matchMedia('(prefers-color-scheme: dark)').matches)
  await applyAndroidNavigationBarForResolvedTheme(resolved)
}
