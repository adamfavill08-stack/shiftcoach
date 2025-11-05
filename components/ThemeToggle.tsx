'use client'

import { useTheme } from '@/components/ThemeProvider'

export function ThemeToggle() {
  const { resolved, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="px-3 py-1.5 rounded-xl border text-sm hover:bg-slate-50 dark:hover:bg-slate-800
                 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
    >
      {resolved === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  )
}

