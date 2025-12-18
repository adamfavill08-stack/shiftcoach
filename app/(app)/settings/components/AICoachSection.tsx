'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useSettings } from '@/lib/hooks/useSettings'
import { ToggleSwitch } from '@/components/settings/ToggleSwitch'

export function AICoachSection() {
  const { settings, saving, saveField, loading } = useSettings()
  const [isOpen, setIsOpen] = useState(false)

  if (loading) {
    return (
      <div>
        <div className="animate-pulse text-xs text-slate-500">Loading...</div>
      </div>
    )
  }

  const safeSettings = settings || {
    ai_coach_tone: 'calm' as const,
  }

  // Coach is considered "on" when tone is not null. Default for new users is calm (enabled).
  const coachEnabled = safeSettings.ai_coach_tone !== null

  const handleToggleChange = (checked: boolean) => {
    if (!settings) return
    // When enabled, always store 'calm'; when disabled, store null.
    saveField('ai_coach_tone', (checked ? 'calm' : null) as any, false)
  }

  const handleToggleSave = async () => true

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-white/90 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-transparent" />
      <div className="relative z-10">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-white/50 transition-all"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 border border-indigo-200/60 shadow-sm">
              <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-[12px] font-semibold text-slate-900 leading-snug">AI Coach</h3>
          </div>
          <div className="flex items-center gap-3">
            <ToggleSwitch
              checked={coachEnabled}
              onChange={handleToggleChange}
              onSave={handleToggleSave}
              saving={saving === 'ai_coach_tone'}
            />
          </div>
          {isOpen ? (
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          )}
        </button>
        {isOpen && (
          <div className="px-5 pb-3 space-y-1">
            <p className="text-xs text-slate-500">
              When the AI coach is on, it uses a calm, supportive tone for guidance and suggestions.
              Turn this off if you prefer to use the app without coaching messages.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
