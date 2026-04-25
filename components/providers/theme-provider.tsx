'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

/** Fired after settings (or anything) writes theme preference so class stays in sync. */
export const THEME_STORAGE_EVENT = 'shiftcoach-theme'
export const THEME_PREFERENCE_KEY = 'theme_preference'
const LEGACY_THEME_KEY = 'theme'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

type ThemeProviderProps = {
  children: ReactNode
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function getStoredThemePreference(storage: Storage): ThemePreference {
  const saved = storage.getItem(THEME_PREFERENCE_KEY)
  if (isThemePreference(saved)) return saved

  const legacy = storage.getItem(LEGACY_THEME_KEY)
  if (legacy === 'dark' || legacy === 'light') return legacy

  return 'system'
}

export function resolveThemePreference(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === 'dark') return 'dark'
  if (preference === 'light') return 'light'
  return prefersDark ? 'dark' : 'light'
}

export function applyThemePreference(preference: ThemePreference, prefersDark: boolean) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const resolvedTheme = resolveThemePreference(preference, prefersDark)
  root.classList.toggle('dark', resolvedTheme === 'dark')
}

export function setStoredThemePreference(storage: Storage, preference: ThemePreference) {
  storage.setItem(THEME_PREFERENCE_KEY, preference)
  storage.removeItem(LEGACY_THEME_KEY)
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const preference = getStoredThemePreference(window.localStorage)
      // Ensure first load writes explicit preference so future reads are stable.
      setStoredThemePreference(window.localStorage, preference)
      applyThemePreference(preference, media.matches)
    }

    const handleSystemThemeChange = () => {
      const preference = getStoredThemePreference(window.localStorage)
      if (preference === 'system') {
        applyThemePreference(preference, media.matches)
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_PREFERENCE_KEY || e.key === LEGACY_THEME_KEY) apply()
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
