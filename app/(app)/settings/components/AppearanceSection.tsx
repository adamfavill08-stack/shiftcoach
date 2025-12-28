'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Sun, Moon, Monitor } from 'lucide-react'
import { useSettings } from '@/lib/hooks/useSettings'
import { ToggleSwitch } from '@/components/settings/ToggleSwitch'
import { useTheme } from 'next-themes'

export function AppearanceSection() {
  const { settings, saving, saveField, loading } = useSettings()
  const [isOpen, setIsOpen] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

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
        className="group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-slate-50/40 dark:bg-slate-800/30 hover:bg-white/70 dark:hover:bg-slate-800/50 transition-colors w-full"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="h-9 w-9 rounded-xl bg-white/60 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/40 grid place-items-center flex-shrink-0">
            <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a4 4 0 004-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4zm0 0H7" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">Display</h3>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 transition flex-shrink-0" strokeWidth={2} />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 transition flex-shrink-0" strokeWidth={2} />
        )}
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 mx-2 rounded-2xl bg-white/95 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] p-4 space-y-3 z-20">
            {/* Theme Selector */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block mb-3">Theme</span>
              <div className="space-y-1.5">
                {/* System (Default) */}
                <button
                  onClick={() => setTheme('system')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    theme === 'system'
                      ? 'bg-slate-100 dark:bg-slate-700/50 border-2 border-slate-300 dark:border-slate-600'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Monitor className={`h-4 w-4 ${theme === 'system' ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`} />
                    <div className="text-left">
                      <div className={`text-sm font-medium ${theme === 'system' ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                        System
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Follow device setting
                      </div>
                    </div>
                  </div>
                  {theme === 'system' && (
                    <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                  )}
                </button>

                {/* Light */}
                <button
                  onClick={() => setTheme('light')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    theme === 'light'
                      ? 'bg-slate-100 dark:bg-slate-700/50 border-2 border-slate-300 dark:border-slate-600'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sun className={`h-4 w-4 ${theme === 'light' ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`} />
                    <div className="text-left">
                      <div className={`text-sm font-medium ${theme === 'light' ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                        Light
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Always use light mode
                      </div>
                    </div>
                  </div>
                  {theme === 'light' && (
                    <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                  )}
                </button>

                {/* Dark */}
                <button
                  onClick={() => setTheme('dark')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-100 dark:bg-slate-700/50 border-2 border-slate-300 dark:border-slate-600'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Moon className={`h-4 w-4 ${theme === 'dark' ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`} />
                    <div className="text-left">
                      <div className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                        Dark
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Always use dark mode
                      </div>
                    </div>
                  </div>
                  {theme === 'dark' && (
                    <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                  )}
                </button>
              </div>
              {mounted && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 px-1">
                  {theme === 'system' 
                    ? `Currently: ${resolvedTheme === 'dark' ? 'Dark' : 'Light'} (following device)`
                    : `Currently: ${theme === 'dark' ? 'Dark' : 'Light'}`
                  }
                </p>
              )}
            </div>
            <div className="w-full flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/50 transition-all">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Animations</span>
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
