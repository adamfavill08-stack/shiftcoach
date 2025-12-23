'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { format, addWeeks, subWeeks, startOfWeek, addDays, isToday, getDay } from 'date-fns'
import { getEventsInRange } from '@/lib/helpers/calendar/EventsHelper'
import { Event } from '@/lib/models/calendar/Event'
import { getDayCodeFromDateTime, getDateTimeFromTS } from '@/lib/helpers/calendar/Formatter'
import { EventFormModal } from '@/components/calendar/EventFormModal'

export default function WeekViewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const weekParam = searchParams.get('week') // YYYYMMdd format of Monday
  
  const [currentWeek, setCurrentWeek] = useState<Date>(() => {
    if (weekParam) {
      const year = parseInt(weekParam.substring(0, 4))
      const month = parseInt(weekParam.substring(4, 6)) - 1
      const day = parseInt(weekParam.substring(6, 8))
      return new Date(year, month, day)
    }
    return startOfWeek(new Date(), { weekStartsOn: 1 })
  })
  
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showEventForm, setShowEventForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd = addDays(weekStart, 6)

  useEffect(() => {
    loadEvents()
  }, [currentWeek])

  async function loadEvents() {
    setLoading(true)
    const fromTS = Math.floor(weekStart.getTime() / 1000)
    const toTS = Math.floor(endOfDay(weekEnd).getTime() / 1000)
    const weekEvents = await getEventsInRange(fromTS, toTS)
    setEvents(weekEvents)
    setLoading(false)
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
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))
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

  // Generate hourly time slots (24 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => i)

  // Get events for a specific day and hour
  function getEventsForDayHour(day: Date, hour: number): Event[] {
    const hourStart = new Date(day)
    hourStart.setHours(hour, 0, 0, 0)
    const hourEnd = new Date(day)
    hourEnd.setHours(hour + 1, 0, 0, 0)

    return events.filter(event => {
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
    return events.filter(event => {
      const eventDayCode = getDayCodeFromDateTime(getDateTimeFromTS(event.startTS))
      return eventDayCode === dayCode && (event.flags & 1) !== 0 // FLAG_ALL_DAY
    })
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 dark:from-slate-950 via-slate-100 dark:via-slate-950 to-slate-100 dark:to-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-md mx-auto px-3 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
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
              className="text-sm font-semibold px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition"
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
      <div className="max-w-md mx-auto px-3 py-4">
        <div className="relative overflow-hidden rounded-3xl bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/70">
          {/* All-day events row */}
          <div className="border-b border-slate-200/60 dark:border-slate-800/70">
            <div className="grid grid-cols-8 gap-px">
              <div className="p-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                All Day
              </div>
              {weekDays.map((day) => {
                const allDayEvents = getAllDayEventsForDay(day)
                return (
                  <div
                    key={day.toISOString()}
                    className={`p-2 min-h-[60px] ${isToday(day) ? 'bg-sky-50/50 dark:bg-sky-950/20' : ''}`}
                  >
                    {allDayEvents.length > 0 ? (
                      <div className="space-y-1">
                        {allDayEvents.map((event) => (
                          <button
                            key={event.id || `${event.startTS}-${event.title}`}
                            onClick={() => handleEventClick(event)}
                            className="w-full text-left p-2 rounded-lg bg-amber-500/15 dark:bg-amber-500/10 border border-amber-400/60 dark:border-amber-400/60 hover:bg-amber-500/25 dark:hover:bg-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200 transition"
                          >
                            {event.title}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleNewEvent(day)}
                        className="w-full h-full text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition text-xs"
                      >
                        +
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Time slots grid */}
          <div className="overflow-x-auto">
            <div className="grid grid-cols-8 gap-px min-w-[800px]">
              {/* Time column */}
              <div className="border-r border-slate-200/60 dark:border-slate-800/70 bg-slate-50/70 dark:bg-slate-900">
                {timeSlots.map((hour) => (
                  <div
                    key={hour}
                    className="h-20 border-b border-slate-200/60 dark:border-slate-800/70 p-2"
                  >
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-500">
                      {format(new Date(2000, 0, 1, hour), 'h:mm a')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day) => {
                const dayEvents = events.filter(event => {
                  const eventDayCode = getDayCodeFromDateTime(getDateTimeFromTS(event.startTS))
                  const dayCode = getDayCodeFromDateTime(day)
                  return eventDayCode === dayCode && (event.flags & 1) === 0 // Not all-day
                })

                return (
                  <div
                    key={day.toISOString()}
                    className={`border-r border-slate-200/60 dark:border-slate-800/70 last:border-r-0 ${
                      isToday(day) ? 'bg-amber-500/5 dark:bg-amber-500/5' : 'bg-slate-50/60 dark:bg-slate-950/40'
                    }`}
                  >
                    {/* Day header */}
                    <div className="sticky top-0 z-10 p-2 border-b border-slate-200/60 dark:border-slate-800/70 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
                      <div className="text-center">
                        <div className={`text-xs font-semibold uppercase ${
                          isToday(day) 
                            ? 'text-sky-600 dark:text-sky-400' 
                            : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {format(day, 'EEE')}
                        </div>
                        <div className={`text-lg font-semibold mt-1 ${
                          isToday(day)
                            ? 'text-sky-600 dark:text-sky-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    </div>

                    {/* Time slots */}
                    <div className="relative">
                      {timeSlots.map((hour) => {
                        const hourEvents = getEventsForDayHour(day, hour)
                        return (
                          <div
                            key={hour}
                            className="h-20 border-b border-slate-200/60 dark:border-slate-800/70 relative group"
                          >
                            {hourEvents.length > 0 ? (
                              <div className="absolute inset-0 p-1 space-y-0.5">
                                {hourEvents.map((event) => (
                                  <button
                                    key={event.id || `${event.startTS}-${event.title}`}
                                    onClick={() => handleEventClick(event)}
                                    className="w-full text-left p-1.5 rounded bg-amber-500/25 dark:bg-amber-500/20 border border-amber-400/70 dark:border-amber-400/70 hover:bg-amber-500/35 dark:hover:bg-amber-500/30 transition text-[10px] truncate text-amber-950 dark:text-amber-100"
                                    title={event.title}
                                  >
                                    {format(getDateTimeFromTS(event.startTS), 'h:mm')} {event.title}
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
                  </div>
                )
              })}
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
    </main>
  )
}

