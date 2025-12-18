'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, Plus, Edit2, Trash2, X, ChevronLeft, Search } from 'lucide-react'
import { buildMonthFromPattern } from '@/lib/data/buildRotaMonth'
import { useRotaMonth } from '@/lib/hooks/useRotaMonth'

const weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const SLOT_LABELS: Record<string, string> = {
  M: 'Morning',
  A: 'Afternoon',
  D: 'Day',
  N: 'Night',
  O: 'Off',
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  holiday: '#FCD34D', // Yellow for holidays
  overtime: '#F97316',
  training: '#22C55E',
  personal: '#A855F7',
  other: '#64748B',
  event: '#0EA5E9',
}

export default function RotaOverviewPage() {
  const router = useRouter()
  const initial = useMemo(() => new Date(), [])
  const [cursorDate, setCursorDate] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1))
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<{ type: 'event' | 'shift', eventId?: string, date: string, label: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const month = cursorDate.getMonth()
  const year = cursorDate.getFullYear()

  const { data, eventsByDate, loading, error, refetch } = useRotaMonth(month, year)

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        month: 'long',
        year: 'numeric',
      }),
    [],
  )

  const monthLabel = monthFormatter.format(cursorDate)

  const pattern = data?.pattern
  const colorConfig = pattern?.color_config ?? {}

  const fallbackWeeks = useMemo(
    () =>
      buildMonthFromPattern({
        patternSlots: [],
        currentShiftIndex: 0,
        startDate: new Date(year, month, 1).toISOString().slice(0, 10),
        month,
        year,
      }),
    [month, year],
  )

  const weeks = data?.weeks ?? fallbackWeeks

  const resolvedColors = {
    morning: colorConfig.morning ?? colorConfig.day ?? '#2563EB',
    afternoon: colorConfig.afternoon ?? colorConfig.day ?? '#4F46E5',
    day: colorConfig.day ?? colorConfig.morning ?? '#2563EB',
    night: colorConfig.night ?? '#EF4444',
    off: colorConfig.off ?? 'transparent',
  }

  const getColorForType = (type: string | null): string | 'transparent' => {
    if (!type) return 'transparent'
    if (type === 'morning') return resolvedColors.morning
    if (type === 'afternoon') return resolvedColors.afternoon
    if (type === 'day') return resolvedColors.day
    if (type === 'night') return resolvedColors.night
    if (type === 'off') return resolvedColors.off
    return 'transparent'
  }

  const decoratedWeeks = useMemo(() => {
    return weeks.map((week) =>
      week.map((day) => ({
        ...day,
        events: eventsByDate.get(day.date) ?? [],
      })),
    )
  }, [eventsByDate, weeks])

  const goToPrevMonth = () => {
    setMenuOpen(false)
    setCursorDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setMenuOpen(false)
    setCursorDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const handleBlockClick = (item: { type: 'event' | 'shift', eventId?: string, date: string, label: string }, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedBlock(item)
    setDeleteConfirm(false)
  }

  const handleDelete = async () => {
    if (!selectedBlock || !selectedBlock.eventId || deleting) return
    
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/rota/event?id=${selectedBlock.eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        console.error('[RotaOverview] delete error', res.status)
        alert('Failed to delete event')
        return
      }

      setSelectedBlock(null)
      setDeleteConfirm(false)
      refetch()
    } catch (err) {
      console.error('[RotaOverview] delete fatal error', err)
      alert('Failed to delete event')
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = () => {
    if (!selectedBlock || !selectedBlock.eventId) return
    // Navigate to edit page - for now just close and show message
    // TODO: Create edit page or pass event data
    setSelectedBlock(null)
    router.push(`/rota/event?edit=${selectedBlock.eventId}`)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setSelectedBlock(null)
        setDeleteConfirm(false)
      }
    }

    if (selectedBlock) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedBlock])

  const legendItems = useMemo(() => {
    const items: Array<{ label: string; color: string; key: string }> = []
    
    // Add shift types if pattern exists
    if (pattern) {
      if (pattern.shift_length === '8h') {
        items.push(
          { label: 'Morning', color: resolvedColors.morning, key: 'morning' },
          { label: 'Afternoon', color: resolvedColors.afternoon, key: 'afternoon' },
          { label: 'Night', color: resolvedColors.night, key: 'night' },
          { label: 'Off', color: resolvedColors.off === 'transparent' ? '#E5E7EB' : resolvedColors.off, key: 'off' }
        )
      } else {
        items.push(
          { label: 'Day', color: resolvedColors.day, key: 'day' },
          { label: 'Night', color: resolvedColors.night, key: 'night' },
          { label: 'Off', color: resolvedColors.off === 'transparent' ? '#E5E7EB' : resolvedColors.off, key: 'off' }
        )
      }
    }
    
    // Collect unique event types from events on the calendar
    const eventTypesSeen = new Set<string>()
    eventsByDate.forEach((events) => {
      events.forEach((ev) => {
        // Try to determine event type from ev.type, or infer from color
        let eventType = ev.type
        if (!eventType && ev.color) {
          // Try to match color to known event types
          for (const [type, color] of Object.entries(EVENT_TYPE_COLORS)) {
            if (ev.color.toLowerCase() === color.toLowerCase()) {
              eventType = type
              break
            }
          }
        }
        eventType = eventType || 'other'
        
        if (!eventTypesSeen.has(eventType)) {
          eventTypesSeen.add(eventType)
          const eventColor = ev.color || EVENT_TYPE_COLORS[eventType] || '#64748B'
          const eventLabel = eventType.charAt(0).toUpperCase() + eventType.slice(1)
          items.push({ label: eventLabel, color: eventColor, key: `event-${eventType}` })
        }
      })
    })
    
    return items
  }, [pattern, resolvedColors.morning, resolvedColors.afternoon, resolvedColors.day, resolvedColors.night, resolvedColors.off, eventsByDate])

  // Convert all weeks to horizontal display format
  const allWeeksForDisplay = useMemo(() => {
    return decoratedWeeks.map((week) => {
      return week.map((day) => ({
        ...day,
        events: eventsByDate.get(day.date) ?? [],
      }))
    })
  }, [decoratedWeeks, eventsByDate])

  return (
    <div className="flex flex-1 justify-center bg-slate-50">
      <div className="relative flex h-full w-full max-w-md flex-col px-4 py-4">
        <div className="flex flex-1 flex-col min-h-0">
          {/* Header with back button and search */}
          <div className="mb-4 flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm border border-slate-200/60 hover:bg-white transition-all hover:scale-105 active:scale-95"
              aria-label="Back to dashboard"
            >
              <ChevronLeft className="h-5 w-5 text-slate-700" strokeWidth={2} />
            </button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search shifts and events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/90 border border-slate-200/60 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/50 shadow-sm transition-all"
              />
            </div>
          </div>
          
          <div className="mb-3 flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 transition-all duration-200 hover:bg-slate-200/50 active:scale-95"
              aria-label="Previous month"
            >
              <span className="text-xl font-light leading-none">‹</span>
            </button>

            <h2 className="text-base font-semibold tracking-tight text-slate-900 antialiased">{monthLabel}</h2>

            <button
              type="button"
              onClick={goToNextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 transition-all duration-200 hover:bg-slate-200/50 active:scale-95"
              aria-label="Next month"
            >
              <span className="text-xl font-light leading-none">›</span>
            </button>
          </div>

          {/* All Weeks in Horizontal Format */}
          <div className="space-y-2 flex-1 min-h-0">
            {allWeeksForDisplay.map((week, weekIdx) => (
              <div key={`week-${weekIdx}`} className="mb-2">
                {/* Weekday Labels */}
                <div className="grid grid-cols-7 gap-1 mb-1.5">
                  {weekdayLabels.map((label, idx) => (
                    <div key={`${label}-${idx}`} className="text-center">
                      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide antialiased">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Dates Row */}
                <div className="grid grid-cols-7 gap-1 mb-1.5">
                  {week.map((day) => {
                    const isToday = day.isToday
                    return (
                      <div key={day.date} className="flex flex-col items-center">
                        <span
                          className={[
                            'text-xs font-semibold antialiased transition-colors',
                            isToday 
                              ? 'text-white bg-sky-500 rounded-md px-2 py-1 shadow-sm' 
                              : day.isCurrentMonth 
                                ? 'text-slate-900' 
                                : 'text-slate-400',
                          ].join(' ')}
                        >
                          {day.dayOfMonth}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Event/Shift Blocks Row */}
                <div className="grid grid-cols-7 gap-1" style={{ minHeight: '28px' }}>
                  {week.map((day) => {
                    const shiftColor = getColorForType(day.type)
                    const hasShift = shiftColor !== 'transparent'
                    const shiftLabel = day.label ? SLOT_LABELS[day.label] ?? day.label : null
                    const dayEvents = day.events ?? []
                    const allItems = [
                      ...(hasShift ? [{ type: 'shift' as const, label: shiftLabel, color: shiftColor, eventId: undefined, date: day.date }] : []),
                      ...dayEvents.map(ev => {
                        const eventType = ev.type || 'other'
                        const eventColor = ev.color || EVENT_TYPE_COLORS[eventType] || '#64748B'
                        const eventLabel = ev.title || eventType.charAt(0).toUpperCase() + eventType.slice(1)
                        return {
                          type: 'event' as const,
                          label: eventLabel,
                          color: eventColor,
                          eventId: ev.id,
                          date: day.date
                        }
                      }),
                    ]

                    return (
                      <div key={day.date} className="flex flex-col gap-0.5 items-stretch">
                        {allItems.map((item, idx) => (
                          <div
                            key={`${day.date}-${idx}`}
                            onClick={(e) => item.type === 'event' && item.eventId && handleBlockClick(item, e)}
                            className={`rounded-md px-1.5 py-0.5 text-center min-h-[14px] flex items-center justify-center transition-all duration-150 ${
                              item.type === 'event' && item.eventId ? 'cursor-pointer hover:opacity-80 active:scale-95' : ''
                            }`}
                            style={{ 
                              backgroundColor: item.color,
                              boxShadow: item.color !== 'transparent' 
                                ? `0 1px 2px rgba(0,0,0,0.1)` 
                                : undefined
                            }}
                          >
                            <span className="text-[9px] font-medium text-white leading-tight block truncate antialiased">
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {loading && (
            <div className="mt-2 rounded-xl border border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-100/50 px-3 py-2 text-center text-[10px] font-medium text-slate-600 shadow-sm flex-shrink-0">
              Loading…
            </div>
          )}

          {!loading && !pattern && (
            <div className="mt-2 rounded-xl border border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-100/50 px-3 py-2 text-center text-[10px] font-medium text-slate-600 shadow-sm flex-shrink-0">
              No rota set yet. Tap + to get started.
            </div>
          )}

          {error && (
            <div className="mt-2 rounded-xl border border-red-200/60 bg-gradient-to-r from-red-50 to-red-100/50 px-3 py-2 text-center text-[10px] font-medium text-red-600 shadow-sm flex-shrink-0">
              {error}
            </div>
          )}

        </div>

        {/* Edit/Delete Modal */}
        {selectedBlock && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
              ref={menuRef}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-200/80"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Event Options</h3>
                <button
                  onClick={() => {
                    setSelectedBlock(null)
                    setDeleteConfirm(false)
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-sm font-medium text-slate-700">{selectedBlock.label}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(selectedBlock.date).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {!deleteConfirm ? (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleEdit}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors shadow-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Event
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Event
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-700 text-center">
                    Are you sure you want to delete this event?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="flex-1 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="absolute bottom-6 right-6 flex flex-col items-end space-y-3">
          {menuOpen && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  router.push('/rota/new')
                }}
                className="flex items-center gap-2.5 rounded-2xl border border-slate-200/60 bg-white/98 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] hover:scale-105 active:scale-95"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-xs font-bold text-white shadow-sm">
                  R
                </span>
                Rota
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  router.push('/rota/event')
                }}
                className="flex items-center gap-2.5 rounded-2xl border border-slate-200/60 bg-white/98 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] hover:scale-105 active:scale-95"
              >
                <CalendarPlus size={18} className="text-sky-500" strokeWidth={2.5} />
                Event
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
            aria-label="Add holiday or task"
          >
            {menuOpen ? (
              <span className="text-2xl font-light leading-none">×</span>
            ) : (
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
