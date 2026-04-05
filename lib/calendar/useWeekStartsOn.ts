'use client'

import { useState, useEffect } from 'react'
import { getWeekStartsOn, CALENDAR_SETTINGS_CHANGED_EVENT } from '@/lib/calendar/calendarSettingsStorage'

/** Live-synced with ShiftCoach calendar settings (week start). */
export function useWeekStartsOn(): 0 | 1 {
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(() =>
    typeof window !== 'undefined' ? getWeekStartsOn() : 1,
  )

  useEffect(() => {
    setWeekStartsOn(getWeekStartsOn())
    const onChange = () => setWeekStartsOn(getWeekStartsOn())
    window.addEventListener(CALENDAR_SETTINGS_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(CALENDAR_SETTINGS_CHANGED_EVENT, onChange)
  }, [])

  return weekStartsOn
}
