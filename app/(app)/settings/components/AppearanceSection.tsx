'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useSettings } from '@/lib/hooks/useSettings'
import { ToggleSwitch } from '@/components/settings/ToggleSwitch'

export function AppearanceSection() {
  const { settings, saving, saveField, loading } = useSettings()
  const [isOpen, setIsOpen] = useState(false)
  const [darkModeEnabled, setDarkModeEnabled] = useState(false)

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setDarkModeEnabled(document.documentElement.classList.contains('dark'))
    }
  }, [])

  const setThemeMode = (isDark: boolean) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      window.localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      window.localStorage.setItem('theme', 'light')
    }
  }

  if (loading) {
    return (
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">Display</h3>
        <div className="animate-pulse text-xs text-slate-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 py-3 transition-colors hover:bg-[var(--card)]"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-emerald-400 shadow-sm">
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a4 4 0 004-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4zm0 0H7" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-[var(--text-main)]">Display</h3>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)] transition group-hover:text-[var(--text-soft)]" strokeWidth={2} />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)] transition group-hover:text-[var(--text-soft)]" strokeWidth={2} />
        )}
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-20 mx-2 mt-2 space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
            {/* Theme */}
            <div className="space-y-2">
              <span className="mb-1 block text-sm font-medium text-[var(--text-main)]">
                Theme
              </span>
              <div className="flex w-full items-center justify-between rounded-lg px-3 py-3 transition-all hover:bg-[var(--card-subtle)]">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--text-main)]">Dark mode</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    Use a black app background with elevated dark cards.
                  </span>
                </div>
                <ToggleSwitch
                  checked={darkModeEnabled}
                  onChange={(checked) => {
                    setDarkModeEnabled(checked)
                    setThemeMode(checked)
                  }}
                />
              </div>
            </div>
            <div className="flex w-full items-center justify-between rounded-lg px-3 py-3 transition-all hover:bg-[var(--card-subtle)]">
              <span className="text-sm font-medium text-[var(--text-main)]">Animations</span>
              <div className="flex items-center gap-2">
                <ToggleSwitch
                  checked={settings?.animations_enabled ?? true}
                  onChange={(checked) => {
                    if (settings) saveField('animations_enabled', checked, false)
                  }}
                  onSave={async () => {
                    if (!settings) return false
                    return saveField('animations_enabled', settings.animations_enabled ?? true, false)
                  }}
                  saving={saving === 'animations_enabled'}
                />
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
