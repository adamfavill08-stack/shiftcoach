'use client'

import { useTheme } from '@/components/ThemeProvider'

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex gap-2">
      {(['system','light','dark'] as const).map(t => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          className={`px-3 py-1.5 rounded-xl border text-sm
            ${theme===t ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-transparent text-slate-900 dark:text-slate-100'}
            border-slate-200 dark:border-slate-700`}
        >
          {t[0].toUpperCase()+t.slice(1)}
        </button>
      ))}
    </div>
  )
}

