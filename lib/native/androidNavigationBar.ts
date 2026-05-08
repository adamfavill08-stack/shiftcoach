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

/** Cancels in-flight delayed retries when a newer theme apply starts. */
let navBarApplyGeneration = 0

/**
 * Apply navigation bar for an already-resolved theme (no extra storage read).
 * Re-tries on a short schedule: the Capacitor bridge can be late on cold start
 * or after splash, so a single useEffect pass is not always enough.
 */
export async function applyAndroidNavigationBarForResolvedTheme(resolved: 'light' | 'dark'): Promise<void> {
  if (typeof window === 'undefined' || !isAndroidNative()) return
  const gen = ++navBarApplyGeneration

  const runIfCurrent = async () => {
    if (gen !== navBarApplyGeneration) return
    try {
      await applyNavigationBarOnce(resolved)
    } catch (e) {
      console.warn('[AndroidNavigationBar] apply failed', e)
    }
  }

  try {
    await runIfCurrent()
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    await runIfCurrent()
  } catch (e) {
    console.warn('[AndroidNavigationBar] apply failed', e)
  }

  for (const ms of [150, 400, 1000]) {
    window.setTimeout(() => {
      void runIfCurrent()
    }, ms)
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
