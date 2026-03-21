'use client'

import { useState, useEffect } from 'react'
import { format, startOfWeek, addDays, subWeeks, addWeeks, isToday, eachDayOfInterval, startOfDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Event } from '@/lib/models/calendar/Event'
import { getEventsForDay } from '@/lib/helpers/calendar/EventsHelper'

interface WeekViewProps {
  date: Date
  onDateChange: (date: Date) => void
  onEventClick: (event: Event) => void
  onAddEvent: (date: Date) => void
  getShiftForDate?: (date: Date) => { label: string; type: string | null } | null
}

export function WeekView({ date, onDateChange, onEventClick, onAddEvent, getShiftForDate }: WeekViewProps) {
  const [weekEvents, setWeekEvents] = useState<Map<string, Event[]>>(new Map())
  const [loading, setLoading] = useState(true)

  const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Monday
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  })

  useEffect(() => {
    loadWeekEvents()
  }, [weekStart])

  async function loadWeekEvents() {
    try {
      setLoading(true)
      const eventsMap = new Map<string, Event[]>()
      
      for (const day of weekDays) {
        const dayStart = startOfDay(day)
        const dayCode = format(dayStart, 'yyyyMMdd')
        const dayEvents = await getEventsForDay(dayCode)
        eventsMap.set(format(day, 'yyyy-MM-dd'), dayEvents)
      }
      
      setWeekEvents(eventsMap)
    } catch (err) {
      console.error('Error loading week events:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePreviousWeek = () => {
    onDateChange(subWeeks(date, 1))
  }

  const handleNextWeek = () => {
    onDateChange(addWeeks(date, 1))
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  const weekLabel = `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
  const isCurrentWeek = weekDays.some(day => isToday(day))

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePreviousWeek}
          className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {weekLabel}
          </h2>
          {!isCurrentWeek && (
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-lg transition"
            >
              This Week
            </button>
          )}
        </div>
        <button
          onClick={handleNextWeek}
          className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
          aria-label="Next week"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Week Grid */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd')
              const dayEvents = weekEvents.get(dayKey) || []
              const isTodayDate = isToday(day)
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              const shiftInfo = getShiftForDate ? getShiftForDate(day) : null

              return (
                <div
                  key={dayKey}
                  className={`flex flex-col rounded-lg border ${
                    isTodayDate
                      ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-300 dark:border-sky-700/40'
                      : isWeekend
                        ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/40'
                        : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/40'
                  }`}
                >
                  {/* Day Header */}
                  <div className="p-2 border-b border-slate-200 dark:border-slate-700/40">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${
                          isTodayDate
                            ? 'text-sky-700 dark:text-sky-300'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {format(day, 'EEE')}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          isTodayDate
                            ? 'text-sky-700 dark:text-sky-300'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>
                    {shiftInfo && (
                      <div className="mt-1 rounded-full bg-slate-100/80 dark:bg-slate-800/60 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 text-center truncate">
                        {shiftInfo.label}
                      </div>
                    )}
                  </div>

                  {/* Day Events */}
                  <div className="flex-1 p-2 space-y-1 min-h-[200px]">
                    {dayEvents.slice(0, 5).map((event) => (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className="w-full text-left p-1.5 rounded text-xs bg-sky-100 dark:bg-sky-950/30 text-sky-900 dark:text-sky-100 hover:bg-sky-200 dark:hover:bg-sky-950/50 transition truncate"
                        title={event.title}
                      >
                        {format(new Date(event.startTS * 1000), 'h:mm a')} {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 5 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                        +{dayEvents.length - 5} more
                      </p>
                    )}
                    {dayEvents.length === 0 && (
                      <button
                        onClick={() => onAddEvent(day)}
                        className="w-full h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
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

