'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, Search, Grid3x3, SlidersHorizontal, MoreVertical } from 'lucide-react'
import { format, addWeeks, subWeeks, startOfWeek, addDays, isToday } from 'date-fns'
import { getEventsInRange } from '@/lib/helpers/calendar/EventsHelper'
import { useWeekStartsOn } from '@/lib/calendar/useWeekStartsOn'
import { getWeekStartsOn } from '@/lib/calendar/calendarSettingsStorage'
import { Event } from '@/lib/models/calendar/Event'
import { getDayCodeFromDateTime, getDateTimeFromTS } from '@/lib/helpers/calendar/Formatter'
import { EventFormModal } from '@/components/calendar/EventFormModal'
import { useTranslation } from '@/components/providers/language-provider'
import { ViewSwitcherMenu } from '@/components/calendar/ViewSwitcherMenu'
import { FilterMenu } from '@/components/calendar/FilterMenu'
import { CalendarSettingsMenu } from '@/components/calendar/CalendarSettingsMenu'

type ShiftItem = {
  date: string
  shift_label: string
}

type RotaEvent = {
  id?: string
  title?: string | null
  date?: string | null
  start_at?: string | null
  type?: string | null
  notes?: string | null
}

function WeekViewContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const weekStartsOn = useWeekStartsOn()
  const weekParam = searchParams.get('week') // YYYYMMdd — week start (Mon or Sun per settings)

  const [currentWeek, setCurrentWeek] = useState<Date>(() => {
    if (weekParam) {
      const year = parseInt(weekParam.substring(0, 4))
      const month = parseInt(weekParam.substring(4, 6)) - 1
      const day = parseInt(weekParam.substring(6, 8))
      return new Date(year, month, day)
    }
    const ws = typeof window !== 'undefined' ? getWeekStartsOn() : 1
    return startOfWeek(new Date(), { weekStartsOn: ws })
  })

  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [shifts, setShifts] = useState<ShiftItem[]>([])
  const [loadingShifts, setLoadingShifts] = useState(true)
  const [rotaEvents, setRotaEvents] = useState<RotaEvent[]>([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showViewSwitcher, setShowViewSwitcher] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)

  const weekStart = startOfWeek(currentWeek, { weekStartsOn })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd = addDays(weekStart, 6)

  useEffect(() => {
    loadEvents()
    void loadShifts()
    void loadRotaEvents()
  }, [currentWeek, weekStartsOn])

  async function loadEvents() {
    setLoading(true)
    const fromTS = Math.floor(weekStart.getTime() / 1000)
    const toTS = Math.floor(endOfDay(weekEnd).getTime() / 1000)
    const weekEvents = await getEventsInRange(fromTS, toTS)
    setEvents(weekEvents)
    setLoading(false)
  }

  async function loadShifts() {
    setLoadingShifts(true)
    try {
      const fromIso = format(weekStart, 'yyyy-MM-dd')
      const toIso = format(weekEnd, 'yyyy-MM-dd')
      const res = await fetch(`/api/shifts?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`, {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!res.ok) {
        setShifts([])
        return
      }

      const json = await res.json().catch(() => null)
      const items: ShiftItem[] = (json?.items ?? json?.shifts ?? []) as ShiftItem[]
      setShifts(Array.isArray(items) ? items : [])
    } catch {
      setShifts([])
    } finally {
      setLoadingShifts(false)
    }
  }

  async function loadRotaEvents() {
    try {
      const monthKeys = Array.from(
        new Set(weekDays.map((d) => `${d.getFullYear()}-${d.getMonth() + 1}`)),
      )
      const responses = await Promise.all(
        monthKeys.map(async (key) => {
          const [year, month] = key.split('-').map(Number)
          const res = await fetch(`/api/rota/event?month=${month}&year=${year}`, {
            credentials: 'include',
            cache: 'no-store',
          })
          if (!res.ok) return []
          const json = await res.json().catch(() => null)
          const items: RotaEvent[] = (json?.events ?? json ?? []) as RotaEvent[]
          return Array.isArray(items) ? items : []
        }),
      )
      setRotaEvents(responses.flat())
    } catch {
      setRotaEvents([])
    }
  }

  function endOfDay(date: Date): Date {
    const result = new Date(date)
    result.setHours(23, 59, 59, 999)
    return result
  }

  function handlePreviousWeek() {
    setCurrentWeek(subWeeks(currentWeek, 1))
  }

  function handleNextWeek() {
    setCurrentWeek(addWeeks(currentWeek, 1))
  }

  function handleToday() {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn }))
  }

  function handleNewEvent(day: Date) {
    setSelectedDay(day)
    setSelectedEvent(null)
    setShowEventForm(true)
  }

  function handleEventClick(event: Event) {
    setSelectedEvent(event)
    setSelectedDay(null)
    setShowEventForm(true)
  }

  function handleEventSaved() {
    loadEvents()
  }

  // Weekly timetable window: 01:00 -> 24:00
  const timeSlots = Array.from({ length: 24 }, (_, i) => i + 1)
  const weekGridColumns = '76px repeat(7, minmax(0, 1fr))'

  // Get events for a specific day and hour
  function getEventsForDayHour(day: Date, hour: number): Event[] {
    const hourStart = new Date(day)
    hourStart.setHours(hour, 0, 0, 0)
    const hourEnd = new Date(day)
    hourEnd.setHours(hour + 1, 0, 0, 0)

    return filteredEvents.filter(event => {
      if ((event.flags & 1) !== 0) return false
      const eventStart = getDateTimeFromTS(event.startTS)
      const eventEnd = getDateTimeFromTS(event.endTS)
      return (
        (eventStart >= hourStart && eventStart < hourEnd) ||
        (eventEnd > hourStart && eventEnd <= hourEnd) ||
        (eventStart <= hourStart && eventEnd >= hourEnd)
      )
    })
  }

  // Get all-day events for a day
  function getAllDayEventsForDay(day: Date): Event[] {
    const dayCode = getDayCodeFromDateTime(day)
    return filteredEvents.filter(event => {
      const eventDayCode = getDayCodeFromDateTime(getDateTimeFromTS(event.startTS))
      return eventDayCode === dayCode && (event.flags & 1) !== 0 // FLAG_ALL_DAY
    })
  }

  function getRotaEventsForDay(day: Date): RotaEvent[] {
    const dayIso = format(day, 'yyyy-MM-dd')
    return filteredRotaEvents.filter((event) => {
      const dateStr = event.date ?? (event.start_at ? event.start_at.slice(0, 10) : null)
      return dateStr === dayIso
    })
  }

  function getShiftForDay(day: Date): ShiftItem | null {
    const dayIso = format(day, 'yyyy-MM-dd')
    const item = filteredShifts.find((s) => s.date === dayIso)
    if (!item) return null
    if ((item.shift_label ?? '').toUpperCase() === 'OFF') return null
    return item
  }

  function getShiftTone(shiftLabel?: string | null): {
    headerBg: string
    cellBg: string
    dot: string
  } {
    const label = (shiftLabel ?? '').toLowerCase()
    if (label.includes('night')) {
      return { headerBg: 'bg-red-500/14', cellBg: 'bg-red-500/8', dot: 'bg-red-400' }
    }
    if (label.includes('morning')) {
      return { headerBg: 'bg-emerald-500/14', cellBg: 'bg-emerald-500/8', dot: 'bg-emerald-400' }
    }
    if (label.includes('day')) {
      return { headerBg: 'bg-sky-500/14', cellBg: 'bg-sky-500/8', dot: 'bg-sky-400' }
    }
    if (label.includes('afternoon') || label.includes('evening') || label.includes('late')) {
      return { headerBg: 'bg-violet-500/14', cellBg: 'bg-violet-500/8', dot: 'bg-violet-400' }
    }
    return { headerBg: 'bg-slate-500/12', cellBg: 'bg-slate-500/6', dot: 'bg-slate-400' }
  }

  function getDayLaneTone(day: Date): {
    headerBg: string
    cellBg: string
    dayShift: ShiftItem | null
    hasHoliday: boolean
  } {
    const dayShift = getShiftForDay(day)
    const dayRotaEvents = getRotaEventsForDay(day)
    const hasHoliday = dayRotaEvents.some((e) => (e.type ?? '').toLowerCase() === 'holiday')

    // Holidays always win over shift tint for the whole day lane.
    if (hasHoliday) {
      return {
        headerBg: 'bg-amber-100 dark:bg-amber-500/18',
        cellBg: 'bg-amber-50 dark:bg-amber-500/10',
        dayShift,
        hasHoliday,
      }
    }

    if (dayShift) {
      const shiftTone = getShiftTone(dayShift.shift_label)
      return {
        headerBg: shiftTone.headerBg,
        cellBg: shiftTone.cellBg,
        dayShift,
        hasHoliday,
      }
    }

    return {
      headerBg: isToday(day) ? 'bg-sky-100 dark:bg-sky-500/10' : 'bg-slate-50 dark:bg-[#2a2e36]',
      cellBg: 'bg-white dark:bg-[#262a31]',
      dayShift,
      hasHoliday,
    }
  }

  const isLoadingAny = loading || loadingShifts
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredEvents = events.filter((event) => {
    if (!normalizedQuery) return true
    const title = event.title ?? ''
    const location = event.location ?? ''
    const description = event.description ?? ''
    return `${title} ${location} ${description}`.toLowerCase().includes(normalizedQuery)
  })
  const filteredRotaEvents = rotaEvents.filter((event) => {
    if (!normalizedQuery) return true
    const title = event.title ?? ''
    const notes = event.notes ?? ''
    return `${title} ${notes}`.toLowerCase().includes(normalizedQuery)
  })
  const filteredShifts = shifts.filter((shift) => {
    if (!normalizedQuery) return true
    return (shift.shift_label ?? '').toLowerCase().includes(normalizedQuery)
  })

  const handleViewChange = (view: 'month' | 'week' | 'day' | 'year') => {
    const today = new Date()
    if (view === 'week') {
      const ws = startOfWeek(today, { weekStartsOn })
      router.push(`/calendar/week?week=${format(ws, 'yyyyMMdd')}`)
      return
    }
    if (view === 'day') {
      router.push(`/calendar/day?day=${format(today, 'yyyyMMdd')}`)
      return
    }
    if (view === 'month') {
      router.push(`/rota?month=${format(weekStart, 'yyyy-MM')}`)
      return
    }
    if (view === 'year') {
      router.push(`/calendar/year?year=${format(weekStart, 'yyyy')}`)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
        {/* Search bar (same behavior as day/month views) */}
        <div className="max-w-7xl mx-auto px-3 pt-3 pb-2">
          <div className="relative w-full rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2.5 flex items-center gap-3 shadow-[0_2px_6px_rgba(15,23,42,0.08)]">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
              placeholder={t('calendar.rota.searchPlaceholder')}
              className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t('calendar.rota.changeViewAria')}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition"
                onClick={() => setShowViewSwitcher(true)}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label={t('calendar.filter.title')}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition"
                onClick={() => setShowTasks(true)}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label={t('calendar.rota.settingsAria')}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition"
                onClick={() => setShowSettingsMenu(true)}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-3 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={t('calendar.weekView.backAria')}
            className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={handlePreviousWeek}
              className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleToday}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition"
            >
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </button>

            <button
              onClick={handleNextWeek}
              className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="w-9" /> {/* Spacer */}
        </div>
      </div>

      {/* Week View Content */}
      <div className="max-w-7xl mx-auto px-3 py-4">
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#23262d] border border-slate-200 dark:border-[#343841] shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <div className="overflow-x-auto">
            <div className="grid gap-0 w-full" style={{ gridTemplateColumns: weekGridColumns }}>
              {/* Header row */}
              <div className="h-20 border-b border-slate-200 dark:border-[#3a3f49] px-3 py-2 text-slate-700 dark:text-slate-200">
                <div className="text-lg leading-none">{format(weekStart, 'MMM')}</div>
                <div className="text-xs text-slate-500 dark:text-slate-300">wk. {format(weekStart, 'I')}</div>
              </div>
              {weekDays.map((day) => {
                const laneTone = getDayLaneTone(day)
                const dayShift = laneTone.dayShift
                const shiftTone = getShiftTone(dayShift?.shift_label)
                const dayRotaEvents = getRotaEventsForDay(day)
                const dayAllDayEvents = getAllDayEventsForDay(day)
                const dayTimedEvents = filteredEvents.filter((event) => {
                  const eventDayCode = getDayCodeFromDateTime(getDateTimeFromTS(event.startTS))
                  const dayCode = getDayCodeFromDateTime(day)
                  return eventDayCode === dayCode && (event.flags & 1) === 0
                })
                const holidayCount = dayRotaEvents.filter((e) => (e.type ?? '').toLowerCase() === 'holiday').length
                const hasHoliday = holidayCount > 0
                const hasAnyEvent = dayTimedEvents.length > 0 || dayAllDayEvents.length > 0 || dayRotaEvents.length > 0
                const topHolidayTitle = dayRotaEvents.find((e) => (e.type ?? '').toLowerCase() === 'holiday')?.title ?? null
                const topTimedTitle = dayTimedEvents[0]?.title ?? null
                const topAllDayTitle = dayAllDayEvents[0]?.title ?? null
                return (
                  <div
                    key={`header-${day.toISOString()}`}
                    className={`h-20 border-b border-l border-slate-200 dark:border-[#3a3f49] px-2 py-1.5 text-center ${laneTone.headerBg}`}
                  >
                    <div className="text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-300">{format(day, 'EEE')}</div>
                    <div className="text-[16px] leading-[1] font-light text-slate-800 dark:text-slate-100">{format(day, 'd')}</div>
                    {(dayShift || hasAnyEvent) && (
                      <div className="mt-0.5 flex items-center justify-center gap-1">
                        {hasHoliday && <span className="h-2 w-2 rounded-full bg-amber-400" title={`${holidayCount} holiday`} />}
                        {dayShift && !hasHoliday && <span className={`h-2 w-2 rounded-full ${shiftTone.dot}`} title={dayShift.shift_label} />}
                        {dayTimedEvents.length > 0 && <span className="h-2 w-2 rounded-full bg-sky-300" title={`${dayTimedEvents.length} timed event`} />}
                        {!hasHoliday && dayAllDayEvents.length > 0 && <span className="h-2 w-2 rounded-full bg-indigo-400" title="All-day event" />}
                      </div>
                    )}
                    {hasAnyEvent && (
                      <div className="mt-1 space-y-0.5">
                        {hasHoliday && (
                          <div className="mx-auto w-full max-w-[88px] truncate rounded-md border border-amber-300/70 dark:border-amber-300/70 bg-amber-100 dark:bg-amber-500/20 px-1 py-0.5 text-[9px] font-medium text-amber-800 dark:text-amber-100">
                            {topHolidayTitle || 'Holiday'}
                          </div>
                        )}
                        {!hasHoliday && topAllDayTitle && (
                          <div className="mx-auto w-full max-w-[88px] truncate rounded-md border border-indigo-300/60 dark:border-indigo-300/60 bg-indigo-100 dark:bg-indigo-500/20 px-1 py-0.5 text-[9px] font-medium text-indigo-700 dark:text-indigo-100">
                            {topAllDayTitle}
                          </div>
                        )}
                        {topTimedTitle && (
                          <div className="mx-auto w-full max-w-[88px] truncate rounded-md border border-sky-300/60 dark:border-sky-300/60 bg-sky-100 dark:bg-sky-500/20 px-1 py-0.5 text-[9px] font-medium text-sky-700 dark:text-sky-100">
                            {topTimedTitle}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Time rows */}
              {timeSlots.map((hour) => (
                <div key={`row-${hour}`} className="contents">
                  <div className="h-14 border-b border-slate-200 dark:border-[#343841] px-3 py-1.5 text-slate-600 dark:text-slate-300 text-[14px] leading-[1.1] font-medium">
                    {hour === 24 ? '24:00' : format(new Date(2000, 0, 1, hour), 'HH:00')}
                  </div>
                  {weekDays.map((day) => {
                    const laneTone = getDayLaneTone(day)
                    const hourEvents = hour === 24 ? [] : getEventsForDayHour(day, hour)
                    return (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className={`h-14 border-b border-l border-slate-200 dark:border-[#343841] relative group ${laneTone.cellBg}`}
                      >
                        {hourEvents.length > 0 ? (
                          <div className="absolute inset-0 p-1 space-y-1 overflow-hidden">
                            {hourEvents.slice(0, 2).map((event) => (
                              <button
                                key={event.id || `${event.startTS}-${event.title}`}
                                onClick={() => handleEventClick(event)}
                                className="w-full text-left px-1.5 py-1 rounded-md bg-amber-100 dark:bg-amber-500/25 border border-amber-300 dark:border-amber-400/70 text-[10px] leading-tight truncate text-amber-800 dark:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-500/35 transition"
                                title={event.title}
                              >
                                {format(getDateTimeFromTS(event.startTS), 'HH:mm')} {event.title}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              const newDate = new Date(day)
                              newDate.setHours(hour, 0, 0, 0)
                              handleNewEvent(newDate)
                            }}
                            className="w-full h-full opacity-0 group-hover:opacity-100 transition text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xs"
                          >
                            +
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
        <EventFormModal
          isOpen={showEventForm}
          onClose={() => {
            setShowEventForm(false)
            setSelectedEvent(null)
            setSelectedDay(null)
          }}
          event={selectedEvent}
          defaultDate={selectedDay || undefined}
          onSave={handleEventSaved}
        />
      )}

      {/* Overlays from the search bar buttons */}
      <ViewSwitcherMenu
        isOpen={showViewSwitcher}
        onClose={() => setShowViewSwitcher(false)}
        currentView="week"
        onViewChange={(view) => {
          setShowViewSwitcher(false)
          handleViewChange(view)
        }}
      />
      <FilterMenu isOpen={showTasks} onClose={() => setShowTasks(false)} />
      <CalendarSettingsMenu
        isOpen={showSettingsMenu}
        onClose={() => setShowSettingsMenu(false)}
      />
    </main>
  )
}

function WeekViewSuspenseFallback() {
  const { t } = useTranslation()
  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
      <div className="text-slate-500 dark:text-slate-400">{t('calendar.weekView.loading')}</div>
    </main>
  )
}

export default function WeekViewPage() {
  return (
    <Suspense fallback={<WeekViewSuspenseFallback />}>
      <WeekViewContent />
    </Suspense>
  )
}

