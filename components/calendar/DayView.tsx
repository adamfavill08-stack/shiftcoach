'use client'

import { useState, useEffect } from 'react'
import { format, startOfDay, addDays, subDays, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Event } from '@/lib/models/calendar/Event'
import { getEventsForDay } from '@/lib/helpers/calendar/EventsHelper'

interface DayViewProps {
  date: Date
  onDateChange: (date: Date) => void
  onEventClick: (event: Event) => void
  onAddEvent: (date: Date) => void
  getShiftForDate?: (date: Date) => { label: string; type: string | null } | null
}

export function DayView({ date, onDateChange, onEventClick, onAddEvent, getShiftForDate }: DayViewProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [date])

  async function loadEvents() {
    try {
      setLoading(true)
      const dayStart = startOfDay(date)
      const dayCode = format(dayStart, 'yyyyMMdd')
      const dayEvents = await getEventsForDay(dayCode)
      setEvents(dayEvents)
    } catch (err) {
      console.error('Error loading day events:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePreviousDay = () => {
    onDateChange(subDays(date, 1))
  }

  const handleNextDay = () => {
    onDateChange(addDays(date, 1))
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  const dayLabel = format(date, 'EEEE, MMMM d, yyyy')
  const isTodayDate = isToday(date)

  const shiftInfo = getShiftForDate ? getShiftForDate(date) : null

  // Group events by hour
  const eventsByHour: Record<number, Event[]> = {}
  events.forEach((event) => {
    const eventDate = new Date(event.startTS * 1000)
    const hour = eventDate.getHours()
    if (!eventsByHour[hour]) {
      eventsByHour[hour] = []
    }
    eventsByHour[hour].push(event)
  })

  return (
    <div className="space-y-4">
      {/* Day Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePreviousDay}
          className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {dayLabel}
          </h2>
          {!isTodayDate && (
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-lg transition"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={handleNextDay}
          className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
          aria-label="Next day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Shift summary for this day (if available) */}
      {shiftInfo && (
        <div className="rounded-lg border border-slate-200/60 dark:border-slate-700/40 bg-slate-50/70 dark:bg-slate-900/40 px-3 py-2 flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Shift
          </span>
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {shiftInfo.label}
          </span>
        </div>
      )}

      {/* Day Events List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <p className="text-sm">No events for this day</p>
            <button
              onClick={() => onAddEvent(date)}
              className="mt-4 px-4 py-2 rounded-lg bg-sky-600 dark:bg-sky-700 text-white text-sm font-medium hover:bg-sky-700 dark:hover:bg-sky-800 transition"
            >
              Add Event
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 24 }, (_, hour) => {
              const hourEvents = eventsByHour[hour] || []
              if (hourEvents.length === 0) return null

              return (
                <div key={hour} className="flex gap-4">
                  <div className="w-16 text-right pt-1">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
                    </span>
                  </div>
                  <div className="flex-1 space-y-2">
                    {hourEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className="w-full text-left p-3 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {event.title}
                            </h3>
                            {event.location && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {event.location}
                              </p>
                            )}
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                              {format(new Date(event.startTS * 1000), 'h:mm a')} - {format(new Date(event.endTS * 1000), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

