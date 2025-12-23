'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react'
import { format, addDays, subDays, isToday, startOfDay, endOfDay } from 'date-fns'
import { getEventsForDay } from '@/lib/helpers/calendar/EventsHelper'
import { Event } from '@/lib/models/calendar/Event'
import { getDayCodeFromDateTime } from '@/lib/helpers/calendar/Formatter'
import { EventFormModal } from '@/components/calendar/EventFormModal'

function DayViewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dayParam = searchParams.get('day') // YYYYMMdd format
  
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
  const [showEventForm, setShowEventForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  useEffect(() => {
    loadEvents()
  }, [currentDay])

  async function loadEvents() {
    setLoading(true)
    const dayCode = getDayCodeFromDateTime(currentDay)
    const dayEvents = await getEventsForDay(dayCode)
    setEvents(dayEvents)
    setLoading(false)
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 dark:from-slate-950 via-blue-50/30 dark:via-slate-900 to-slate-50 dark:to-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={handlePreviousDay}
              className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <button
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
              onClick={handleNextDay}
              className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleNewEvent}
            className="h-9 w-9 rounded-full flex items-center justify-center bg-gradient-to-r from-sky-600 to-indigo-700 text-white hover:from-sky-700 hover:to-indigo-800 active:scale-95 transition shadow-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day View Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
          {/* Time slots */}
          <div className="divide-y divide-slate-200/50 dark:divide-slate-700/40">
            {timeSlots.map((hour) => {
              const hourStart = new Date(currentDay)
              hourStart.setHours(hour, 0, 0, 0)
              const hourEnd = new Date(currentDay)
              hourEnd.setHours(hour + 1, 0, 0, 0)

              // Find events in this hour
              const hourEvents = events.filter(event => {
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

                  {/* Events */}
                  <div className="flex-1 space-y-2">
                    {hourEvents.length === 0 ? (
                      <div className="text-xs text-slate-400 dark:text-slate-600">
                        No events
                      </div>
                    ) : (
                      hourEvents.map((event) => (
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
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* All-day events section */}
          {events.some(e => (e.flags & 1) !== 0) && (
            <div className="border-t border-slate-200/50 dark:border-slate-700/40 p-4">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                All Day
              </div>
              <div className="space-y-2">
                {events
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
              </div>
            </div>
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
    </main>
  )
}

export default function DayViewPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-slate-50 dark:from-slate-950 via-blue-50/30 dark:via-slate-900 to-slate-50 dark:to-slate-950 flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400">Loading...</div>
      </main>
    }>
      <DayViewContent />
    </Suspense>
  )
}

