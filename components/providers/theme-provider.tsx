'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  THEME_STORAGE_EVENT,
  THEME_PREFERENCE_KEY,
  THEME_LEGACY_STORAGE_KEY,
  getStoredThemePreference,
  setStoredThemePreference,
  applyThemePreference,
} from '@/lib/theme/preference'
import { subscribePrefersColorSchemeDarkChange } from '@/lib/theme/prefersColorSchemeSubscription'

export type { ThemePreference, ResolvedTheme } from '@/lib/theme/preference'
export {
  THEME_STORAGE_EVENT,
  THEME_PREFERENCE_KEY,
  THEME_LEGACY_STORAGE_KEY,
  getStoredThemePreference,
  resolveThemePreference,
  setStoredThemePreference,
  applyThemePreference,
} from '@/lib/theme/preference'

type ThemeProviderProps = {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const preference = getStoredThemePreference(window.localStorage)
      setStoredThemePreference(window.localStorage, preference)
      applyThemePreference(preference, media.matches)
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        void import('@/lib/native/androidSystemBars').then((m) => m.applyAndroidSystemBarsFromDocument())
      }
    }

    const handleSystemThemeChange = (prefersDark: boolean) => {
      const preference = getStoredThemePreference(window.localStorage)
      if (preference === 'system') {
        applyThemePreference(preference, prefersDark)
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
          void import('@/lib/native/androidSystemBars').then((m) => m.applyAndroidSystemBarsFromDocument())
        }
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_PREFERENCE_KEY || e.key === THEME_LEGACY_STORAGE_KEY) apply()
    }

    apply()
    const unsubscribeMql = subscribePrefersColorSchemeDarkChange(handleSystemThemeChange)
    window.addEventListener('storage', handleStorage)
    window.addEventListener(THEME_STORAGE_EVENT, apply)

    let removeResume: (() => Promise<void>) | undefined
    if (Capacitor.isNativePlatform()) {
      void import('@capacitor/app').then(({ App }) => {
        void App.addListener('resume', apply).then((handle) => {
          removeResume = () => handle.remove()
        })
      })
    }

    return () => {
      unsubscribeMql()
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(THEME_STORAGE_EVENT, apply)
      void removeResume?.()
    }
  }, [])

  return <>{children}</>
}
