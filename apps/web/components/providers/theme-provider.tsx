'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

type ThemeProviderProps = {
  children: ReactNode
}

// Light-only wrapper: force-remove any persisted Tailwind "dark" class
// so the app always renders in light mode, regardless of previous settings.
export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.classList.remove('dark')
  }, [])

  return <>{children}</>
}
