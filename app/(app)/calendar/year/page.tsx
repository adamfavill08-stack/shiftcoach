'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Search, Grid3x3, SlidersHorizontal, MoreVertical } from 'lucide-react'
import { format, addYears, subYears, startOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, startOfWeek, addDays, isToday, isSameMonth } from 'date-fns'
import { getEventsInRange } from '@/lib/helpers/calendar/EventsHelper'
import { Event } from '@/lib/models/calendar/Event'
import { getDayCodeFromDateTime, getDateTimeFromTS } from '@/lib/helpers/calendar/Formatter'
import { useTranslation } from '@/components/providers/language-provider'
import { ViewSwitcherMenu } from '@/components/calendar/ViewSwitcherMenu'
import { FilterMenu } from '@/components/calendar/FilterMenu'
import { CalendarSettingsMenu } from '@/components/calendar/CalendarSettingsMenu'

type RotaEvent = {
  date?: string | null
  start_at?: string | null
  type?: string | null
}

function YearViewContent() {
  const { t } = useTranslation()
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
  const [searchQuery, setSearchQuery] = useState('')
  const [shiftMap, setShiftMap] = useState<Record<string, string>>({})
  const [rotaHolidayMap, setRotaHolidayMap] = useState<Record<string, boolean>>({})
  const [showViewSwitcher, setShowViewSwitcher] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)

  const yearStart = startOfYear(currentYear)
  const yearEnd = new Date(currentYear.getFullYear(), 11, 31, 23, 59, 59)
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd })

  useEffect(() => {
    loadEvents()
    loadShifts()
    void loadRotaHolidays()
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
      const shiftFlags: Record<string, string> = {}

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
                shiftFlags[day.date] = String(day.type).toLowerCase()
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

  async function loadRotaHolidays() {
    try {
      const year = currentYear.getFullYear()
      const holidayFlags: Record<string, boolean> = {}

      await Promise.all(
        Array.from({ length: 12 }, (_, idx) => idx + 1).map(async (month) => {
          try {
            const res = await fetch(`/api/rota/event?month=${month}&year=${year}`, {
              credentials: 'include',
              cache: 'no-store',
            })
            if (!res.ok) return
            const json = await res.json().catch(() => null)
            const items: RotaEvent[] = (json?.events ?? json ?? []) as RotaEvent[]
            if (!Array.isArray(items)) return
            items.forEach((event) => {
              if ((event.type ?? '').toLowerCase() !== 'holiday') return
              const dateStr = event.date ?? (event.start_at ? event.start_at.slice(0, 10) : null)
              if (!dateStr) return
              holidayFlags[dateStr] = true
            })
          } catch {
            // no-op
          }
        }),
      )

      setRotaHolidayMap(holidayFlags)
    } catch {
      setRotaHolidayMap({})
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

  const normalizedQuery = searchQuery.trim().toLowerCase()

  function eventMatchesQuery(event: Event): boolean {
    if (!normalizedQuery) return true
    const title = event.title ?? ''
    const location = event.location ?? ''
    const description = event.description ?? ''
    return `${title} ${location} ${description}`.toLowerCase().includes(normalizedQuery)
  }

  function shiftMatchesQuery(shiftType?: string): boolean {
    if (!normalizedQuery) return true
    return (shiftType ?? '').toLowerCase().includes(normalizedQuery)
  }

  function holidayMatchesQuery(): boolean {
    if (!normalizedQuery) return true
    return 'holiday'.includes(normalizedQuery)
  }

  function handleViewChange(view: 'month' | 'week' | 'day' | 'year') {
    const today = new Date()
    if (view === 'year') {
      router.push(`/calendar/year?year=${format(currentYear, 'yyyy')}`)
      return
    }
    if (view === 'month') {
      router.push(`/rota?month=${format(today, 'yyyy-MM')}`)
      return
    }
    if (view === 'week') {
      const ws = startOfWeek(today, { weekStartsOn: 1 })
      router.push(`/calendar/week?week=${format(ws, 'yyyyMMdd')}`)
      return
    }
    router.push(`/calendar/day?day=${format(today, 'yyyyMMdd')}`)
  }

  // Build mini calendar for a month
  function buildMiniMonthDays(month: Date) {
    const firstDay = startOfMonth(month)
    const lastDay = endOfMonth(month)
    
    const days: Date[] = []
    let current = firstDay
    while (current <= lastDay) {
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
    <main className="min-h-screen bg-slate-100 dark:bg-[#2b2d31] text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/85 dark:bg-[#2b2d31]/95 backdrop-blur-xl border-b border-slate-200/70 dark:border-white/5">
        {/* Search bar */}
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
            aria-label={t('calendar.yearView.backAria')}
            className="h-9 w-9 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-100 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handlePreviousYear}
              className="h-9 w-9 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToday}
              className="text-[22px] leading-none font-light text-slate-800 dark:text-slate-100 px-4 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition"
            >
              {format(currentYear, 'yyyy')}
            </button>

            <button
              type="button"
              onClick={handleNextYear}
              className="h-9 w-9 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-100 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="w-9" /> {/* Spacer */}
        </div>
      </div>

      {/* Year View Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-x-8 gap-y-10">
          {months.map((month) => {
            const monthDays = buildMiniMonthDays(month)
            const isCurrentMonth = isSameMonth(month, new Date())
            
            return (
              <button
                type="button"
                key={month.toISOString()}
                onClick={() => handleMonthClick(month)}
                className="w-full text-left p-0 hover:opacity-95 transition"
              >
                {/* Month header */}
                <div className="relative mb-2 h-6">
                  <div
                    className={`absolute inset-x-0 top-0 text-[14px] leading-none font-medium tracking-wide text-center ${
                      isCurrentMonth ? 'text-amber-500 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {format(month, 'MMMM')}
                  </div>
                </div>

                {/* Calendar grid – mini version of monthly view */}
                <div className="grid grid-cols-7 gap-x-1 gap-y-1 mt-1">
                  {monthDays.map((day) => {
                    const isInMonth = isSameMonth(day, month)
                    const isCurrentDay = isToday(day)
                    const dayEvents = isInMonth ? getEventsForDay(day) : []
                    const hasEvents = dayEvents.some(eventMatchesQuery)
                    const dateISO = format(day, 'yyyy-MM-dd')
                    const shiftType = isInMonth ? shiftMap[dateISO] : undefined
                    const hasShift = !!shiftType && shiftMatchesQuery(shiftType)
                    const hasHolidayFromEvents = isInMonth
                      ? dayEvents.some((event) => eventMatchesQuery(event) && (event.title ?? '').toLowerCase().includes('holiday'))
                      : false
                    const hasHoliday = isInMonth ? ((!!rotaHolidayMap[dateISO] && holidayMatchesQuery()) || hasHolidayFromEvents) : false
                    const hasAnyEvent = hasEvents || hasHoliday
                    const dayTextClass = (() => {
                      if (!isInMonth) return 'text-slate-400 dark:text-slate-600'
                      if (hasHoliday) return 'text-yellow-600 dark:text-yellow-300 font-semibold'
                      if (hasShift) {
                        if (shiftType?.includes('night')) return 'text-red-500 dark:text-red-400'
                        return 'text-sky-600 dark:text-sky-300'
                      }
                      if (hasAnyEvent) return 'text-sky-600 dark:text-sky-300'
                      return 'text-slate-700 dark:text-slate-300'
                    })()

                    return (
                      <div
                        key={day.toISOString()}
                        className={`h-5 flex items-center justify-center text-[12px] tabular-nums relative ${dayTextClass}`}
                      >
                        <span className={`text-[11px] ${isCurrentDay && isInMonth ? 'font-semibold' : ''}`}>
                          {format(day, 'd')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </button>
            )
          })}
        </div>
      </div>
      <ViewSwitcherMenu
        isOpen={showViewSwitcher}
        onClose={() => setShowViewSwitcher(false)}
        currentView="year"
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

function YearViewSuspenseFallback() {
  const { t } = useTranslation()
  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
      <div className="text-slate-500 dark:text-slate-400">{t('calendar.yearView.loading')}</div>
    </main>
  )
}

export default function YearViewPage() {
  return (
    <Suspense fallback={<YearViewSuspenseFallback />}>
      <YearViewContent />
    </Suspense>
  )
}

