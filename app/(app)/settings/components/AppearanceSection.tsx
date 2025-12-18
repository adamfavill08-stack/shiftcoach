'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useSettings } from '@/lib/hooks/useSettings'
import { ToggleSwitch } from '@/components/settings/ToggleSwitch'
import { CURRENT_THEME, getThemeDisplayName, THEME_CONFIG } from '@/lib/theme/config'

export function AppearanceSection() {
  const { settings, saving, saveField, loading } = useSettings()
  const [isOpen, setIsOpen] = useState(false)

  if (loading) {
    return (
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">Display</h3>
        <div className="animate-pulse text-xs text-slate-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-white/90 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 via-transparent to-transparent" />
      <div className="relative z-10">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-white/50 transition-all"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200/60 shadow-sm">
              <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a4 4 0 004-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4zm0 0H7" />
              </svg>
            </div>
            <h3 className="text-[12px] font-semibold text-slate-900 leading-snug">Display</h3>
          </div>
          {isOpen ? (
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-amber-500 transition-colors" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-amber-500 transition-colors" />
          )}
        </button>
        {isOpen && (
          <div className="px-5 pb-3 space-y-1">
            {/* Theme Display - Read-only for now */}
            <div className="w-full flex items-center justify-between py-3 px-3 rounded-lg">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-900">Theme</span>
                <span className="text-xs text-slate-500">
                  Currently: {getThemeDisplayName(CURRENT_THEME)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 font-medium">
                  {getThemeDisplayName(CURRENT_THEME)}
                </span>
              </div>
            </div>
            {THEME_CONFIG.isLightOnly && (
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-medium text-slate-700">Note:</span> Only light theme is currently supported. Additional themes will be available in a future update.
                </p>
              </div>
            )}
            <div className="w-full flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/60 transition-all">
              <span className="text-sm font-medium text-slate-900">Animations</span>
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
    </div>
  )
}
