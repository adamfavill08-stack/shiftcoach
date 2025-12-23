'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Calendar, Plus, Settings, Search, Grid3x3, MoreVertical, ChevronRight } from 'lucide-react'
import { EventFormModal } from '@/components/calendar/EventFormModal'
import { TasksList } from '@/components/calendar/TasksList'
import { TaskFormModal } from '@/components/calendar/TaskFormModal'
import { EventTypesManager } from '@/components/calendar/EventTypesManager'
import { SearchModal } from '@/components/calendar/SearchModal'
import { CalendarSettingsMenu } from '@/components/calendar/CalendarSettingsMenu'
import { FilterMenu } from '@/components/calendar/FilterMenu'
import { ViewSwitcherMenu } from '@/components/calendar/ViewSwitcherMenu'
import { DayView } from '@/components/calendar/DayView'
import { WeekView } from '@/components/calendar/WeekView'
import { YearView } from '@/components/calendar/YearView'
import { AddItemMenu } from '@/components/calendar/AddItemMenu'
import { ShiftSheet } from '@/app/(app)/rota/sheet'
import { useRotaMonth } from '@/lib/hooks/useRotaMonth'
import type { RotaDayType } from '@/lib/data/buildRotaMonth'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  startOfWeek,
  addDays,
  isSameMonth,
  isToday,
  getDay,
  getWeek,
} from 'date-fns'
import { getEventsForDay } from '@/lib/helpers/calendar/EventsHelper'
import { Event } from '@/lib/models/calendar/Event'
import { DayMonthly } from '@/lib/models/calendar/DayMonthly'

// Constants matching Simple Calendar (from Constants.java)
const COLUMN_COUNT = 7
const ROW_COUNT = 6
const DAYS_CNT = COLUMN_COUNT * ROW_COUNT // 42 days

// Extend DayMonthly with shift metadata from the rota calendar
type ShiftAwareDay = DayMonthly & {
  shiftType?: RotaDayType | null
  shiftSlot?: string | null
}

// Build month days - matching MonthlyCalendarImpl.getDays() logic
function buildMonthDays(currentMonth: Date): ShiftAwareDay[] {
  const firstDayOfMonth = startOfMonth(currentMonth)
  const lastDayOfMonth = endOfMonth(currentMonth)
  
  // Get the first day of the week (Monday = 1)
  const firstDayIndex = getDay(firstDayOfMonth) === 0 ? 7 : getDay(firstDayOfMonth)
  
  // Start from the Monday of the week containing the first day of month
  const start = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 })
  
  // Calculate end date to show exactly 42 days (6 weeks) - matching DAYS_CNT
  const end = addDays(start, DAYS_CNT - 1)
  
  const days: ShiftAwareDay[] = []
  const today = new Date()
  const todayCode = format(today, 'yyyyMMdd')
  
  eachDayOfInterval({ start, end }).forEach((date, index) => {
    const isThisMonth = isSameMonth(date, currentMonth)
    const dayCode = format(date, 'yyyyMMdd')
    const isToday = dayCode === todayCode
    const dayOfWeek = getDay(date) === 0 ? 7 : getDay(date) // Convert Sunday (0) to 7
    const isWeekend = dayOfWeek === 6 || dayOfWeek === 7 // Saturday or Sunday
    
    // Calculate week of year
    const weekOfYear = getWeek(date, { weekStartsOn: 1, firstWeekContainsDate: 4 })
    
    days.push({
      value: parseInt(format(date, 'd')),
      isThisMonth,
      isToday,
      code: dayCode,
      weekOfYear,
      dayEvents: [], // Will be populated with events
      indexOnMonthView: index,
      isWeekend,
      date,
      // Shift-specific metadata will be filled from rota data (if available)
      shiftType: undefined,
      shiftSlot: null,
    })
  })
  
  return days
}

export default function TestCalendarPage() {
  const router = useRouter()
  const [month, setMonth] = useState(() => new Date())
  const [currentDate, setCurrentDate] = useState(() => new Date()) // For day/week/year views
  const [selectedDay, setSelectedDay] = useState<ShiftAwareDay | null>(null)
  const [days, setDays] = useState<ShiftAwareDay[]>([])
  const [loading, setLoading] = useState(true)
  const [showEventForm, setShowEventForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [activeTab] = useState<'calendar'>('calendar')
  const [showSearch, setShowSearch] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showViewSwitcher, setShowViewSwitcher] = useState(false)
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'year'>('month')
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showShiftSheet, setShowShiftSheet] = useState(false)
  const [shiftSheetDate, setShiftSheetDate] = useState<string | null>(null)

  // Rota month data (shifts + rota events) – month index is 0-based
  const rotaMonthIndex = month.getMonth()
  const rotaYear = month.getFullYear()
  const { data: rotaMonth } = useRotaMonth(rotaMonthIndex, rotaYear)

  // Resolve shift colours similar to the main rota calendar, but keep visuals soft
  const shiftColorConfig = (rotaMonth?.pattern?.color_config as Record<string, string | null>) ?? {}
  const shiftColors = {
    morning: shiftColorConfig.morning ?? shiftColorConfig.day ?? '#10B981', // emerald
    afternoon: shiftColorConfig.afternoon ?? shiftColorConfig.day ?? '#A855F7', // violet
    day: shiftColorConfig.day ?? shiftColorConfig.morning ?? '#3B82F6', // blue
    night: shiftColorConfig.night ?? '#EF4444', // red
    off: shiftColorConfig.off ?? 'transparent',
  }

  const getShiftColor = (type: RotaDayType | null | undefined): string | null => {
    if (!type) return null
    if (type === 'morning') return shiftColors.morning
    if (type === 'afternoon') return shiftColors.afternoon
    if (type === 'day') return shiftColors.day
    if (type === 'night') return shiftColors.night
    if (type === 'off') return shiftColors.off
    return null
  }

  // Helper for Day/Week views – map a Date to the current shift label/type
  const getShiftForDate = (target: Date): { label: string; type: string | null } | null => {
    const iso = format(target, 'yyyy-MM-dd')
    const match = days.find((d) => format(d.date, 'yyyy-MM-dd') === iso)
    if (!match || !match.shiftType) return null

    const slotToLabel: Record<string, string> = {
      M: 'Morning',
      A: 'Afternoon',
      D: 'Day',
      N: 'Night',
      O: 'Off',
    }

    const labelFromSlot = match.shiftSlot ? slotToLabel[match.shiftSlot] : undefined
    const humanType =
      match.shiftType.charAt(0).toUpperCase() + match.shiftType.slice(1)

    return {
      label: labelFromSlot ?? humanType,
      type: match.shiftType,
    }
  }
  const currentYear = format(new Date(), 'yyyy')
  const monthYear = format(month, 'yyyy')

  useEffect(() => {
    if (monthYear === currentYear) {
      // Build base month days using Simple Calendar logic
      const monthDays = buildMonthDays(month)

      // If we have rota data, merge shift information into the month days
      if (rotaMonth?.weeks && rotaMonth.weeks.length > 0) {
        const rotaByDate = new Map<
          string,
          { type: RotaDayType | null; slot: string | null }
        >()

        rotaMonth.weeks.forEach((week) => {
          week.forEach((rotaDay) => {
            rotaByDate.set(rotaDay.date, {
              type: rotaDay.type,
              slot: rotaDay.label,
            })
          })
        })

        monthDays.forEach((day) => {
          const iso = format(day.date, 'yyyy-MM-dd')
          const rota = rotaByDate.get(iso)
          if (rota) {
            day.shiftType = rota.type
            day.shiftSlot = rota.slot
          } else {
            day.shiftType = undefined
            day.shiftSlot = null
          }
        })
      }

      setDays(monthDays)
      loadEvents(monthDays)
    }
  }, [month, monthYear, currentYear, rotaMonth])

  async function loadEvents(monthDays: ShiftAwareDay[]) {
    try {
      setLoading(true)
      for (const day of monthDays) {
        // Simple Calendar helper expects a YYYYMMdd day code
        const dayCode = format(day.date, 'yyyyMMdd')
        const dayEvents = await getEventsForDay(dayCode)
        day.dayEvents = dayEvents
      }

      setDays([...monthDays])
    } catch (err) {
      console.error('Error loading events:', err)
    } finally {
      setLoading(false)
    }
  }

  const monthName = format(month, 'MMMM')

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        {/* On mobile, let the card fill the full viewport height/width */}
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
          {/* Premium Card Container */}
          <div className="relative overflow-visible rounded-3xl bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_30px_-16px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)] p-4 pb-12 h-[calc(100vh-2.5rem)] sm:h-auto flex flex-col">
            {/* Floating Action Button - Add Event/Shift */}
            {activeTab === 'calendar' && (
              <>
                <button
                  onClick={() => setShowAddMenu(true)}
                  className="absolute bottom-3 right-6 h-12 w-12 rounded-2xl flex items-center justify-center bg-gradient-to-r from-sky-600 to-indigo-700 text-white shadow-lg hover:from-sky-700 hover:to-indigo-800 active:scale-95 transition z-10"
                  aria-label="Add"
                  title="Add Event or Shift"
                >
                  <Plus className="w-5 h-5" strokeWidth={2.5} />
                </button>
                <AddItemMenu
                  isOpen={showAddMenu}
                  onClose={() => setShowAddMenu(false)}
                  onAddEvent={() => {
                    setSelectedEvent(null)
                    // Keep selectedDay if it was set, otherwise use today
                    if (!selectedDay) {
                      setSelectedDay(null)
                    }
                    setShowEventForm(true)
                  }}
                  onAddShift={() => {
                    // Get the selected day or today's date
                    const dateToUse = selectedDay?.date || new Date()
                    const dateISO = format(dateToUse, 'yyyy-MM-dd')
                    setShiftSheetDate(dateISO)
                    setShowShiftSheet(true)
                  }}
                  position={{ bottom: 12, right: 24 }}
                />
              </>
            )}
            {/* Optional inner highlight */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/60 dark:from-slate-900/60 via-transparent to-transparent" />
            
            {/* Subtle colored glow hints - dark mode only */}
            <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
            
            {/* Inner ring for premium feel */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />
            
            <div className="relative z-10">

              {/* Search Bar - Only on Calendar tab */}
              {activeTab === 'calendar' && (
                <div className="mb-4">
                  <div className="relative rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/40 px-4 py-3 flex items-center gap-3">
                    <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Search"
                      onClick={() => setShowSearch(true)}
                      className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                      readOnly
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowViewSwitcher(true)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
                        aria-label="View"
                        title="View"
                      >
                        <Grid3x3 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      </button>
                      <button
                        onClick={() => setShowFilterMenu(true)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
                        aria-label="Tasks"
                        title="Tasks"
                      >
                        <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="4" y="5" width="16" height="2" rx="1" />
                          <rect x="4" y="11" width="12" height="2" rx="1" />
                          <rect x="4" y="17" width="8" height="2" rx="1" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowSettingsMenu(true)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
                        aria-label="Settings"
                        title="Settings"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      </button>
                    </div>
                  </div>
                </div>
              )}


              {/* Content based on active tab */}
              {activeTab === 'calendar' && (
                <>
                  {/* Render appropriate view based on currentView */}
                  {currentView === 'month' && (
                    <>
                      {/* Calendar Navigation Section */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between gap-2 -mx-6">
                          <button
                            onClick={() => {
                              const newMonth = subMonths(month, 1)
                              setMonth(newMonth)
                              setCurrentDate(newMonth)
                            }}
                            className="h-6 w-32 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
                            aria-label="Previous month"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {monthName}
                          </h2>
                          <button
                            onClick={() => {
                              const newMonth = addMonths(month, 1)
                              setMonth(newMonth)
                              setCurrentDate(newMonth)
                            }}
                            className="h-6 w-32 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
                            aria-label="Next month"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Calendar Grid */}
                      <div className="px-2 pb-4">
                        {loading ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100"></div>
                          </div>
                        ) : (
                          <div className="space-y-0">
                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 gap-1 mb-0.5">
                              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                                <div key={idx} className="text-center">
                                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                    {day}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Calendar Days Grid */}
                            <div className="grid grid-cols-7 gap-1">
                              {days.map((day) => {
                                const isOtherMonth = !day.isThisMonth
                                const hasEvents = day.dayEvents && day.dayEvents.length > 0
                                const shiftColor = getShiftColor(day.shiftType)

                                return (
                              <button
                                key={day.code}
                                onClick={() => {
                                  // Default tap: open ShiftSheet for this date (shift-worker behaviour)
                                  const dateISO = format(day.date, 'yyyy-MM-dd')
                                  setSelectedDay(day)
                                  setShiftSheetDate(dateISO)
                                  setShowShiftSheet(true)
                                }}
                                onContextMenu={(e) => {
                                  // Long‑press / right‑click: show add menu for advanced actions
                                  e.preventDefault()
                                  setSelectedDay(day)
                                  setShowAddMenu(true)
                                }}
                                className={`
                                  aspect-square rounded-lg flex flex-col items-center justify-center p-2 transition relative
                                  ${isOtherMonth
                                    ? 'text-slate-300 dark:text-slate-600'
                                    : 'text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                  }
                                `}
                              >
                                    <span
                                      className={`text-xs font-semibold relative ${
                                        day.isToday
                                          ? 'h-6 w-6 rounded-full bg-sky-500 dark:bg-sky-600 text-white flex items-center justify-center'
                                          : ''
                                      }`}
                                      style={
                                        !day.isToday && shiftColor && day.shiftType !== 'off'
                                          ? { color: shiftColor }
                                          : undefined
                                      }
                                    >
                                      {day.value}
                                    </span>
                                    {hasEvents && (
                                      <div className="flex gap-0.5 mt-0.5">
                                        {day.dayEvents.slice(0, 3).map((event, idx) => (
                                          <div
                                            key={idx}
                                            className="h-1 w-1 rounded-full bg-sky-500 dark:bg-sky-400"
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {currentView === 'day' && (
                    <div className="px-2 pb-4">
                      <DayView
                        date={currentDate}
                        onDateChange={setCurrentDate}
                        onEventClick={(event) => {
                          setSelectedEvent(event)
                          setShowEventForm(true)
                        }}
                        onAddEvent={(date) => {
                          setCurrentDate(date)
                          setSelectedDay(null)
                          setSelectedEvent(null)
                          setShowEventForm(true)
                        }}
                        getShiftForDate={getShiftForDate}
                      />
                    </div>
                  )}

                  {currentView === 'week' && (
                    <div className="px-2 pb-4">
                      <WeekView
                        date={currentDate}
                        onDateChange={setCurrentDate}
                        onEventClick={(event) => {
                          setSelectedEvent(event)
                          setShowEventForm(true)
                        }}
                        onAddEvent={(date) => {
                          setCurrentDate(date)
                          setSelectedDay(null)
                          setSelectedEvent(null)
                          setShowEventForm(true)
                        }}
                        getShiftForDate={getShiftForDate}
                      />
                    </div>
                  )}

                  {currentView === 'year' && (
                    <div className="px-2 pb-4">
                      <YearView
                        date={currentDate}
                        onDateChange={setCurrentDate}
                        onMonthClick={(monthDate) => {
                          setCurrentDate(monthDate)
                          setMonth(monthDate)
                          setCurrentView('month')
                        }}
                        onEventClick={(event) => {
                          setSelectedEvent(event)
                          setShowEventForm(true)
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Event Form Modal */}
      {showEventForm && (
        <EventFormModal
          isOpen={showEventForm}
          onClose={() => {
            setShowEventForm(false)
            setSelectedEvent(null)
          }}
          event={selectedEvent}
          defaultDate={selectedDay?.date}
          onSave={() => {
            const monthDays = buildMonthDays(month)
            loadEvents(monthDays)
          }}
        />
      )}

      {/* Search Modal */}
      {showSearch && (
        <SearchModal
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          onEventClick={(event) => {
            setSelectedEvent(event)
            setShowEventForm(true)
          }}
        />
      )}

      {/* Calendar Settings Menu */}
      <CalendarSettingsMenu
        isOpen={showSettingsMenu}
        onClose={() => setShowSettingsMenu(false)}
      />

      {/* Filter/Tasks Menu */}
      <FilterMenu
        isOpen={showFilterMenu}
        onClose={() => setShowFilterMenu(false)}
      />

      {/* View Switcher Menu */}
      <ViewSwitcherMenu
        isOpen={showViewSwitcher}
        onClose={() => setShowViewSwitcher(false)}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {/* Shift Sheet */}
      {showShiftSheet && shiftSheetDate && (
        <ShiftSheet
          dateISO={shiftSheetDate}
          onClose={() => {
            setShowShiftSheet(false)
            setShiftSheetDate(null)
            // Refresh events after shift is saved
            const monthDays = buildMonthDays(month)
            loadEvents(monthDays)
          }}
        />
      )}
    </>
  )
}
