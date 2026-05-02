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

    const handleSystemThemeChange = () => {
      const preference = getStoredThemePreference(window.localStorage)
      if (preference === 'system') {
        applyThemePreference(preference, media.matches)
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
          void import('@/lib/native/androidSystemBars').then((m) => m.applyAndroidSystemBarsFromDocument())
        }
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_PREFERENCE_KEY || e.key === THEME_LEGACY_STORAGE_KEY) apply()
    }

    apply()
    media.addEventListener('change', handleSystemThemeChange)
    window.addEventListener('storage', handleStorage)
    window.addEventListener(THEME_STORAGE_EVENT, apply)

    return () => {
      media.removeEventListener('change', handleSystemThemeChange)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(THEME_STORAGE_EVENT, apply)
    }
  }, [])

  return <>{children}</>
}
