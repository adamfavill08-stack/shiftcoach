'use client'

import { useState, useEffect } from 'react'
import { 
  Settings, Calendar, Bell, Globe, Palette, Download, Upload, RefreshCw, Save, 
  Clock, Type, Grid, Eye, EyeOff, Trash2, Vibrate, Volume2, Repeat, 
  FileText, Layers, Zap, AlertCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CalendarSettings {
  // General
  weekStartDay: number // 0 = Sunday, 1 = Monday, etc.
  showWeekNumbers: boolean
  use24HourFormat: boolean
  highlightWeekends: boolean
  highlightWeekendsColor: string
  showGrid: boolean
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  
  // Weekly View
  weeklyStartTime: number // 0-16 hours
  showMidnightSpanningEventsAtTop: boolean
  allowCustomizeDayCount: boolean
  startWeekWithCurrentDay: boolean
  
  // Monthly View
  // (settings can be added here)
  
  // Event Lists
  displayPastEvents: number // minutes, 0 = never
  dimPastEvents: boolean
  dimCompletedTasks: boolean
  showShiftBars: boolean
  
  // Reminders
  vibrateOnReminder: boolean
  reminderSound: string
  reminderAudioStream: 'alarm' | 'system' | 'notification' | 'ring'
  useSameSnooze: boolean
  snoozeTime: number // minutes
  loopReminders: boolean
  usePreviousEventReminders: boolean
  defaultReminder1: number // minutes, -1 = off
  defaultReminder2: number
  defaultReminder3: number
  
  // New Events
  defaultStartTime: 'current' | 'next_hour' | number // number = minutes from midnight
  defaultEventDuration: number // minutes
  defaultEventType: number // event type ID, -1 = last used
  
  // Tasks
  allowCreatingTasks: boolean
  showCompletedTasks: boolean
  
  // Time Zones
  allowChangingTimeZones: boolean
  defaultTimeZone: string
  
  // Description
  displayDescription: boolean
  replaceDescription: boolean
  
  // Backups
  autoBackup: boolean
  backupFrequency: 'daily' | 'weekly' | 'monthly'
}

export function CalendarSettings() {
  const router = useRouter()
  const [settings, setSettings] = useState<CalendarSettings>({
    // General
    weekStartDay: 1, // Monday
    showWeekNumbers: false,
    use24HourFormat: false,
    highlightWeekends: false,
    highlightWeekendsColor: '#3b82f6',
    showGrid: true,
    fontSize: 'medium',
    
    // Weekly View
    weeklyStartTime: 0,
    showMidnightSpanningEventsAtTop: true,
    allowCustomizeDayCount: false,
    startWeekWithCurrentDay: false,
    
    // Event Lists
    displayPastEvents: 0, // 0 = never
    dimPastEvents: false,
    dimCompletedTasks: false,
    showShiftBars: true,
    
    // Reminders
    vibrateOnReminder: true,
    reminderSound: 'Default',
    reminderAudioStream: 'notification',
    useSameSnooze: true,
    snoozeTime: 5,
    loopReminders: false,
    usePreviousEventReminders: false,
    defaultReminder1: 15,
    defaultReminder2: -1,
    defaultReminder3: -1,
    
    // New Events
    defaultStartTime: 'current',
    defaultEventDuration: 60,
    defaultEventType: -1, // last used
    
    // Tasks
    allowCreatingTasks: true,
    showCompletedTasks: false,
    
    // Time Zones
    allowChangingTimeZones: false,
    defaultTimeZone: '',
    
    // Description
    displayDescription: true,
    replaceDescription: false,
    
    // Backups
    autoBackup: false,
    backupFrequency: 'weekly',
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      const saved = localStorage.getItem('calendarSettings')
      if (saved) {
        const parsed = JSON.parse(saved)
        setSettings({ ...settings, ...parsed })
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    try {
      setSaving(true)
      localStorage.setItem('calendarSettings', JSON.stringify(settings))
      // TODO: Save to API when backend is ready
      alert('Settings saved!')
    } catch (err) {
      console.error('Error saving settings:', err)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAllEvents() {
    try {
      const response = await fetch('/api/calendar/events', {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete events')
      alert('All events deleted successfully')
      setShowDeleteConfirm(false)
      router.refresh()
    } catch (err) {
      console.error('Error deleting events:', err)
      alert('Failed to delete events')
    }
  }

  function formatReminderMinutes(minutes: number): string {
    if (minutes === -1) return 'Off'
    if (minutes === 0) return 'At time of event'
    if (minutes < 60) return `${minutes} minutes before`
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) > 1 ? 's' : ''} before`
    return `${Math.floor(minutes / 1440)} day${Math.floor(minutes / 1440) > 1 ? 's' : ''} before`
  }

  function formatDisplayPastEvents(minutes: number): string {
    if (minutes === 0) return 'Never'
    if (minutes < 60) return `${minutes} minutes`
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) > 1 ? 's' : ''}`
    return `${Math.floor(minutes / 1440)} day${Math.floor(minutes / 1440) > 1 ? 's' : ''}`
  }

  function formatWeeklyStartTime(hours: number): string {
    if (settings.use24HourFormat) {
      return `${hours.toString().padStart(2, '0')}:00`
    } else {
      const period = hours >= 12 ? 'PM' : 'AM'
      const hour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
      return `${hour}:00 ${period}`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-slate-400 dark:text-slate-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          General
        </h3>

        <div className="space-y-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-4">
          {/* Week Start Day */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Week Starts On
            </label>
            <select
              value={settings.weekStartDay}
              onChange={(e) => setSettings({ ...settings, weekStartDay: parseInt(e.target.value) })}
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
            </select>
          </div>

          {/* Hour Format */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                24-Hour Format
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Use 24-hour time format
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.use24HourFormat}
              onChange={(e) => setSettings({ ...settings, use24HourFormat: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Show Week Numbers */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Show Week Numbers
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Display week numbers in calendar views
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.showWeekNumbers}
              onChange={(e) => setSettings({ ...settings, showWeekNumbers: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Highlight Weekends */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Highlight Weekends
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Highlight Saturday and Sunday
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.highlightWeekends}
              onChange={(e) => setSettings({ ...settings, highlightWeekends: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Weekend Color */}
          {settings.highlightWeekends && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Weekend Highlight Color
              </label>
              <input
                type="color"
                value={settings.highlightWeekendsColor}
                onChange={(e) => setSettings({ ...settings, highlightWeekendsColor: e.target.value })}
                className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700/40 cursor-pointer"
              />
            </div>
          )}

          {/* Show Grid */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Show Grid
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Display grid lines in calendar
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.showGrid}
              onChange={(e) => setSettings({ ...settings, showGrid: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Font Size
            </label>
            <select
              value={settings.fontSize}
              onChange={(e) => setSettings({ ...settings, fontSize: e.target.value as any })}
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>
        </div>
      </div>

      {/* Weekly View Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Weekly View
        </h3>

        <div className="space-y-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-4">
          {/* Weekly Start Time */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Weekly View Starts At
            </label>
            <select
              value={settings.weeklyStartTime}
              onChange={(e) => setSettings({ ...settings, weeklyStartTime: parseInt(e.target.value) })}
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
            >
              {Array.from({ length: 17 }, (_, i) => (
                <option key={i} value={i}>
                  {formatWeeklyStartTime(i)}
                </option>
              ))}
            </select>
          </div>

          {/* Midnight Spanning Events */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Show Midnight-Spanning Events at Top
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Display events that span midnight at the top
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.showMidnightSpanningEventsAtTop}
              onChange={(e) => setSettings({ ...settings, showMidnightSpanningEventsAtTop: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Allow Customize Day Count */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Allow Customize Day Count
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Allow customizing number of days in weekly view
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.allowCustomizeDayCount}
              onChange={(e) => setSettings({ ...settings, allowCustomizeDayCount: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Start Week With Current Day */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Start Week With Current Day
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Start weekly view with today
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.startWeekWithCurrentDay}
              onChange={(e) => setSettings({ ...settings, startWeekWithCurrentDay: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Event Lists Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Event Lists
        </h3>

        <div className="space-y-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-4">
          {/* Display Past Events */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Display Past Events
            </label>
            <select
              value={settings.displayPastEvents}
              onChange={(e) => setSettings({ ...settings, displayPastEvents: parseInt(e.target.value) })}
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
            >
              <option value={0}>Never</option>
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
              <option value={480}>8 hours</option>
              <option value={1440}>1 day</option>
              <option value={2880}>2 days</option>
              <option value={4320}>3 days</option>
              <option value={10080}>1 week</option>
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Currently: {formatDisplayPastEvents(settings.displayPastEvents)}
            </p>
          </div>

          {/* Dim Past Events */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Dim Past Events
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Make past events appear dimmed
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.dimPastEvents}
              onChange={(e) => setSettings({ ...settings, dimPastEvents: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Dim Completed Tasks */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Dim Completed Tasks
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Make completed tasks appear dimmed
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.dimCompletedTasks}
              onChange={(e) => setSettings({ ...settings, dimCompletedTasks: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Coloured Shift Bars */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Show coloured shift bars
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Turn off if you prefer a cleaner calendar without long coloured blocks.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.showShiftBars}
              onChange={(e) => setSettings({ ...settings, showShiftBars: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Reminders Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Reminders
        </h3>

        <div className="space-y-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-4">
          {/* Vibrate */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Vibrate on Reminder
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Vibrate device when reminder triggers
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.vibrateOnReminder}
              onChange={(e) => setSettings({ ...settings, vibrateOnReminder: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Reminder Audio Stream */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Reminder Audio Stream
            </label>
            <select
              value={settings.reminderAudioStream}
              onChange={(e) => setSettings({ ...settings, reminderAudioStream: e.target.value as any })}
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
            >
              <option value="alarm">Alarm</option>
              <option value="system">System</option>
              <option value="notification">Notification</option>
              <option value="ring">Ring</option>
            </select>
          </div>

          {/* Use Same Snooze */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Use Same Snooze Time
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Use same snooze time for all reminders
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.useSameSnooze}
              onChange={(e) => setSettings({ ...settings, useSameSnooze: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Snooze Time */}
          {settings.useSameSnooze && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Snooze Time (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.snoozeTime}
                onChange={(e) => setSettings({ ...settings, snoozeTime: parseInt(e.target.value) || 5 })}
                className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
              />
            </div>
          )}

          {/* Loop Reminders */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Loop Reminders
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Repeat reminder until dismissed
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.loopReminders}
              onChange={(e) => setSettings({ ...settings, loopReminders: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Use Previous Event Reminders */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Use Previous Event Reminders
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Use reminders from last created event
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.usePreviousEventReminders}
              onChange={(e) => setSettings({ ...settings, usePreviousEventReminders: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Default Reminders */}
          {!settings.usePreviousEventReminders && (
            <>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/40">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Default Reminders
                </label>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Reminder 1
                    </label>
                    <select
                      value={settings.defaultReminder1}
                      onChange={(e) => setSettings({ ...settings, defaultReminder1: parseInt(e.target.value) })}
                      className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
                    >
                      <option value={-1}>Off</option>
                      <option value={0}>At time of event</option>
                      <option value={5}>5 minutes before</option>
                      <option value={15}>15 minutes before</option>
                      <option value={30}>30 minutes before</option>
                      <option value={60}>1 hour before</option>
                      <option value={120}>2 hours before</option>
                      <option value={1440}>1 day before</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Reminder 2
                    </label>
                    <select
                      value={settings.defaultReminder2}
                      onChange={(e) => setSettings({ ...settings, defaultReminder2: parseInt(e.target.value) })}
                      className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
                    >
                      <option value={-1}>Off</option>
                      <option value={0}>At time of event</option>
                      <option value={5}>5 minutes before</option>
                      <option value={15}>15 minutes before</option>
                      <option value={30}>30 minutes before</option>
                      <option value={60}>1 hour before</option>
                      <option value={120}>2 hours before</option>
                      <option value={1440}>1 day before</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Reminder 3
                    </label>
                    <select
                      value={settings.defaultReminder3}
                      onChange={(e) => setSettings({ ...settings, defaultReminder3: parseInt(e.target.value) })}
                      className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
                    >
                      <option value={-1}>Off</option>
                      <option value={0}>At time of event</option>
                      <option value={5}>5 minutes before</option>
                      <option value={15}>15 minutes before</option>
                      <option value={30}>30 minutes before</option>
                      <option value={60}>1 hour before</option>
                      <option value={120}>2 hours before</option>
                      <option value={1440}>1 day before</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Events Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          New Events
        </h3>

        <div className="space-y-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-4">
          {/* Default Start Time */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Default Start Time
            </label>
            <select
              value={typeof settings.defaultStartTime === 'string' ? settings.defaultStartTime : 'custom'}
              onChange={(e) => {
                if (e.target.value === 'current') {
                  setSettings({ ...settings, defaultStartTime: 'current' })
                } else if (e.target.value === 'next_hour') {
                  setSettings({ ...settings, defaultStartTime: 'next_hour' })
                } else {
                  // For custom, we'd need a time picker - for now use current time
                  const now = new Date()
                  setSettings({ ...settings, defaultStartTime: now.getHours() * 60 + now.getMinutes() })
                }
              }}
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
            >
              <option value="current">Current Time</option>
              <option value="next_hour">Next Full Hour</option>
              <option value="custom">Custom Time</option>
            </select>
          </div>

          {/* Default Event Duration */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Default Event Duration (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="1440"
              step="5"
              value={settings.defaultEventDuration}
              onChange={(e) => setSettings({ ...settings, defaultEventDuration: parseInt(e.target.value) || 60 })}
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
            />
          </div>
        </div>
      </div>

      {/* Tasks Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Tasks
        </h3>

        <div className="space-y-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-4">
          {/* Allow Creating Tasks */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Allow Creating Tasks
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Enable task creation in calendar
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.allowCreatingTasks}
              onChange={(e) => setSettings({ ...settings, allowCreatingTasks: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Show Completed Tasks */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Show Completed Tasks
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Display completed tasks in task lists
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.showCompletedTasks}
              onChange={(e) => setSettings({ ...settings, showCompletedTasks: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Description Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Description
        </h3>

        <div className="space-y-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-4">
          {/* Display Description */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Display Description
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Show event descriptions in lists
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.displayDescription}
              onChange={(e) => setSettings({ ...settings, displayDescription: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Replace Description */}
          {settings.displayDescription && (
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Replace Description
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Replace location with description
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.replaceDescription}
                onChange={(e) => setSettings({ ...settings, replaceDescription: e.target.checked })}
                className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Time Zones Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Time Zones
        </h3>

        <div className="space-y-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-4">
          {/* Allow Changing Time Zones */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Allow Changing Time Zones
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Enable time zone selection for events
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.allowChangingTimeZones}
              onChange={(e) => setSettings({ ...settings, allowChangingTimeZones: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Default Time Zone */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Default Time Zone
            </label>
            <select
              value={settings.defaultTimeZone}
              onChange={(e) => setSettings({ ...settings, defaultTimeZone: e.target.value })}
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
            >
              <option value="">Use device timezone</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Australia/Sydney">Sydney (AEST)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Import/Export */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Import & Export
        </h3>

        <div className="space-y-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-4">
          {/* Export Events */}
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/calendar/export/ics')
                if (!response.ok) throw new Error('Export failed')
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `calendar-export-${new Date().toISOString().split('T')[0]}.ics`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                window.URL.revokeObjectURL(url)
                alert('Events exported successfully!')
              } catch (err) {
                console.error('Export error:', err)
                alert('Failed to export events')
              }
            }}
            className="w-full px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export Events (ICS)</span>
          </button>

          {/* Import Events */}
          <button
            onClick={async () => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.ics'
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (!file) return
                try {
                  const formData = new FormData()
                  formData.append('file', file)
                  const response = await fetch('/api/calendar/import/ics', {
                    method: 'POST',
                    body: formData,
                  })
                  if (!response.ok) throw new Error('Import failed')
                  alert('Events imported successfully!')
                  router.refresh()
                } catch (err) {
                  console.error('Import error:', err)
                  alert('Failed to import events')
                }
              }
              input.click()
            }}
            className="w-full px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">Import Events (ICS)</span>
          </button>

          {/* Export Settings */}
          <button
            onClick={() => {
              const dataStr = JSON.stringify(settings, null, 2)
              const dataBlob = new Blob([dataStr], { type: 'application/json' })
              const url = window.URL.createObjectURL(dataBlob)
              const a = document.createElement('a')
              a.href = url
              a.download = `calendar-settings-${new Date().toISOString().split('T')[0]}.json`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              window.URL.revokeObjectURL(url)
              alert('Settings exported successfully!')
            }}
            className="w-full px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export Settings</span>
          </button>

          {/* Import Settings */}
          <button
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.json'
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (!file) return
                try {
                  const text = await file.text()
                  const imported = JSON.parse(text)
                  setSettings({ ...settings, ...imported })
                  alert('Settings imported successfully!')
                } catch (err) {
                  console.error('Import error:', err)
                  alert('Failed to import settings')
                }
              }
              input.click()
            }}
            className="w-full px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">Import Settings</span>
          </button>
        </div>
      </div>

      {/* Backups */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Backups
        </h3>

        <div className="space-y-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-4">
          {/* Auto Backup */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Automatic Backups
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automatically backup your calendar data
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoBackup}
              onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Backup Frequency */}
          {settings.autoBackup && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Backup Frequency
              </label>
              <select
                value={settings.backupFrequency}
                onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value as any })}
                className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}

          {/* Manual Backup Button */}
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/calendar/export/ics')
                if (!response.ok) throw new Error('Export failed')
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `calendar-backup-${new Date().toISOString().split('T')[0]}.ics`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                window.URL.revokeObjectURL(url)
                alert('Backup downloaded!')
              } catch (err) {
                console.error('Backup error:', err)
                alert('Failed to create backup')
              }
            }}
            className="w-full px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Create Backup Now</span>
          </button>
        </div>
      </div>

      {/* Delete All Events */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Danger Zone
        </h3>

        <div className="space-y-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-4">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-4 py-2.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-medium">Delete All Events</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-slate-200 dark:border-slate-700/40 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Delete All Events?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              This will permanently delete all events and tasks. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={deleteAllEvents}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="pt-4 border-t border-slate-200/50 dark:border-slate-700/40">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-700 text-white font-medium hover:from-sky-700 hover:to-indigo-800 active:scale-[0.99] transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
