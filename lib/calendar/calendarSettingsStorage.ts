export const CALENDAR_SETTINGS_STORAGE_KEY = 'calendarSettings'

export const CALENDAR_SETTINGS_CHANGED_EVENT = 'shiftcoach-calendar-settings-changed'

export type CalendarViewPreference = 'month' | 'week' | 'day' | 'year'

export type CalendarSettingsStored = {
  showShiftBars?: boolean
  /** date-fns: 0 = Sunday, 1 = Monday */
  weekStartsOn?: 0 | 1
  defaultCalendarView?: CalendarViewPreference
}

export function readCalendarSettings(): CalendarSettingsStored {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CALENDAR_SETTINGS_STORAGE_KEY) : null
    if (!raw) return {}
    return JSON.parse(raw) as CalendarSettingsStored
  } catch {
    return {}
  }
}

export function writeCalendarSettingsPatch(patch: Partial<CalendarSettingsStored>) {
  if (typeof window === 'undefined') return
  const prev = readCalendarSettings()
  localStorage.setItem(CALENDAR_SETTINGS_STORAGE_KEY, JSON.stringify({ ...prev, ...patch }))
  window.dispatchEvent(new CustomEvent(CALENDAR_SETTINGS_CHANGED_EVENT))
}

export function getWeekStartsOn(): 0 | 1 {
  const w = readCalendarSettings().weekStartsOn
  return w === 0 ? 0 : 1
}

export function getDefaultCalendarView(): CalendarViewPreference {
  const v = readCalendarSettings().defaultCalendarView
  if (v === 'week' || v === 'day' || v === 'year' || v === 'month') return v
  return 'month'
}
