'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { ToggleSwitch } from '@/components/settings/ToggleSwitch'
import { useSettings } from '@/lib/hooks/useSettings'

export function NotificationsSection() {
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
    mood_focus_alerts_enabled: true,
  }

  // Default to true (on) if not set, but allow user to turn it off
  const notificationsEnabled = safeSettings.mood_focus_alerts_enabled ?? true

  const handleToggleChange = (checked: boolean) => {
    // onChange is called immediately for optimistic update
    // The saveField will handle the persistence
    saveField('mood_focus_alerts_enabled', checked, false)
  }

  const handleToggleSave = async (): Promise<boolean> => {
    // onSave is called after onChange to persist the change
    // Since saveField already handles persistence in onChange, we just return success
    return true
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-white/90 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-transparent to-transparent" />
      <div className="relative z-10">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-white/50 transition-all"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200/60 shadow-sm">
              <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-[12px] font-semibold text-slate-900 leading-snug">Notifications</h3>
          </div>
          <div className="flex items-center gap-3">
            <ToggleSwitch
              checked={notificationsEnabled}
              onChange={handleToggleChange}
              onSave={handleToggleSave}
              saving={saving === 'mood_focus_alerts_enabled'}
            />
          </div>
          {isOpen ? (
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-purple-500 transition-colors ml-2" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-purple-400 transition-colors ml-2" />
          )}
        </button>
        {isOpen && (
          <div className="px-5 pb-3 space-y-1">
            <p className="text-xs text-slate-500">
              When notifications are on, ShiftCoach can show in‑app alerts for low mood/focus, upcoming shifts,
              morning check‑ins, and meal timing windows. Turn this off if you prefer a quieter experience.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
