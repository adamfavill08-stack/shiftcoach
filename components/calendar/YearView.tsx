'use client'

import { useState, useEffect } from 'react'
import { format, startOfYear, endOfYear, eachMonthOfInterval, eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek, addDays, isToday, isSameMonth, getDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Event } from '@/lib/models/calendar/Event'
import { getEventsForDay } from '@/lib/helpers/calendar/EventsHelper'

interface YearViewProps {
  date: Date
  onDateChange: (date: Date) => void
  onMonthClick: (date: Date) => void
  onEventClick: (event: Event) => void
}

export function YearView({ date, onDateChange, onMonthClick, onEventClick }: YearViewProps) {
  const [yearEvents, setYearEvents] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)

  const year = date.getFullYear()
  const yearStart = startOfYear(date)
  const yearEnd = endOfYear(date)
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd })

  useEffect(() => {
    loadYearEvents()
  }, [year])

  async function loadYearEvents() {
    try {
      setLoading(true)
      const eventsMap = new Map<string, number>()
      
      // Sample events for each month (in a real app, you'd fetch all events for the year)
      // For performance, we'll just count events per month
      for (const month of months) {
        const monthStart = startOfMonth(month)
        const monthEnd = endOfMonth(month)
        
        // Count events in this month (simplified - in production, use a proper query)
        let eventCount = 0
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
        for (const day of daysInMonth) {
          try {
            const dayCode = format(day, 'yyyyMMdd')
            const dayEvents = await getEventsForDay(dayCode)
            eventCount += dayEvents.length
          } catch (err) {
            // Ignore errors for individual days
          }
        }
        
        eventsMap.set(format(month, 'yyyy-MM'), eventCount)
      }
      
      setYearEvents(eventsMap)
    } catch (err) {
      console.error('Error loading year events:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePreviousYear = () => {
    onDateChange(new Date(year - 1, 0, 1))
  }

  const handleNextYear = () => {
    onDateChange(new Date(year + 1, 0, 1))
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  const isCurrentYear = year === new Date().getFullYear()

  return (
    <div className="space-y-4">
      {/* Year Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePreviousYear}
          className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
          aria-label="Previous year"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {year}
          </h2>
          {!isCurrentYear && (
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-lg transition"
            >
              This Year
            </button>
          )}
        </div>
        <button
          onClick={handleNextYear}
          className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
          aria-label="Next year"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Year Grid - 12 Months */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100"></div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {months.map((month) => {
            const monthKey = format(month, 'yyyy-MM')
            const eventCount = yearEvents.get(monthKey) || 0
            const isCurrentMonth = isSameMonth(month, new Date())
            
            // Build mini calendar for this month
            const monthStart = startOfMonth(month)
            const monthEnd = endOfMonth(month)
            const firstDayOfWeek = getDay(monthStart) === 0 ? 7 : getDay(monthStart) // Monday = 1
            const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
            const days: (Date | null)[] = []
            
            // Add empty cells for days before month start
            for (let i = 0; i < firstDayOfWeek - 1; i++) {
              days.push(null)
            }
            
            // Add days of the month
            for (let d = new Date(monthStart); d <= monthEnd; d = addDays(d, 1)) {
              days.push(new Date(d))
            }
            
            // Fill remaining cells to complete weeks
            while (days.length < 42) {
              days.push(null)
            }

            return (
              <button
                key={monthKey}
                onClick={() => onMonthClick(month)}
                className={`p-3 rounded-lg border text-left transition ${
                  isCurrentMonth
                    ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-300 dark:border-sky-700/40'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {format(month, 'MMMM')}
                  </h3>
                  {eventCount > 0 && (
                    <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
                      {eventCount} event{eventCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                {/* Mini Calendar Grid */}
                <div className="grid grid-cols-7 gap-0.5">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                    <div key={idx} className="text-center">
                      <span className="text-[8px] font-semibold text-slate-400 dark:text-slate-500">
                        {day}
                      </span>
                    </div>
                  ))}
                  {days.slice(0, 35).map((day, idx) => {
                    if (!day) {
                      return <div key={idx} className="h-4" />
                    }
                    const isTodayDate = isToday(day)
                    const isOtherMonth = !isSameMonth(day, month)
                    
                    return (
                      <div
                        key={idx}
                        className={`h-4 flex items-center justify-center text-[9px] font-medium ${
                          isTodayDate
                            ? 'bg-sky-500 dark:bg-sky-600 text-white rounded'
                            : isOtherMonth
                              ? 'text-slate-300 dark:text-slate-600'
                              : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {format(day, 'd')}
                      </div>
                    )
                  })}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

