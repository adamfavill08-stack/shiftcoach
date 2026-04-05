'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, Search } from 'lucide-react'
import { format, isToday, startOfMonth, endOfMonth } from 'date-fns'
import { getEventsInRange } from '@/lib/helpers/calendar/EventsHelper'
import { Event } from '@/lib/models/calendar/Event'
import { getDateTimeFromTS } from '@/lib/helpers/calendar/Formatter'
import { EventFormModal } from '@/components/calendar/EventFormModal'
import { useTranslation } from '@/components/providers/language-provider'

export default function ListViewPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showEventForm, setShowEventForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Default to current month
  const [viewStart, setViewStart] = useState(() => startOfMonth(new Date()))
  const [viewEnd, setViewEnd] = useState(() => endOfMonth(new Date()))

  useEffect(() => {
    loadEvents()
  }, [viewStart, viewEnd, searchQuery])

  function endOfDayLocal(date: Date): Date {
    const result = new Date(date)
    result.setHours(23, 59, 59, 999)
    return result
  }

  async function loadEvents() {
    setLoading(true)
    const fromTS = Math.floor(viewStart.getTime() / 1000)
    const toTS = Math.floor(endOfDayLocal(viewEnd).getTime() / 1000)

    const listEvents = await getEventsInRange(fromTS, toTS, undefined, 'event', searchQuery || undefined)
    setEvents(listEvents)
    setLoading(false)
  }

  function handleEventClick(event: Event) {
    setSelectedEvent(event)
    setSelectedDate(null)
    setShowEventForm(true)
  }

  function handleNewEvent() {
    setSelectedEvent(null)
    setSelectedDate(new Date())
    setShowEventForm(true)
  }

  function handleEventSaved() {
    loadEvents()
  }

  // Group events by day
  const eventsByDay = events.reduce((acc, event) => {
    const eventDate = getDateTimeFromTS(event.startTS)
    const dayKey = format(eventDate, 'yyyy-MM-dd')
    if (!acc[dayKey]) {
      acc[dayKey] = []
    }
    acc[dayKey].push(event)
    return acc
  }, {} as Record<string, Event[]>)

  // Sort days
  const sortedDays = Object.keys(eventsByDay).sort()

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={t('calendar.listView.backAria')}
              className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t('calendar.listView.title')}
            </h1>

            <button
              type="button"
              onClick={handleNewEvent}
              aria-label={t('calendar.listView.newEventAria')}
              className="h-9 w-9 rounded-full flex items-center justify-center bg-gradient-to-r from-sky-600 to-indigo-700 text-white hover:from-sky-700 hover:to-indigo-800 active:scale-95 transition shadow-lg"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('calendar.listView.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:focus:ring-sky-400/50 transition"
            />
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            {t('calendar.listView.loading')}
          </div>
        ) : sortedDays.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 dark:text-slate-600 mb-2">{t('calendar.listView.empty')}</div>
            <button
              type="button"
              onClick={handleNewEvent}
              className="text-sm text-sky-600 dark:text-sky-400 hover:underline"
            >
              {t('calendar.listView.createFirstCta')}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDays.map((dayKey) => {
              const dayDate = new Date(dayKey)
              const dayEvents = eventsByDay[dayKey]
              const isCurrentDay = isToday(dayDate)

              return (
                <div
                  key={dayKey}
                  className="relative overflow-hidden rounded-2xl bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 shadow-lg"
                >
                  {/* Day header */}
                  <div className={`px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/40 ${
                    isCurrentDay ? 'bg-sky-50/50 dark:bg-sky-950/20' : ''
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-sm font-semibold ${
                          isCurrentDay 
                            ? 'text-sky-600 dark:text-sky-400' 
                            : 'text-slate-500 dark:text-slate-400'
                        } uppercase tracking-wide`}>
                          {format(dayDate, 'EEEE')}
                        </div>
                        <div className={`text-lg font-semibold mt-1 ${
                          isCurrentDay
                            ? 'text-sky-700 dark:text-sky-300'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {format(dayDate, 'MMMM d, yyyy')}
                        </div>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {dayEvents.length === 1
                          ? t('calendar.listView.eventCountOne', { count: dayEvents.length })
                          : t('calendar.listView.eventCountMany', { count: dayEvents.length })}
                      </div>
                    </div>
                  </div>

                  {/* Events */}
                  <div className="divide-y divide-slate-200/50 dark:divide-slate-700/40">
                    {dayEvents
                      .sort((a, b) => a.startTS - b.startTS)
                      .map((event) => (
                        <button
                          type="button"
                          key={event.id || `${event.startTS}-${event.title}`}
                          onClick={() => handleEventClick(event)}
                          className="w-full text-left px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                        >
                          <div className="flex items-start gap-4">
                            {/* Time */}
                            <div className="flex-shrink-0 w-24 text-sm font-medium text-slate-600 dark:text-slate-400">
                              {format(getDateTimeFromTS(event.startTS), 'h:mm a')}
                              {(event.flags & 1) === 0 && ( // Not all-day
                                <>
                                  {' - '}
                                  {format(getDateTimeFromTS(event.endTS), 'h:mm a')}
                                </>
                              )}
                            </div>

                            {/* Event details */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                                {event.title}
                              </div>
                              {event.location && (
                                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                                  {event.location}
                                </div>
                              )}
                              {event.description && (
                                <div className="text-sm text-slate-500 dark:text-slate-500 line-clamp-2">
                                  {event.description}
                                </div>
                              )}
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

      {/* Event Form Modal */}
      {showEventForm && (
        <EventFormModal
          isOpen={showEventForm}
          onClose={() => {
            setShowEventForm(false)
            setSelectedEvent(null)
            setSelectedDate(null)
          }}
          event={selectedEvent}
          defaultDate={selectedDate || undefined}
          onSave={handleEventSaved}
        />
      )}
    </main>
  )
}
