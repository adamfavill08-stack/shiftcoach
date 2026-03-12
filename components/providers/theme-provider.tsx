'use client'

import type { ReactNode } from 'react'

type ThemeProviderProps = {
  children: ReactNode
}

// Light-only wrapper: dark/system themes are disabled for now.
export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>
}
