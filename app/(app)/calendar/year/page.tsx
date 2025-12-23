'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addYears, subYears, startOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, startOfWeek, addDays, isToday, isSameMonth } from 'date-fns'
import { getEventsInRange } from '@/lib/helpers/calendar/EventsHelper'
import { Event } from '@/lib/models/calendar/Event'
import { getDayCodeFromDateTime, getDateTimeFromTS } from '@/lib/helpers/calendar/Formatter'

function YearViewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const yearParam = searchParams.get('year')
  
  const [currentYear, setCurrentYear] = useState<Date>(() => {
    if (yearParam) {
      return new Date(parseInt(yearParam), 0, 1)
    }
    return startOfYear(new Date())
  })
  
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [shiftMap, setShiftMap] = useState<Record<string, boolean>>({})

  const yearStart = startOfYear(currentYear)
  const yearEnd = new Date(currentYear.getFullYear(), 11, 31, 23, 59, 59)
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd })

  useEffect(() => {
    loadEvents()
    loadShifts()
  }, [currentYear])

  async function loadEvents() {
    setLoading(true)
    const fromTS = Math.floor(yearStart.getTime() / 1000)
    const toTS = Math.floor(yearEnd.getTime() / 1000)
    const yearEvents = await getEventsInRange(fromTS, toTS)
    setEvents(yearEvents)
    setLoading(false)
  }

  async function loadShifts() {
    try {
      const year = currentYear.getFullYear()
      const shiftFlags: Record<string, boolean> = {}

      // Fetch rota data month by month and mark working days
      await Promise.all(
        Array.from({ length: 12 }, (_, idx) => idx).map(async (monthIdx) => {
          try {
            const res = await fetch(`/api/rota/month?month=${monthIdx + 1}&year=${year}`, { cache: 'no-store' })
            if (!res.ok) return
            const json = await res.json()
            if (!json.weeks) return
            json.weeks.flat().forEach((day: any) => {
              if (!day?.date) return
              if (day.type && day.type !== 'off') {
                shiftFlags[day.date] = true
              }
            })
          } catch {
            // Fail silently – shifts just won't appear for that month
          }
        }),
      )

      setShiftMap(shiftFlags)
    } catch {
      // Ignore shift loading errors
    }
  }

  function handlePreviousYear() {
    setCurrentYear(subYears(currentYear, 1))
  }

  function handleNextYear() {
    setCurrentYear(addYears(currentYear, 1))
  }

  function handleToday() {
    setCurrentYear(startOfYear(new Date()))
  }

  function handleMonthClick(month: Date) {
    // Open main rota monthly view focused on this month
    router.push(`/rota?month=${format(month, 'yyyy-MM')}`)
  }

  // Build mini calendar for a month
  function buildMiniMonthDays(month: Date) {
    const firstDay = startOfMonth(month)
    const lastDay = endOfMonth(month)
    const start = startOfWeek(firstDay, { weekStartsOn: 1 })
    const end = startOfWeek(addDays(lastDay, 6), { weekStartsOn: 1 })
    
    const days: Date[] = []
    let current = start
    while (current <= end) {
      days.push(current)
      current = addDays(current, 1)
    }
    
    return days
  }

  // Get events for a day
  function getEventsForDay(day: Date): Event[] {
    const dayCode = getDayCodeFromDateTime(day)
    return events.filter(event => {
      const eventDayCode = getDayCodeFromDateTime(getDateTimeFromTS(event.startTS))
      return eventDayCode === dayCode
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
              onClick={handlePreviousYear}
              className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleToday}
              className="text-lg font-semibold text-slate-900 dark:text-slate-100 px-4 py-2 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition"
            >
              {format(currentYear, 'yyyy')}
            </button>

            <button
              onClick={handleNextYear}
              className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="w-9" /> {/* Spacer */}
        </div>
      </div>

      {/* Year View Content */}
      <div className="max-w-md mx-auto px-3 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {months.map((month) => {
            const monthDays = buildMiniMonthDays(month)
            const isCurrentMonth = isSameMonth(month, new Date())
            
            return (
              <button
                key={month.toISOString()}
                onClick={() => handleMonthClick(month)}
                className="relative overflow-hidden rounded-2xl bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/70 p-4"
              >
                {/* Month header */}
                <div className="flex items-baseline justify-between mb-2">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {format(month, 'MMMM')}
                  </div>
                  {isCurrentMonth && (
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-300 uppercase tracking-wide">
                      Current
                    </span>
                  )}
                </div>

                {/* Weekday labels */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => (
                    <div
                      key={i}
                      className="text-[10px] font-semibold text-slate-400 dark:text-slate-600 text-center"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* Calendar grid – mini version of monthly view */}
                <div className="grid grid-cols-7 gap-1 mt-0.5">
                  {monthDays.map((day) => {
                    const isInMonth = isSameMonth(day, month)
                    const isCurrentDay = isToday(day)
                    const dayEvents = isInMonth ? getEventsForDay(day) : []
                    const hasEvents = dayEvents.length > 0
                    const dateISO = format(day, 'yyyy-MM-dd')
                    const hasShift = !!shiftMap[dateISO] && isInMonth

                    return (
                      <div
                        key={day.toISOString()}
                        className={`aspect-square flex items-center justify-center text-[10px] tabular-nums relative
                          ${isInMonth 
                            ? 'text-slate-900 dark:text-slate-100' 
                            : 'text-slate-300 dark:text-slate-700'
                          }`}
                      >
                        {isCurrentDay && isInMonth ? (
                          // Today – ink circle like monthly view
                          <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900 text-[10px] font-semibold">
                            {format(day, 'd')}
                          </span>
                        ) : hasShift ? (
                          // Shift day – amber ring matching monthly view
                          <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium text-amber-600 dark:text-amber-200">
                            <span className="absolute inset-0 rounded-full border border-amber-400 dark:border-amber-300 bg-amber-50 dark:bg-amber-500/15" />
                            <span className="relative">{format(day, 'd')}</span>
                          </span>
                        ) : (
                          // Normal day
                          <span className="text-[10px]">{format(day, 'd')}</span>
                        )}
                        {hasEvents && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-500 dark:bg-sky-400" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </main>
  )
}

export default function YearViewPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-slate-50 dark:from-slate-950 via-blue-50/30 dark:via-slate-900 to-slate-50 dark:to-slate-950 flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400">Loading...</div>
      </main>
    }>
      <YearViewContent />
    </Suspense>
  )
}

