'use client'

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, Plus, Edit2, Trash2, X, ChevronLeft, Search, Mic, MicOff } from 'lucide-react'
import { buildMonthFromPattern } from '@/lib/data/buildRotaMonth'
import { useRotaMonth } from '@/lib/hooks/useRotaMonth'

// TypeScript types for Speech Recognition
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult
  length: number
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
  length: number
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

declare global {
  interface Window {
    webkitSpeechRecognition: {
      new (): SpeechRecognition
    }
    SpeechRecognition: {
      new (): SpeechRecognition
    }
  }
}

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
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const month = cursorDate.getMonth()
  const year = cursorDate.getFullYear()
  const today = useMemo(() => new Date(), [])
  const todayDate = useMemo(() => {
    const d = new Date(today)
    d.setHours(0, 0, 0, 0)
    return d
  }, [today])

  const { data, eventsByDate, loading, error, refetch } = useRotaMonth(month, year)
  const [sleepByDate, setSleepByDate] = useState<Map<string, any[]>>(new Map())

  // Fetch sleep data for the current month
  const fetchSleepData = useCallback(async () => {
    try {
      const res = await fetch(`/api/sleep/month?month=${month + 1}&year=${year}`, { cache: 'no-store' })
      if (!res.ok) {
        console.error('[RotaOverviewPage] Failed to fetch sleep data:', res.status)
        return
      }
      const json = await res.json()
      const logs = json.logs || []
      
      // Group sleep logs by date
      const sleepMap = new Map<string, any[]>()
      logs.forEach((log: any) => {
        // Try multiple date fields to handle different schema versions
        const dateStr = log.date || 
          (log.end_at ? new Date(log.end_at).toISOString().slice(0, 10) : null) ||
          (log.end_ts ? new Date(log.end_ts).toISOString().slice(0, 10) : null)
        if (!dateStr) return
        
        const existing = sleepMap.get(dateStr) || []
        existing.push(log)
        sleepMap.set(dateStr, existing)
      })
      
      setSleepByDate(sleepMap)
    } catch (err) {
      console.error('[RotaOverviewPage] Error fetching sleep data:', err)
    }
  }, [month, year])

  useEffect(() => {
    fetchSleepData()
    
    // Listen for sleep refresh events
    const handleSleepRefresh = () => {
      fetchSleepData()
      refetch() // Also refresh rota data
    }
    
    // Listen for rota cleared events
    const handleRotaCleared = () => {
      console.log('[RotaOverviewPage] Rota cleared, refreshing data...')
      // Force a complete refresh by clearing state and refetching
      // Use a longer delay to ensure database deletion is complete
      setTimeout(() => {
        console.log('[RotaOverviewPage] Refetching after clear...')
        refetch()
        fetchSleepData()
      }, 500) // Longer delay to ensure API has processed the deletion
    }

    // Listen for rota saved events
    const handleRotaSaved = () => {
      console.log('[RotaOverviewPage] Rota saved, refreshing data...')
      setTimeout(() => {
        refetch()
        fetchSleepData()
      }, 300)
    }

    // Listen for event created/updated events
    const handleEventUpdated = () => {
      console.log('[RotaOverviewPage] Event updated, refreshing data...')
      setTimeout(() => {
        refetch()
        fetchSleepData()
      }, 300)
    }
    
    window.addEventListener('sleep-refreshed', handleSleepRefresh)
    window.addEventListener('rota-cleared', handleRotaCleared)
    window.addEventListener('rota-saved', handleRotaSaved)
    window.addEventListener('event-updated', handleEventUpdated)
    return () => {
      window.removeEventListener('sleep-refreshed', handleSleepRefresh)
      window.removeEventListener('rota-cleared', handleRotaCleared)
      window.removeEventListener('rota-saved', handleRotaSaved)
      window.removeEventListener('event-updated', handleEventUpdated)
    }
  }, [fetchSleepData, refetch])

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
      // Dispatch event so other components know events were updated
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('event-updated'))
      }
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
    router.push(`/calendar/event?edit=${selectedBlock.eventId}`)
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

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript
        setSearchQuery(transcript)
        setIsListening(false)
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        if (event.error === 'no-speech') {
          // User didn't speak, just stop listening
        } else {
          alert('Voice search error. Please try again or type your search.')
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
      setRecognition(recognition)
    }
  }, [])

  // Handle voice search
  const handleVoiceSearch = () => {
    if (!recognitionRef.current) {
      alert('Voice search is not supported in your browser. Please use Chrome, Edge, or Safari.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
      } catch (err) {
        console.error('Error starting speech recognition:', err)
        setIsListening(false)
      }
    }
  }

  // Filter weeks based on search query
  const allWeeksForDisplay = useMemo(() => {
    if (!searchQuery.trim()) {
      return decoratedWeeks.map((week) => {
        return week.map((day) => ({
          ...day,
          events: eventsByDate.get(day.date) ?? [],
        }))
      })
    }

    const query = searchQuery.toLowerCase().trim()
    
    return decoratedWeeks.map((week) => {
      return week.map((day) => {
        const dayEvents = eventsByDate.get(day.date) ?? []
        
        // Check if day matches search (shift label or event title)
        const shiftLabel = day.label ? SLOT_LABELS[day.label] ?? day.label : null
        const shiftMatches = shiftLabel && shiftLabel.toLowerCase().includes(query)
        
        const eventMatches = dayEvents.some(ev => {
          const eventTitle = ev.title || ev.type || ''
          return eventTitle.toLowerCase().includes(query)
        })
        
        // Only show day if it matches search
        if (shiftMatches || eventMatches) {
          return {
            ...day,
            events: dayEvents,
          }
        }
        
        // Return null to hide non-matching days
        return null
      }).filter(day => day !== null) as typeof week
    }).filter(week => week.length > 0)
  }, [decoratedWeeks, eventsByDate, searchQuery])

  return (
    <div className="flex flex-1 justify-center bg-gradient-to-br from-slate-50 dark:from-slate-950 via-white dark:via-slate-900 to-slate-50 dark:to-slate-950">
      {/* Dark status bar background */}
      <div 
        className="fixed top-0 left-0 right-0 w-full bg-slate-900 dark:bg-slate-950 z-50"
        style={{ 
          height: 'calc(env(safe-area-inset-top, 0px) + 0px)',
          minHeight: 'env(safe-area-inset-top, 24px)'
        }}
      />
      <div className="relative flex h-full w-full max-w-md flex-col px-3 py-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <div className="flex flex-1 flex-col min-h-0">
          {/* Header with back button and search */}
          <div className="mb-3 flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 dark:bg-slate-800/50 backdrop-blur-sm shadow-[0_2px_8px_rgba(15,23,42,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] border border-slate-200/60 dark:border-slate-700/40 hover:bg-white dark:hover:bg-slate-800/70 transition-all hover:scale-105 active:scale-95"
              aria-label="Back to dashboard"
            >
              <ChevronLeft className="h-4 w-4 text-slate-700 dark:text-slate-300" strokeWidth={2.5} />
            </button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search shifts and events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-20 py-2 rounded-xl bg-white/95 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/40 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50 focus:border-sky-400/50 dark:focus:border-sky-500/50 shadow-[0_2px_8px_rgba(15,23,42,0.06)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all"
              />
              <button
                type="button"
                onClick={handleVoiceSearch}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                  isListening 
                    ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 animate-pulse' 
                    : 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50'
                }`}
                aria-label="Voice search"
              >
                {isListening ? (
                  <MicOff className="h-3.5 w-3.5" strokeWidth={2} />
                ) : (
                  <Mic className="h-3.5 w-3.5" strokeWidth={2} />
                )}
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-12 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
          
          <div className="mb-2 flex items-center justify-between flex-shrink-0 px-1">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm text-slate-700 dark:text-slate-300 transition-all duration-200 hover:bg-white dark:hover:bg-slate-800/70 hover:shadow-sm active:scale-95 border border-slate-200/40 dark:border-slate-700/40"
              aria-label="Previous month"
            >
              <span className="text-lg font-light leading-none">‹</span>
            </button>

            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 antialiased">{monthLabel}</h2>

            <button
              type="button"
              onClick={goToNextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm text-slate-700 dark:text-slate-300 transition-all duration-200 hover:bg-white dark:hover:bg-slate-800/70 hover:shadow-sm active:scale-95 border border-slate-200/40 dark:border-slate-700/40"
              aria-label="Next month"
            >
              <span className="text-lg font-light leading-none">›</span>
            </button>
          </div>

          {/* All Weeks in One Card */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl bg-white/80 dark:bg-slate-900/45 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/40 p-2.5 pb-20 shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]">
            <div className="space-y-2">
              {allWeeksForDisplay.map((week, weekIdx) => {
                // Helper function to get items for a day
                const getDayItems = (day: typeof week[0]) => {
                  const shiftColor = getColorForType(day.type)
                  const hasShift = shiftColor !== 'transparent'
                  const shiftLabel = day.label ? SLOT_LABELS[day.label] ?? day.label : null
                  const dayEvents = day.events ?? []
                  const daySleep = sleepByDate.get(day.date) || []
                  
                  // Calculate total sleep hours for the day
                  const totalSleepHours = daySleep.reduce((sum, log) => {
                    const hours = log.sleep_hours || 
                      (log.start_at && log.end_at 
                        ? (new Date(log.end_at).getTime() - new Date(log.start_at).getTime()) / 3600000
                        : log.start_ts && log.end_ts
                        ? (new Date(log.end_ts).getTime() - new Date(log.start_ts).getTime()) / 3600000
                        : 0)
                    return sum + hours
                  }, 0)
                  
                  const items = []
                  
                  // Add shift first (if exists)
                  if (hasShift && shiftLabel) {
                    items.push({ 
                      type: 'shift' as const, 
                      label: shiftLabel, 
                      color: shiftColor, 
                      eventId: undefined, 
                      date: day.date 
                    })
                  }
                  
                  // Add all events (holidays, etc.)
                  dayEvents.forEach(ev => {
                    const eventType = ev.type || 'other'
                    const eventColor = ev.color || EVENT_TYPE_COLORS[eventType] || '#64748B'
                    const eventLabel = ev.title || eventType.charAt(0).toUpperCase() + eventType.slice(1)
                    items.push({
                      type: 'event' as const,
                      label: eventLabel,
                      color: eventColor,
                      eventId: ev.id,
                      date: day.date
                    })
                  })
                  
                  // Add sleep indicator last (if exists)
                  if (totalSleepHours > 0) {
                    items.push({
                      type: 'sleep' as const,
                      label: `${totalSleepHours.toFixed(1)}h`,
                      color: '#6366F1',
                      eventId: undefined,
                      date: day.date
                    })
                  }
                  
                  return items
                }

                return (
                  <div key={`week-${weekIdx}`} className={weekIdx > 0 ? 'pt-2' : ''}>
                    {/* Weekday Labels */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {weekdayLabels.map((label, idx) => (
                        <div key={`${label}-${idx}`} className="text-center">
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider antialiased">
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Dates Row */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {week.map((day) => {
                        const isToday = day.isToday
                        return (
                          <div key={day.date} className="flex flex-col items-center">
                            <span
                              className={[
                                'text-xs font-bold antialiased transition-all rounded-md px-1.5 py-1',
                                isToday 
                                  ? 'text-white bg-gradient-to-br from-sky-500 to-indigo-500 dark:from-sky-600 dark:to-indigo-600 shadow-md shadow-sky-500/30 dark:shadow-sky-500/40 scale-105' 
                                  : day.isCurrentMonth 
                                    ? 'text-slate-900 dark:text-slate-100' 
                                    : 'text-slate-400 dark:text-slate-600',
                              ].join(' ')}
                            >
                              {day.dayOfMonth}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* First Event/Shift Blocks Row (below dates) */}
                    <div className="grid grid-cols-7 gap-1 mb-1" style={{ minHeight: '18px' }}>
                      {week.map((day) => {
                        const dayDate = new Date(day.date)
                        dayDate.setHours(0, 0, 0, 0)
                        const isPastMonth = dayDate < todayDate && !day.isCurrentMonth
                        
                        const allItems = getDayItems(day)
                        // Filter out shifts for past months, but keep events
                        const filteredItems = isPastMonth 
                          ? allItems.filter(item => item.type !== 'shift')
                          : allItems
                        
                        // Show first shift if available, otherwise first event
                        const firstShift = filteredItems.find(item => item.type === 'shift')
                        const firstItem = (firstShift || filteredItems[0]) as { type: 'shift' | 'event' | 'sleep', label: string, color: string, eventId?: string, date: string } | undefined
                        const isOtherMonth = !day.isCurrentMonth

                        return (
                          <div key={day.date} className="flex flex-col gap-1 items-stretch">
                            {firstItem && (
                              <div
                                onClick={(e) => {
                                  if (firstItem.type === 'event' && firstItem.eventId) {
                                    handleBlockClick({ type: 'event', eventId: firstItem.eventId, date: firstItem.date, label: firstItem.label }, e)
                                  } else if (firstItem.type === 'shift') {
                                    handleBlockClick({ type: 'shift', eventId: firstItem.eventId, date: firstItem.date, label: firstItem.label }, e)
                                  }
                                }}
                                className={`px-1.5 py-0.5 text-center min-h-[16px] flex items-center justify-center transition-all duration-200 ${
                                  (firstItem.type === 'event' || firstItem.type === 'shift') ? 'cursor-pointer hover:opacity-90 hover:scale-105 active:scale-95' : ''
                                } ${isOtherMonth ? 'opacity-50' : ''}`}
                                style={{ 
                                  backgroundColor: firstItem.color,
                                  boxShadow: firstItem.color !== 'transparent' 
                                    ? `0 1px 3px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)` 
                                    : undefined
                                }}
                              >
                                <span className="text-[9px] font-semibold text-white leading-tight block truncate antialiased drop-shadow-sm">
                                  {firstItem.label}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Second Event/Shift Blocks Row (bottom row - shows all remaining items) */}
                    <div className="grid grid-cols-7 gap-1" style={{ minHeight: '18px' }}>
                      {week.map((day) => {
                        const dayDate = new Date(day.date)
                        dayDate.setHours(0, 0, 0, 0)
                        const isPastMonth = dayDate < todayDate && !day.isCurrentMonth
                        
                        const allItems = getDayItems(day)
                        // Filter out shifts for past months, but keep events
                        const filteredItems = isPastMonth 
                          ? allItems.filter(item => item.type !== 'shift')
                          : allItems
                        
                        // Show all items except the one already shown in first row
                        const firstShift = filteredItems.find(item => item.type === 'shift')
                        const firstItem = firstShift || filteredItems[0]
                        const isOtherMonth = !day.isCurrentMonth
                        
                        // Get all items except the first one shown (simple filter)
                        const remainingItems = filteredItems.filter(item => item !== firstItem) as Array<{ type: 'shift' | 'event' | 'sleep', label: string, color: string, eventId?: string, date: string }>

                        return (
                          <div key={day.date} className="flex flex-col gap-1 items-stretch">
                            {remainingItems.map((item, idx) => (
                              <div
                                key={`${day.date}-bottom-${idx}`}
                                onClick={(e) => {
                                  if (item.type === 'event' && item.eventId) {
                                    handleBlockClick({ type: 'event', eventId: item.eventId, date: item.date, label: item.label }, e)
                                  } else if (item.type === 'shift') {
                                    handleBlockClick({ type: 'shift', eventId: item.eventId, date: item.date, label: item.label }, e)
                                  }
                                }}
                                className={`px-1.5 py-0.5 text-center min-h-[16px] flex items-center justify-center transition-all duration-200 ${
                                  (item.type === 'event' || item.type === 'shift') ? 'cursor-pointer hover:opacity-90 hover:scale-105 active:scale-95' : ''
                                } ${isOtherMonth ? 'opacity-50' : ''}`}
                                style={{ 
                                  backgroundColor: item.color,
                                  boxShadow: item.color !== 'transparent' 
                                    ? `0 1px 3px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)` 
                                    : undefined
                                }}
                              >
                                <span className="text-[9px] font-semibold text-white leading-tight block truncate antialiased drop-shadow-sm">
                                  {item.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {loading && (
            <div className="mt-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-[0_2px_8px_rgba(15,23,42,0.06)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex-shrink-0">
              Loading…
            </div>
          )}

          {!loading && !pattern && (
            <div className="mt-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-gradient-to-br from-slate-50/90 dark:from-slate-800/50 to-white/80 dark:to-slate-900/50 backdrop-blur-sm px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-[0_2px_8px_rgba(15,23,42,0.06)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex-shrink-0">
              No rota set yet. Go to Rota Setup to configure your shift pattern.
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-2xl border border-red-200/60 dark:border-red-800/40 bg-gradient-to-br from-red-50/90 dark:from-red-950/30 to-white/80 dark:to-slate-900/50 backdrop-blur-sm px-4 py-3 text-center text-xs font-semibold text-red-600 dark:text-red-400 shadow-[0_2px_8px_rgba(239,68,68,0.1)] dark:shadow-[0_4px_12px_rgba(239,68,68,0.2)] flex-shrink-0">
              {error}
            </div>
          )}

        </div>

        {/* Edit/Delete Modal */}
        {selectedBlock && (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
              ref={menuRef}
              className="bg-white dark:bg-slate-900/95 rounded-2xl shadow-2xl dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)] p-6 max-w-sm w-full border border-slate-200/80 dark:border-slate-700/40"
            >
              {/* Premium gradient overlay */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/98 dark:from-slate-900/70 via-white/90 dark:via-slate-900/50 to-white/85 dark:to-slate-950/60" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/20 dark:from-blue-950/15 via-transparent to-indigo-50/20 dark:to-indigo-950/15" />
              
              {/* Subtle colored glow hints - dark mode only */}
              <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
              
              {/* Inner ring */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Event Options</h3>
                  <button
                    onClick={() => {
                      setSelectedBlock(null)
                      setDeleteConfirm(false)
                    }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>

                <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedBlock.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm dark:shadow-[0_4px_12px_rgba(59,130,246,0.3)]"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Event
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 text-white rounded-xl font-medium transition-colors shadow-sm dark:shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Event
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-700 dark:text-slate-300 text-center">
                      Are you sure you want to delete this event?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 px-4 py-2.5 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 flex flex-col items-end space-y-2 z-10">
          {menuOpen && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  router.push('/rota/setup')
                }}
                className="flex items-center gap-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/98 dark:bg-slate-800/70 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-200 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 dark:from-sky-600 dark:to-indigo-600 text-xs font-bold text-white shadow-sm">
                  R
                </span>
                Rota Setup
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  router.push('/rota/event')
                }}
                className="flex items-center gap-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/98 dark:bg-slate-800/70 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-200 hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95"
              >
                <CalendarPlus size={18} className="text-sky-500 dark:text-sky-400" strokeWidth={2.5} />
                Event
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 dark:from-sky-600 dark:to-indigo-700 text-white shadow-[0_8px_24px_rgba(14,165,233,0.4)] dark:shadow-[0_8px_24px_rgba(14,165,233,0.5)] transition-all duration-300 hover:shadow-[0_12px_32px_rgba(14,165,233,0.5)] dark:hover:shadow-[0_12px_32px_rgba(14,165,233,0.6)] hover:scale-110 active:scale-95 hover:from-sky-600 hover:to-indigo-700 dark:hover:from-sky-700 dark:hover:to-indigo-800"
            aria-label="Add holiday or task"
          >
            {menuOpen ? (
              <span className="text-3xl font-light leading-none">×</span>
            ) : (
              <Plus className="h-7 w-7" strokeWidth={3} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

