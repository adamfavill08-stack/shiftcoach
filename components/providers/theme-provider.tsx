'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

type ThemeProviderProps = {
  children: ReactNode
}

/**
 * Light-only shell: strip any stale `dark` class from older sessions.
 * Tailwind dark variant is disabled in `tailwind.config.ts` (`darkMode: false`).
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.remove('dark')
  }, [])

  return <>{children}</>
}
