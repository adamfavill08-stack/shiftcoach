'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

type ThemeProviderProps = {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      const savedTheme = window.localStorage.getItem('theme')
      // Explicit override wins; otherwise follow system setting.
      const useDark = savedTheme === 'dark' || (savedTheme !== 'light' && media.matches)
      root.classList.toggle('dark', useDark)
    }

    const handleSystemThemeChange = () => {
      const savedTheme = window.localStorage.getItem('theme')
      // Only auto-update when there is no explicit override.
      if (savedTheme !== 'dark' && savedTheme !== 'light') {
        applyTheme()
      }
    }

    applyTheme()
    media.addEventListener('change', handleSystemThemeChange)

    return () => {
      media.removeEventListener('change', handleSystemThemeChange)
    }
  }, [])

  return <>{children}</>
}
