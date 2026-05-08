'use client'

import { Capacitor } from '@capacitor/core'
import { readResolvedAppTheme } from '@/lib/theme/preference'
import { applyAndroidNavigationBarForResolvedTheme } from '@/lib/native/androidNavigationBar'

/** Matches light mode `--bg` in `app/globals.css` (status bar only). */
export const ANDROID_SYSTEM_BAR_BG_LIGHT = '#f5f3f0'

/** Dark chrome; close to app dark shell without pure black. */
export const ANDROID_SYSTEM_BAR_BG_DARK = '#17171d'

function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

async function applyOnce(resolved: 'light' | 'dark'): Promise<void> {
  const isDark = resolved === 'dark'
  const bg = isDark ? ANDROID_SYSTEM_BAR_BG_DARK : ANDROID_SYSTEM_BAR_BG_LIGHT

  const { StatusBar, Style } = await import('@capacitor/status-bar')

  await StatusBar.show()
  await StatusBar.setOverlaysWebView({ overlay: false })
  await StatusBar.setBackgroundColor({ color: bg })
  // Style.Light = dark icons on light bar; Style.Dark = light icons on dark bar
  await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light })

  await applyAndroidNavigationBarForResolvedTheme(resolved)
}

/**
 * Sync Android status + navigation bars to the resolved app theme (System / Light / Dark).
 * No-op on web and iOS.
 */
export async function applyAndroidSystemBarsFromDocument(): Promise<void> {
  if (typeof window === 'undefined' || !isAndroidNative()) return

  const resolved = readResolvedAppTheme(window.localStorage, window.matchMedia('(prefers-color-scheme: dark)').matches)

  try {
    await applyOnce(resolved)
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    await applyOnce(resolved)
  } catch (e) {
    console.warn('[AndroidSystemBars] apply failed', e)
  }
}
