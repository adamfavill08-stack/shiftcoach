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
    <div className="group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-slate-50/40 hover:bg-white/70 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <div className="h-9 w-9 rounded-xl bg-white/60 border border-slate-200/50 grid place-items-center flex-shrink-0">
          <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-slate-800">Notifications</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            In-app alerts and reminders
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <ToggleSwitch
          checked={notificationsEnabled}
          onChange={handleToggleChange}
          onSave={handleToggleSave}
          saving={saving === 'mood_focus_alerts_enabled'}
        />
        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition flex-shrink-0" strokeWidth={2} />
      </div>
    </div>
  )
}
