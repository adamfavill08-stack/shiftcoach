'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

/** Fired after settings (or anything) writes `localStorage.theme` so class stays in sync. */
export const THEME_STORAGE_EVENT = 'shiftcoach-theme'

type ThemeProviderProps = {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const applyTheme = () => {
      const savedTheme = window.localStorage.getItem('theme')
      // Explicit theme only; default is light when not set.
      const useDark = savedTheme === 'dark'
      root.classList.toggle('dark', useDark)
    }

    const handleSystemThemeChange = () => {
      // No-op: theme no longer follows system automatically.
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'theme') applyTheme()
    }

    const handleCustomTheme = () => {
      applyTheme()
    }

    applyTheme()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', handleSystemThemeChange)
    window.addEventListener('storage', handleStorage)
    window.addEventListener(THEME_STORAGE_EVENT, handleCustomTheme)

    return () => {
      media.removeEventListener('change', handleSystemThemeChange)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(THEME_STORAGE_EVENT, handleCustomTheme)
    }
  }, [])

  return <>{children}</>
}
