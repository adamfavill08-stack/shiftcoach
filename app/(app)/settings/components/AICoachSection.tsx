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
    <div className="group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-slate-50/40 dark:bg-slate-800/30 hover:bg-white/70 dark:hover:bg-slate-800/50 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <div className="h-9 w-9 rounded-xl bg-white/60 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/40 grid place-items-center flex-shrink-0">
          <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">AI Coach</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Adjusts guidance based on your shifts and sleep
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <ToggleSwitch
          checked={coachEnabled}
          onChange={handleToggleChange}
          onSave={handleToggleSave}
          saving={saving === 'ai_coach_tone'}
        />
        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 transition flex-shrink-0" strokeWidth={2} />
      </div>
    </div>
  )
}
