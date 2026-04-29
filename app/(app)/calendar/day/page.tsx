'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, Search, Grid3x3, SlidersHorizontal, MoreVertical } from 'lucide-react'
import { format, addDays, subDays, isToday, startOfWeek } from 'date-fns'
import { getEventsForDay } from '@/lib/helpers/calendar/EventsHelper'
import { Event } from '@/lib/models/calendar/Event'
import { getDayCodeFromDateTime } from '@/lib/helpers/calendar/Formatter'
import { EventFormModal } from '@/components/calendar/EventFormModal'
import { useTranslation } from '@/components/providers/language-provider'
import { useWeekStartsOn } from '@/lib/calendar/useWeekStartsOn'
import { ViewSwitcherMenu } from '@/components/calendar/ViewSwitcherMenu'
import { FilterMenu } from '@/components/calendar/FilterMenu'
import { CalendarSettingsMenu } from '@/components/calendar/CalendarSettingsMenu'

type ShiftItem = {
  date: string
  shift_label: string
}

type ProfileShiftTimes = Record<string, { start?: string; end?: string }>

// Minimal shape for rota events returned from `/api/rota/event`
type RotaEvent = {
  id?: string
  title?: string | null
  date?: string | null
  start_at?: string | null
  end_at?: string | null
  all_day?: boolean | null
  color?: string | null
  type?: string | null
}

function DayViewContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const dayParam = searchParams.get('day') // YYYYMMdd format
  const weekStartsOn = useWeekStartsOn()

  const [searchQuery, setSearchQuery] = useState('')
  
  const [currentDay, setCurrentDay] = useState<Date>(() => {
    if (dayParam) {
      const year = parseInt(dayParam.substring(0, 4))
      const month = parseInt(dayParam.substring(4, 6)) - 1
      const day = parseInt(dayParam.substring(6, 8))
      return new Date(year, month, day)
    }
    return new Date()
  })
  
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [shifts, setShifts] = useState<ShiftItem[]>([])
  const [loadingShifts, setLoadingShifts] = useState(true)
  const [profileShiftTimes, setProfileShiftTimes] = useState<ProfileShiftTimes | null>(null)
  const [rotaEvents, setRotaEvents] = useState<RotaEvent[]>([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showViewSwitcher, setShowViewSwitcher] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)

  useEffect(() => {
    loadEvents()
    void loadShifts()
    void loadRotaEvents()
  }, [currentDay])

  useEffect(() => {
    let cancelled = false
    const loadProfileShiftTimes = async () => {
      try {
        const res = await fetch('/api/profile', { cache: 'no-store', credentials: 'include' })
        if (!res.ok) return
        const json = await res.json()
        const profile = json?.profile ?? json?.data ?? json
        const shiftTimes = profile?.shift_times
        if (!cancelled && shiftTimes && typeof shiftTimes === 'object') {
          setProfileShiftTimes(shiftTimes as ProfileShiftTimes)
        }
      } catch {
        // no-op
      }
    }
    void loadProfileShiftTimes()
    return () => {
      cancelled = true
    }
  }, [])

  async function loadEvents() {
    setLoading(true)
    const dayCode = getDayCodeFromDateTime(currentDay)
    const dayEvents = await getEventsForDay(dayCode)
    setEvents(dayEvents)
    setLoading(false)
  }

  async function loadShifts() {
    setLoadingShifts(true)
    try {
      const dayIso = format(currentDay, 'yyyy-MM-dd')
      const res = await fetch(`/api/shifts?from=${encodeURIComponent(dayIso)}&to=${encodeURIComponent(dayIso)}`, {
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
      const month = currentDay.getMonth() + 1
      const year = currentDay.getFullYear()
      const res = await fetch(`/api/rota/event?month=${month}&year=${year}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) {
        setRotaEvents([])
        return
      }
      const json = await res.json().catch(() => null)
      const items: RotaEvent[] = (json?.events ?? json ?? []) as RotaEvent[]
      setRotaEvents(Array.isArray(items) ? items : [])
    } catch {
      setRotaEvents([])
    }
  }

  function handlePreviousDay() {
    setCurrentDay(subDays(currentDay, 1))
  }

  function handleNextDay() {
    setCurrentDay(addDays(currentDay, 1))
  }

  function handleToday() {
    setCurrentDay(new Date())
  }

  function handleEventClick(event: Event) {
    setSelectedEvent(event)
    setShowEventForm(true)
  }

  function handleNewEvent() {
    setSelectedEvent(null)
    setShowEventForm(true)
  }

  function handleEventSaved() {
    loadEvents()
  }

  const dayCode = getDayCodeFromDateTime(currentDay)
  const isCurrentDay = isToday(currentDay)

  // Generate hourly time slots (24 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => i)

  const nonOffShift = shifts.find(s => (s.shift_label ?? '').toUpperCase() !== 'OFF')
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const dayIso = format(currentDay, 'yyyy-MM-dd')

  const matchesEvent = (ev: Event) => {
    if (!normalizedQuery) return true
    const title = ev.title ?? ''
    const location = ev.location ?? ''
    const description = ev.description ?? ''
    return `${title} ${location} ${description}`.toLowerCase().includes(normalizedQuery)
  }

  const filteredEvents = events.filter(matchesEvent)

  const matchesRotaEvent = (ev: RotaEvent) => {
    if (!normalizedQuery) return true
    const title = ev.title ?? ''
    const notes = (ev as any)?.notes ?? ''
    return `${title} ${notes}`.toLowerCase().includes(normalizedQuery)
  }

  const rotaEventsForDay = rotaEvents.filter(ev => {
    const dateStr = ev.date ?? (ev.start_at ? ev.start_at.slice(0, 10) : null)
    if (dateStr !== dayIso) return false
    return matchesRotaEvent(ev)
  })

  const matchesShift = Boolean(nonOffShift) && (!normalizedQuery || (nonOffShift?.shift_label ?? '').toLowerCase().includes(normalizedQuery))

  const hasTimedEventsMatching = filteredEvents.some(e => (e.flags & 1) === 0)
  const hasAllDayEventsMatching = filteredEvents.some(e => (e.flags & 1) !== 0)
  const hasNonOffShiftMatching = Boolean(matchesShift)

  const isLoadingAny = loading || loadingShifts
  const hasFilteredEvents = filteredEvents.length > 0
  const hasRotaEventsForDay = rotaEventsForDay.length > 0
  const hasAnyEvents = hasFilteredEvents || hasRotaEventsForDay
  const hasAnyItems = hasAnyEvents || hasNonOffShiftMatching

  // If the user only has a shift (no events at all), we want to show just the pill
  // (no extra "card" chrome around it).
  const showBareShiftPill =
    !isLoadingAny &&
    hasNonOffShiftMatching &&
    !hasAnyEvents

  const shiftPillKey = (() => {
    if (!nonOffShift?.shift_label) return null
    const lower = nonOffShift.shift_label.toLowerCase()
    if (lower.includes('night')) return 'night'
    if (lower.includes('morning')) return 'morning'
    if (lower.includes('day')) return 'day'
    if (lower.includes('afternoon') || lower.includes('evening') || lower.includes('late')) return 'afternoon'
    return null
  })()

  const shiftPillDotClass = (() => {
    const key = shiftPillKey
    if (key === 'night') return 'bg-red-500'
    if (key === 'day') return 'bg-sky-500'
    if (key === 'morning') return 'bg-emerald-500'
    if (key === 'afternoon') return 'bg-violet-500'
    return 'bg-slate-500'
  })()

  const shiftPillLabel = (() => {
    const label = nonOffShift?.shift_label?.toString().trim()
    if (!label) return 'Shift'
    const lower = label.toLowerCase()
    if (lower === 'night' || lower === 'nights') return 'Nights'
    if (lower === 'day' || lower === 'days') return 'Days'
    if (lower === 'morning' || lower === 'mornings') return 'Mornings'
    if (lower === 'afternoon' || lower === 'afternoons') return 'Afternoons'
    // Default: capitalize first letter and keep as-is
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  })()

  const shiftPillTimeRange = (() => {
    const start = shiftPillKey ? profileShiftTimes?.[shiftPillKey]?.start : undefined
    const end = shiftPillKey ? profileShiftTimes?.[shiftPillKey]?.end : undefined
    if (!start && !end) return null
    const fmt = (v: string) => v.replace(':', '.')
    const startTxt = start ? fmt(start) : null
    const endTxt = end ? fmt(end) : null
    if (startTxt && endTxt) return `${startTxt} - ${endTxt}`
    return startTxt ?? endTxt
  })()

  const allDayCalendarEvents = filteredEvents.filter(e => (e.flags & 1) !== 0)
  const timedCalendarEvents = filteredEvents.filter(e => (e.flags & 1) === 0)

  const eventPillTitle = (() => {
    const holidayEvent = rotaEventsForDay.find(e => (e.type ?? '').toLowerCase() === 'holiday')
    if (holidayEvent?.title) return holidayEvent.title
    if (allDayCalendarEvents[0]?.title) return allDayCalendarEvents[0].title
    if (timedCalendarEvents[0]?.title) return timedCalendarEvents[0].title
    return 'Event'
  })()

  const eventPillSubtitle = (() => {
    const totalCount = rotaEventsForDay.length + filteredEvents.length
    const holidayCount = rotaEventsForDay.filter(e => (e.type ?? '').toLowerCase() === 'holiday').length
    if (holidayCount > 0) return holidayCount > 1 ? `${holidayCount} holidays` : 'Holiday'
    if (totalCount > 1) return `${totalCount} events`
    if (timedCalendarEvents[0]) {
      const ev = timedCalendarEvents[0]
      return `${format(new Date(ev.startTS * 1000), 'h:mm a')} - ${format(new Date(ev.endTS * 1000), 'h:mm a')}`
    }
    return 'All day'
  })()

  const handleViewChange = (view: 'month' | 'week' | 'day' | 'year') => {
    const day = currentDay
    const today = new Date()
    if (view === 'day') {
      router.push(`/calendar/day?day=${format(today, 'yyyyMMdd')}`)
      return
    }
    if (view === 'week') {
      const ws = startOfWeek(today, { weekStartsOn })
      router.push(`/calendar/week?week=${format(ws, 'yyyyMMdd')}`)
      return
    }
    if (view === 'month') {
      router.push(`/rota?month=${format(day, 'yyyy-MM')}`)
      return
    }
    if (view === 'year') {
      router.push(`/calendar/year?year=${format(day, 'yyyy')}`)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/40">
        {/* Search bar (same as month view) */}
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-4">
          <div className="relative w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 flex items-center gap-3 shadow-[0_2px_6px_rgba(15,23,42,0.04)]">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
              placeholder={t('calendar.rota.searchPlaceholder')}
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t('calendar.rota.changeViewAria')}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition"
                onClick={() => setShowViewSwitcher(true)}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label={t('calendar.filter.title')}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition"
                onClick={() => setShowTasks(true)}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label={t('calendar.rota.settingsAria')}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition"
                onClick={() => setShowSettingsMenu(true)}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={t('calendar.dayView.backAria')}
            className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handlePreviousDay}
              className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleToday}
                className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition ${
                  isCurrentDay
                    ? 'bg-sky-500/20 dark:bg-sky-400/20 text-sky-700 dark:text-sky-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                }`}
              >
                {format(currentDay, 'EEEE, MMMM d, yyyy')}
              </button>
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleNewEvent}
            aria-label={t('calendar.dayView.newEventAria')}
            className="h-9 w-9 rounded-full flex items-center justify-center bg-gradient-to-r from-sky-600 to-indigo-700 text-white hover:from-sky-700 hover:to-indigo-800 active:scale-95 transition shadow-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day View Content */}
      <div
        className={
          showBareShiftPill
            ? 'max-w-4xl mx-auto px-4 pt-2 pb-6'
            : 'max-w-4xl mx-auto px-4 py-6'
        }
      >
        <div
          className={
            showBareShiftPill
              ? 'relative bg-transparent border-0 shadow-none'
              : 'relative overflow-hidden rounded-3xl bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 shadow-[0_24px_60px_rgba(0,0,0,0.5)]'
          }
        >
          {isLoadingAny ? (
            <div className="p-6">
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100" />
              </div>
            </div>
          ) : (
            <>
              {/* Top pills: shift + events/holidays */}
              {(hasNonOffShiftMatching || hasAnyEvents) && (
                <div className={showBareShiftPill ? '' : 'px-4 pt-4'}>
                  <div className="space-y-2">
                    {hasNonOffShiftMatching && nonOffShift && (
                      <div
                        className={
                          'w-full rounded-full bg-slate-900/90 border border-slate-800/60 px-4 py-3 flex items-center gap-3'
                        }
                      >
                        <span
                          className={`h-5 w-5 rounded-full ${shiftPillDotClass}`}
                          aria-hidden
                        />
                        <div className="flex flex-col leading-tight">
                          <span className="text-xs font-medium text-slate-300">{shiftPillLabel}</span>
                          <span className="mt-1 text-[13px] font-semibold text-slate-200 whitespace-nowrap">
                            {shiftPillTimeRange ?? '--.--'}
                          </span>
                        </div>
                      </div>
                    )}

                    {hasAnyEvents && (
                      <div className="w-full rounded-full bg-amber-500/15 border border-amber-300/50 dark:border-amber-700/50 px-4 py-3 flex items-center gap-3">
                        <span className="h-5 w-5 rounded-full bg-amber-400" aria-hidden />
                        <div className="flex flex-col leading-tight">
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                            {eventPillSubtitle}
                          </span>
                          <span className="mt-1 text-[13px] font-semibold text-amber-900 dark:text-amber-100 whitespace-nowrap overflow-hidden text-ellipsis">
                            {eventPillTitle}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Blank day when there are no events AND no shift */}
              {!hasAnyItems ? null : (
                <>
                  {/* Time slots (only if there are timed events) */}
                  {hasFilteredEvents && (
                    <div className="divide-y divide-slate-200/50 dark:divide-slate-700/40">
                      {timeSlots.map((hour) => {
                        const hourStart = new Date(currentDay)
                        hourStart.setHours(hour, 0, 0, 0)
                        const hourEnd = new Date(currentDay)
                        hourEnd.setHours(hour + 1, 0, 0, 0)

                        // Find events in this hour
                        const hourEvents = filteredEvents.filter(event => {
                          const eventStart = new Date(event.startTS * 1000)
                          const eventEnd = new Date(event.endTS * 1000)
                          return (
                            (eventStart >= hourStart && eventStart < hourEnd) ||
                            (eventEnd > hourStart && eventEnd <= hourEnd) ||
                            (eventStart <= hourStart && eventEnd >= hourEnd)
                          )
                        })

                        return (
                          <div
                            key={hour}
                            className="min-h-[80px] flex items-start gap-4 p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                          >
                            {/* Time label */}
                            <div className="w-20 flex-shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400 pt-1">
                              {format(hourStart, 'h:mm a')}
                            </div>

                            {/* Events (blank if none in this hour) */}
                            <div className="flex-1 space-y-2">
                              {hourEvents.map((event) => (
                                <button
                                  key={event.id || `${event.startTS}-${event.title}`}
                                  onClick={() => handleEventClick(event)}
                                  className="w-full text-left p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200/50 dark:border-sky-800/40 hover:bg-sky-100 dark:hover:bg-sky-950/50 transition"
                                >
                                  <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                                    {event.title}
                                  </div>
                                  {event.location && (
                                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                      {event.location}
                                    </div>
                                  )}
                                  <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                    {format(new Date(event.startTS * 1000), 'h:mm a')} - {format(new Date(event.endTS * 1000), 'h:mm a')}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* All-day events section (calendar all-day events + rota holidays) */}
                  {(hasAllDayEventsMatching || hasRotaEventsForDay) && (
                    <div className="border-t border-slate-200/50 dark:border-slate-700/40 p-4">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                        {t('calendar.dayView.allDay')}
                      </div>
                      <div className="space-y-2">
                        {filteredEvents
                          .filter(e => (e.flags & 1) !== 0)
                          .map((event) => (
                            <button
                              key={event.id || `${event.startTS}-${event.title}`}
                              onClick={() => handleEventClick(event)}
                              className="w-full text-left p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition"
                            >
                              <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                                {event.title}
                              </div>
                              {event.location && (
                                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                  {event.location}
                                </div>
                              )}
                            </button>
                          ))}

                        {rotaEventsForDay.map((event, idx) => (
                          <div
                            key={event.id ?? `rota-${dayIso}-${idx}`}
                            className="w-full p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/60"
                          >
                            <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                              {event.title || 'Holiday'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
        <EventFormModal
          isOpen={showEventForm}
          onClose={() => {
            setShowEventForm(false)
            setSelectedEvent(null)
          }}
          event={selectedEvent}
          defaultDate={currentDay}
          onSave={handleEventSaved}
        />
      )}

      {/* Overlays from the search bar buttons */}
      <ViewSwitcherMenu
        isOpen={showViewSwitcher}
        onClose={() => setShowViewSwitcher(false)}
        currentView="day"
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

function DayViewSuspenseFallback() {
  const { t } = useTranslation()
  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
      <div className="text-slate-500 dark:text-slate-400">{t('calendar.dayView.loading')}</div>
    </main>
  )
}

export default function DayViewPage() {
  return (
    <Suspense fallback={<DayViewSuspenseFallback />}>
      <DayViewContent />
    </Suspense>
  )
}

