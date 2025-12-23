'use client'

import { useState } from 'react'
import { Bell, X, Plus } from 'lucide-react'
import { REMINDER_OFF, REMINDER_NOTIFICATION, REMINDER_EMAIL } from '@/lib/models/calendar/Event'

export interface ReminderConfig {
  minutes: number // -1 = off, otherwise minutes before event
  type: number // 0 = notification, 1 = email
}

interface RemindersPickerProps {
  reminders: ReminderConfig[]
  onChange: (reminders: ReminderConfig[]) => void
}

// Common reminder presets (in minutes before event)
const REMINDER_PRESETS = [
  { label: 'Off', value: -1 },
  { label: 'At time of event', value: 0 },
  { label: '5 minutes before', value: 5 },
  { label: '10 minutes before', value: 10 },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
  { label: '1 day before', value: 1440 },
  { label: '2 days before', value: 2880 },
  { label: '1 week before', value: 10080 },
]

// Custom reminder options
const CUSTOM_REMINDER_OPTIONS = [
  { label: 'Custom...', value: -2 }, // Special value to show custom input
]

export function RemindersPicker({ reminders, onChange }: RemindersPickerProps) {
  const [customInputs, setCustomInputs] = useState<{ [key: number]: string }>({})

  // Ensure we always have 3 reminder slots
  const displayReminders: ReminderConfig[] = [
    reminders[0] || { minutes: -1, type: 0 },
    reminders[1] || { minutes: -1, type: 0 },
    reminders[2] || { minutes: -1, type: 0 },
  ]

  function handleReminderChange(index: number, minutes: number) {
    const newReminders = [...displayReminders]
    
    if (minutes === -2) {
      // Show custom input
      setCustomInputs(prev => ({ ...prev, [index]: '' }))
      return
    }
    
    // Remove custom input if set
    const newCustomInputs = { ...customInputs }
    delete newCustomInputs[index]
    setCustomInputs(newCustomInputs)
    
    newReminders[index] = {
      minutes: minutes === -1 ? -1 : minutes,
      type: REMINDER_NOTIFICATION, // Default to notification
    }
    
    // Remove trailing "off" reminders
    const filtered = newReminders.filter(r => r.minutes !== -1)
    onChange(filtered)
  }

  function handleCustomReminder(index: number, value: string) {
    const minutes = parseInt(value)
    if (isNaN(minutes) || minutes < 0) return
    
    const newReminders = [...displayReminders]
    newReminders[index] = {
      minutes,
      type: REMINDER_NOTIFICATION,
    }
    
    // Remove custom input
    const newCustomInputs = { ...customInputs }
    delete newCustomInputs[index]
    setCustomInputs(newCustomInputs)
    
    onChange(newReminders.filter(r => r.minutes !== -1))
  }

  function removeReminder(index: number) {
    const newReminders = [...displayReminders]
    newReminders[index] = { minutes: -1, type: 0 }
    
    const newCustomInputs = { ...customInputs }
    delete newCustomInputs[index]
    setCustomInputs(newCustomInputs)
    
    onChange(newReminders.filter(r => r.minutes !== -1))
  }

  function formatReminderTime(minutes: number): string {
    if (minutes === -1) return 'Off'
    if (minutes === 0) return 'At time of event'
    if (minutes < 60) return `${minutes} minutes before`
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) > 1 ? 's' : ''} before`
    return `${Math.floor(minutes / 1440)} day${Math.floor(minutes / 1440) > 1 ? 's' : ''} before`
  }

  const activeReminders = displayReminders.filter(r => r.minutes !== -1)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Reminders
        </label>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          ({activeReminders.length}/3)
        </span>
      </div>

      <div className="space-y-2">
        {displayReminders.map((reminder, index) => {
          const isActive = reminder.minutes !== -1
          const showCustomInput = customInputs[index] !== undefined

          return (
            <div
              key={index}
              className={`rounded-xl border transition ${
                isActive
                  ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/40'
                  : 'bg-transparent border-slate-200/50 dark:border-slate-700/30'
              }`}
            >
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    {showCustomInput ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          placeholder="Minutes before event"
                          value={customInputs[index] || ''}
                          onChange={(e) => {
                            setCustomInputs(prev => ({ ...prev, [index]: e.target.value }))
                          }}
                          onBlur={(e) => {
                            if (e.target.value) {
                              handleCustomReminder(index, e.target.value)
                            } else {
                              const newCustomInputs = { ...customInputs }
                              delete newCustomInputs[index]
                              setCustomInputs(newCustomInputs)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur()
                            }
                          }}
                          className="flex-1 rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newCustomInputs = { ...customInputs }
                            delete newCustomInputs[index]
                            setCustomInputs(newCustomInputs)
                          }}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <select
                        value={reminder.minutes === -1 ? -1 : (reminder.minutes > 10080 ? -2 : reminder.minutes)}
                        onChange={(e) => handleReminderChange(index, parseInt(e.target.value))}
                        className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
                      >
                        {REMINDER_PRESETS.map((preset) => (
                          <option key={preset.value} value={preset.value}>
                            {preset.label}
                          </option>
                        ))}
                        {reminder.minutes !== -1 && reminder.minutes > 10080 && (
                          <option value={reminder.minutes}>
                            {formatReminderTime(reminder.minutes)} (custom)
                          </option>
                        )}
                        {CUSTOM_REMINDER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {isActive && (
                    <button
                      type="button"
                      onClick={() => removeReminder(index)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400 transition"
                      aria-label="Remove reminder"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {isActive && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatReminderTime(reminder.minutes)}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {reminder.type === REMINDER_NOTIFICATION ? 'Notification' : 'Email'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {activeReminders.length === 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
          No reminders set
        </p>
      )}
    </div>
  )
}

