'use client'

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarPlus, Plus, Edit2, Trash2, X, ChevronLeft, Search, Mic, MicOff, Grid3x3, MoreVertical } from 'lucide-react'
import { buildMonthFromPattern } from '@/lib/data/buildRotaMonth'
import { useRotaMonth } from '@/lib/hooks/useRotaMonth'
import { FilterMenu } from '@/components/calendar/FilterMenu'
import { CalendarSettingsMenu } from '@/components/calendar/CalendarSettingsMenu'
import {
  CALENDAR_SETTINGS_CHANGED_EVENT,
  readCalendarSettings,
  getWeekStartsOn,
  getDefaultCalendarView,
} from '@/lib/calendar/calendarSettingsStorage'
import { reorderRotaWeeksForDisplay, calendarWeekdayLabels } from '@/lib/calendar/reorderRotaWeeks'
import { format as formatDate, startOfWeek } from 'date-fns'
import { ViewSwitcherMenu } from '@/components/calendar/ViewSwitcherMenu'
import { useTranslation, useLanguage } from '@/components/providers/language-provider'
import { intlLocaleForApp } from '@/lib/i18n/supportedLocales'
import { useSubscriptionAccess } from '@/lib/hooks/useSubscriptionAccess'
import { getHistoryLimitDays } from '@/lib/subscription/features'
import { UpgradeCard } from '@/components/subscription/UpgradeCard'
import { authedFetch } from '@/lib/supabase/authedFetch'

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

/** Rota slot letter → i18n key under `calendar.rota.slot.*` */
const SLOT_LABEL_KEYS: Record<string, string> = {
  M: 'calendar.rota.slot.morning',
  A: 'calendar.rota.slot.afternoon',
  D: 'calendar.rota.slot.day',
  N: 'calendar.rota.slot.night',
  O: 'calendar.rota.slot.off',
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  holiday: '#FCD34D', // Yellow for holidays
  overtime: '#F97316',
  training: '#22C55E',
  personal: '#A855F7',
  other: '#64748B',
  event: '#0EA5E9',
}

type RotaOverviewPageProps = {
  initialYearMonth?: string
}

export default function RotaOverviewPage({ initialYearMonth }: RotaOverviewPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const dateLocaleTag = intlLocaleForApp(language)

  // Start at "now" by default; we'll align to monthParam via effect below
  const [cursorDate, setCursorDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<{
    type: 'event' | 'shift'
    eventId?: string
    date: string
    label: string
    color?: string
  } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [showViewSwitcher, setShowViewSwitcher] = useState(false)
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'year'>('month')

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
  const [showTasks, setShowTasks] = useState(false)
  const [profileShiftTimes, setProfileShiftTimes] = useState<Record<string, { start?: string; end?: string }>>({})
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showShiftBars, setShowShiftBars] = useState(true)
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(() =>
    typeof window !== 'undefined' ? getWeekStartsOn() : 1,
  )
  const { isPro, plan } = useSubscriptionAccess()
  const historyLimitDays = getHistoryLimitDays({ isPro, plan })

  // Sync cursorDate with ?month=YYYY-MM (from URL or prop), so year view clicks open that month
  const monthParam = searchParams.get('month') ?? initialYearMonth ?? null

  useEffect(() => {
    if (!monthParam) return
    const [yearStr, monthStr] = monthParam.split('-')
    const parsedYear = Number(yearStr)
    const parsedMonth = Number(monthStr) - 1
    if (Number.isNaN(parsedYear) || Number.isNaN(parsedMonth)) return

    const target = new Date(parsedYear, parsedMonth, 1)
    setCursorDate((prev) => {
      if (
        prev.getFullYear() === target.getFullYear() &&
        prev.getMonth() === target.getMonth()
      ) {
        return prev
      }
      return target
    })
  }, [monthParam])

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

  const reorderedWeeks = useMemo(
    () => reorderRotaWeeksForDisplay(decoratedWeeks, weekStartsOn),
    [decoratedWeeks, weekStartsOn],
  )

  const weekdayLabels = useMemo(() => calendarWeekdayLabels(weekStartsOn), [weekStartsOn])

  const goToPrevMonth = () => {
    if (!canViewPrevMonth) return
    setMenuOpen(false)
    setCursorDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    if (!canViewNextMonth) return
    setMenuOpen(false)
    setCursorDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const minAllowedDate = useMemo(() => {
    if (historyLimitDays == null) return null
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (historyLimitDays - 1))
    return d
  }, [historyLimitDays])

  const maxAllowedDate = useMemo(() => {
    if (historyLimitDays == null) return null
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + (historyLimitDays - 1))
    return d
  }, [historyLimitDays])

  const canViewPrevMonth = useMemo(() => {
    if (!minAllowedDate) return true
    const prevMonth = new Date(cursorDate.getFullYear(), cursorDate.getMonth() - 1, 1)
    const prevMonthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0)
    return prevMonthEnd >= minAllowedDate
  }, [cursorDate, minAllowedDate])

  const canViewNextMonth = useMemo(() => {
    if (!maxAllowedDate) return true
    const nextMonth = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 1)
    return nextMonth <= maxAllowedDate
  }, [cursorDate, maxAllowedDate])

  useEffect(() => {
    if (!maxAllowedDate) return
    const maxMonthStart = new Date(maxAllowedDate.getFullYear(), maxAllowedDate.getMonth(), 1)
    const currentMonthStart = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1)
    if (currentMonthStart > maxMonthStart) {
      setCursorDate(maxMonthStart)
    }
  }, [cursorDate, maxAllowedDate])

  // Swipe gesture state
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number; time: number } | null>(null)
  const calendarCardRef = useRef<HTMLDivElement>(null)

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    setSwipeStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    })
  }, [])

  // Handle touch move (prevent scrolling if horizontal swipe)
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeStart) return
    
    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - swipeStart.x)
    const deltaY = Math.abs(touch.clientY - swipeStart.y)
    
    // If horizontal swipe is clearly dominant (2x more than vertical), prevent vertical scrolling
    // This allows vertical scrolling while still detecting horizontal swipes
    if (deltaX > 20 && deltaX > deltaY * 2) {
      e.preventDefault()
    }
  }, [swipeStart])

  // Handle touch end (detect swipe)
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeStart) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - swipeStart.x
    const deltaY = touch.clientY - swipeStart.y
    const deltaTime = Date.now() - swipeStart.time
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    // Swipe threshold: at least 50px horizontal movement, more horizontal than vertical, and within 300ms
    const minSwipeDistance = 50
    const maxSwipeTime = 300
    const isHorizontalSwipe = absDeltaX > absDeltaY

    if (isHorizontalSwipe && absDeltaX > minSwipeDistance && deltaTime < maxSwipeTime) {
      if (deltaX > 0) {
        // Swipe right = previous month
        goToPrevMonth()
      } else {
        // Swipe left = next month
        goToNextMonth()
      }
    }

    setSwipeStart(null)
  }, [swipeStart, goToPrevMonth, goToNextMonth])

  // Mouse drag handlers for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setSwipeStart({
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!swipeStart) return
    // Prevent text selection during drag
    if (Math.abs(e.clientX - swipeStart.x) > 10) {
      e.preventDefault()
    }
  }, [swipeStart])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!swipeStart) return

    const deltaX = e.clientX - swipeStart.x
    const deltaY = e.clientY - swipeStart.y
    const deltaTime = Date.now() - swipeStart.time
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    // Swipe threshold: at least 100px horizontal movement, more horizontal than vertical, and within 500ms
    const minSwipeDistance = 100
    const maxSwipeTime = 500
    const isHorizontalSwipe = absDeltaX > absDeltaY

    if (isHorizontalSwipe && absDeltaX > minSwipeDistance && deltaTime < maxSwipeTime) {
      if (deltaX > 0) {
        // Swipe right = previous month
        goToPrevMonth()
      } else {
        // Swipe left = next month
        goToNextMonth()
      }
    }

    setSwipeStart(null)
  }, [swipeStart, goToPrevMonth, goToNextMonth])

  const handleBlockClick = (
    item: { type: 'event' | 'shift'; eventId?: string; date: string; label: string; color?: string },
    e: React.MouseEvent,
  ) => {
    e.stopPropagation()
    setSelectedBlock(item)
    setDeleteConfirm(false)
  }

  const handleDelete = async () => {
    if (!selectedBlock || deleting) return
    
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }

    setDeleting(true)
    try {
      let res: Response
      if (selectedBlock.type === 'shift') {
        // Deleting a shift means resetting that rota day to OFF.
        res = await authedFetch('/api/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            date: selectedBlock.date,
            label: 'OFF',
            status: 'PLANNED',
            start_ts: null,
            end_ts: null,
            segments: null,
            notes: null,
          }),
        })
      } else {
        if (!selectedBlock.eventId) return
        res = await authedFetch(`/api/rota/event?id=${selectedBlock.eventId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
      }

      if (!res.ok) {
        console.error('[RotaOverview] delete error', res.status)
        alert(selectedBlock.type === 'shift' ? 'Failed to delete shift' : 'Failed to delete event')
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
      alert(selectedBlock.type === 'shift' ? 'Failed to delete shift' : 'Failed to delete event')
    } finally {
      setDeleting(false)
    }
  }

  const getShiftTimeRangeForLabel = (label?: string | null) => {
    const lower = (label || '').trim().toLowerCase()
    const key =
      lower === 'night'
        ? 'night'
        : lower === 'day'
          ? 'day'
          : lower === 'morning'
            ? 'morning'
            : lower === 'afternoon'
              ? 'afternoon'
              : null
    if (!key) return null
    const slot = profileShiftTimes[key]
    if (!slot?.start || !slot?.end) return null
    return `${slot.start} - ${slot.end}`
  }

  const handleEdit = () => {
    if (!selectedBlock || selectedBlock.type !== 'event' || !selectedBlock.eventId) return
    const target = `/rota/event?edit=${encodeURIComponent(String(selectedBlock.eventId))}`
    setSelectedBlock(null)
    setDeleteConfirm(false)
    router.push(target)
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

  useEffect(() => {
    let cancelled = false
    const loadProfileShiftTimes = async () => {
      try {
        const res = await fetch('/api/profile', { cache: 'no-store', credentials: 'include' })
        if (!res.ok) return
        const json = await res.json()
        const profile = json?.profile ?? json?.data ?? json
        const shiftTimes = profile?.shift_times
        if (!cancelled && shiftTimes && typeof shiftTimes === 'object') {
          setProfileShiftTimes(shiftTimes as Record<string, { start?: string; end?: string }>)
        }
      } catch {
        // no-op: popup will still render without times
      }
    }
    loadProfileShiftTimes()
    return () => {
      cancelled = true
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
      return reorderedWeeks.map((week) => {
        return week.map((day) => ({
          ...day,
          events: eventsByDate.get(day.date) ?? [],
        }))
      })
    }

    const query = searchQuery.toLowerCase().trim()
    
    return reorderedWeeks.map((week) => {
      return week.map((day) => {
        const dayEvents = eventsByDate.get(day.date) ?? []
        
        // Check if day matches search (shift label or event title)
        const shiftLabel = day.label
          ? SLOT_LABEL_KEYS[day.label]
            ? t(SLOT_LABEL_KEYS[day.label])
            : day.label
          : null
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
  }, [reorderedWeeks, eventsByDate, searchQuery, t])

  const isDayLockedByFreeHistory = useCallback(
    (dayIso: string) => {
      if (!minAllowedDate && !maxAllowedDate) return false
      const dayDate = new Date(dayIso)
      dayDate.setHours(0, 0, 0, 0)
      if (minAllowedDate && dayDate < minAllowedDate) return true
      if (maxAllowedDate && dayDate > maxAllowedDate) return true
      return false
    },
    [minAllowedDate, maxAllowedDate],
  )

  const visibleWeeksForDisplay = useMemo(() => {
    if (!minAllowedDate) return allWeeksForDisplay
    return allWeeksForDisplay.filter((week) =>
      week.some((day) => !isDayLockedByFreeHistory(day.date)),
    )
  }, [allWeeksForDisplay, isDayLockedByFreeHistory, minAllowedDate])

  // Load / live-sync calendar settings (from settings sheet)
  useEffect(() => {
    function syncCalendarSettingsFromStorage() {
      try {
        const parsed = readCalendarSettings()
        if (typeof parsed.showShiftBars === 'boolean') {
          setShowShiftBars(parsed.showShiftBars)
        }
        setWeekStartsOn(getWeekStartsOn())
      } catch (err) {
        console.error('[RotaOverviewPage] Failed to load calendarSettings:', err)
      }
    }
    syncCalendarSettingsFromStorage()
    window.addEventListener(CALENDAR_SETTINGS_CHANGED_EVENT, syncCalendarSettingsFromStorage)
    return () => window.removeEventListener(CALENDAR_SETTINGS_CHANGED_EVENT, syncCalendarSettingsFromStorage)
  }, [])

  // Optional default view: redirect away from /rota when user did not open a specific month
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (monthParam) {
      setCurrentView('month')
      return
    }
    const view = getDefaultCalendarView()
    setCurrentView(view)
    if (view === 'month') return

    const baseDate = new Date()
    if (view === 'day') {
      router.replace(`/calendar/day?day=${formatDate(baseDate, 'yyyyMMdd')}`)
      return
    }
    if (view === 'week') {
      const ws = getWeekStartsOn()
      const wk = startOfWeek(baseDate, { weekStartsOn: ws })
      router.replace(`/calendar/week?week=${formatDate(wk, 'yyyyMMdd')}`)
      return
    }
    if (view === 'year') {
      router.replace(`/calendar/year?year=${formatDate(baseDate, 'yyyy')}`)
    }
  }, [monthParam, router])

  const handleViewChange = (view: 'month' | 'week' | 'day' | 'year') => {
    setCurrentView(view)
    const baseDate = cursorDate || todayDate

    if (view === 'month') {
      // Already on month view – just keep user here
      return
    }

    if (view === 'day') {
      // Always open day view on today (not the month cursor), so tasks “today” match what users expect.
      const dayCode = formatDate(todayDate, 'yyyyMMdd')
      router.push(`/calendar/day?day=${dayCode}`)
      return
    }

    if (view === 'week') {
      const weekStart = startOfWeek(todayDate, { weekStartsOn })
      const weekCode = formatDate(weekStart, 'yyyyMMdd')
      router.push(`/calendar/week?week=${weekCode}`)
      return
    }

    if (view === 'year') {
      const year = formatDate(baseDate, 'yyyy')
      router.push(`/calendar/year?year=${year}`)
    }
  }

  return (
    <div className="flex min-h-screen flex-1 justify-center bg-white">
      {/* Light status bar background */}
      <div 
        className="fixed top-0 left-0 right-0 w-full bg-white z-50"
        style={{ 
          height: 'calc(env(safe-area-inset-top, 0px) + 0px)',
          minHeight: 'env(safe-area-inset-top, 24px)'
        }}
      />
      

      <div className="relative flex h-full w-full max-w-md flex-col px-3 py-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>

        {/* Main rota card */}
        <div 
          ref={calendarCardRef}
          className="flex flex-1 flex-col min-h-0 rounded-3xl bg-white shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] px-3.5 py-3.5 gap-3 select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setSwipeStart(null)}
        >
          {/* Header with search + controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex-1">
              <div className="relative rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 flex items-center gap-3 shadow-[0_2px_6px_rgba(15,23,42,0.04)]">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder={t('calendar.rota.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowViewSwitcher(true)}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition"
                    aria-label={t('calendar.rota.changeViewAria')}
                  >
                    <Grid3x3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTasks(true)}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100/80 active:scale-95 transition"
                    aria-label={t('calendar.rota.openTasksAria')}
                  >
                    {/* CalAI-style task icon (stacked filter lines) */}
                    <span className="h-3.5 w-3.5 inline-flex flex-col items-center justify-center gap-[2px]">
                      <span className="block h-[2px] w-3 rounded-full bg-slate-700" />
                      <span className="block h-[2px] w-2 rounded-full bg-slate-700/90" />
                      <span className="block h-[2px] w-[6px] rounded-full bg-slate-700/80" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSettingsMenu(true)}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition"
                    aria-label={t('calendar.rota.settingsAria')}
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Month navigation */}
          <div className="flex items-center justify-between flex-shrink-0 px-1">
            <button
              type="button"
              onClick={goToPrevMonth}
              disabled={!canViewPrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-all duration-200 hover:bg-slate-100 active:scale-95 disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              aria-label={t('calendar.rota.prevMonthAria')}
            >
              <span className="text-lg font-light leading-none">‹</span>
            </button>

            <h2 className="text-base font-bold tracking-tight text-slate-900 antialiased">{monthLabel}</h2>

            <button
              type="button"
              onClick={goToNextMonth}
              disabled={!canViewNextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-all duration-200 hover:bg-slate-100 active:scale-95 disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              aria-label={t('calendar.rota.nextMonthAria')}
            >
              <span className="text-lg font-light leading-none">›</span>
            </button>
          </div>

          {historyLimitDays != null && !canViewPrevMonth ? (
            <div className="flex-shrink-0">
              <UpgradeCard
                title="History beyond 31 days is Pro"
                description="Upgrade to view unlimited shift and event history in your rota."
              />
            </div>
          ) : null}
          {historyLimitDays != null && !canViewNextMonth ? (
            <div className="flex-shrink-0">
              <UpgradeCard
                title="June+ rota planning is Pro"
                description="Upgrade to view and plan shifts/events beyond your 31-day free window."
              />
            </div>
          ) : null}

          {/* Weeks scroll area inside the same card */}
          <div className="flex-1 min-h-0 overflow-y-auto pb-4">
            {/* Weekday labels – shown once at the top, Simple Calendar style */}
            <div className="grid grid-cols-7 gap-1 mb-1 mt-1">
              {weekdayLabels.map((label, idx) => (
                <div key={`${label}-${idx}`} className="text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider antialiased">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {visibleWeeksForDisplay.map((week, weekIdx) => {
                // Helper function to get items for a day
                const getDayItems = (day: typeof week[0]) => {
                  const shiftColor = getColorForType(day.type)
                  const hasShift = shiftColor !== 'transparent'
                  const shiftLabel = day.label
                    ? SLOT_LABEL_KEYS[day.label]
                      ? t(SLOT_LABEL_KEYS[day.label])
                      : day.label
                    : null
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
                    {/* Dates Row */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {week.map((day) => {
                        const lockedByHistory = isDayLockedByFreeHistory(day.date)
                        const isToday = day.isToday
                        return (
                          <div key={day.date} className="flex flex-col items-center justify-center">
                            {lockedByHistory ? (
                              <span className="h-7 w-7" aria-hidden />
                            ) : isToday ? (
                              <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white antialiased transition-all duration-200">
                                <span className="absolute -inset-1 rounded-full bg-sky-500/40 blur-md opacity-80" />
                                <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 border border-sky-500/80">
                                  {day.dayOfMonth}
                                </span>
                              </span>
                            ) : (
                              <span
                                className={`text-xs font-semibold antialiased transition-colors ${
                                  day.isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
                                }`}
                              >
                                {day.dayOfMonth}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* First Event/Shift Blocks Row (below dates) */}
                    {showShiftBars && (
                    <div className="grid grid-cols-7 gap-1 mb-1" style={{ minHeight: '18px' }}>
                      {week.map((day) => {
                        const lockedByHistory = isDayLockedByFreeHistory(day.date)
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
                            {!lockedByHistory && firstItem && (
                              <div
                                onClick={(e) => {
                                  if (firstItem.type === 'event' && firstItem.eventId) {
                                    handleBlockClick({ type: 'event', eventId: firstItem.eventId, date: firstItem.date, label: firstItem.label, color: firstItem.color }, e)
                                  } else if (firstItem.type === 'shift') {
                                    handleBlockClick({ type: 'shift', eventId: firstItem.eventId, date: firstItem.date, label: firstItem.label, color: firstItem.color }, e)
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
                    )}

                    {/* Second Event/Shift Blocks Row (bottom row - shows all remaining items) */}
                    {showShiftBars && (
                    <div className="grid grid-cols-7 gap-1" style={{ minHeight: '18px' }}>
                      {week.map((day) => {
                        const lockedByHistory = isDayLockedByFreeHistory(day.date)
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
                            {!lockedByHistory && remainingItems.map((item, idx) => (
                              <div
                                key={`${day.date}-bottom-${idx}`}
                                onClick={(e) => {
                                  if (item.type === 'event' && item.eventId) {
                                    handleBlockClick({ type: 'event', eventId: item.eventId, date: item.date, label: item.label, color: item.color }, e)
                                  } else if (item.type === 'shift') {
                                    handleBlockClick({ type: 'shift', eventId: item.eventId, date: item.date, label: item.label, color: item.color }, e)
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
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {loading && (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-xs font-semibold text-slate-600 shadow-[0_2px_8px_rgba(15,23,42,0.06)] flex-shrink-0">
              Loading…
            </div>
          )}

          {!loading && !pattern && (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-xs font-semibold text-slate-600 shadow-[0_2px_8px_rgba(15,23,42,0.06)] flex-shrink-0">
              No rota set yet. Go to Rota Setup to configure your shift pattern.
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-xs font-semibold text-red-600 shadow-[0_2px_8px_rgba(239,68,68,0.12)] flex-shrink-0">
              {error}
            </div>
          )}

          {/* Floating Add Button (+) – positioned just under the calendar */}
          <div className="relative mt-1 flex justify-end z-10">
            <div className="flex flex-col items-end space-y-2">
              {menuOpen && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      router.push('/rota/setup')
                    }}
                    className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-200 hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)] hover:scale-105 active:scale-95"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-xs font-bold text-white shadow-sm">
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
                    className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-200 hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)] hover:scale-105 active:scale-95"
                  >
                    <CalendarPlus size={18} className="text-sky-500" strokeWidth={2.5} />
                    Event
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="relative flex h-12 w-12 items-center justify-center rounded-[1.1rem] 
                           bg-slate-900 text-white border border-slate-800/70
                           transition-all duration-300
                           hover:bg-slate-900/95 active:scale-[0.97]"
                aria-label={t('calendar.rota.addHolidayOrTaskAria')}
              >
                {/* Subtle CalAI glow */}
                <span className="pointer-events-none absolute inset-0 rounded-[1.1rem] bg-gradient-to-br from-sky-500/35 via-indigo-500/25 to-purple-500/35 blur-xl opacity-70" />
                <span className="pointer-events-none absolute inset-[1px] rounded-[1.05rem] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950" />
                {menuOpen ? (
                  <span className="relative z-10 text-2xl font-light leading-none">×</span>
                ) : (
                  <Plus className="relative z-10 h-6 w-6" strokeWidth={2.4} />
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Tasks / Filters panel (re-uses calendar FilterMenu with TasksList) */}
        <FilterMenu isOpen={showTasks} onClose={() => setShowTasks(false)} />

        {/* Shift-worker calendar settings (view, colored bars, smart behaviours) */}
        <CalendarSettingsMenu
          isOpen={showSettingsMenu}
          onClose={() => setShowSettingsMenu(false)}
        />

        {/* View Switcher overlay (navigates to Day/Week/Year pages) */}
        <ViewSwitcherMenu
          isOpen={showViewSwitcher}
          onClose={() => setShowViewSwitcher(false)}
          currentView={currentView}
          onViewChange={handleViewChange}
        />

        {/* Event/Shift Options Modal */}
        {selectedBlock && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
              ref={menuRef}
              className="relative bg-white rounded-2xl shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] p-6 max-w-sm w-full border border-slate-100"
              style={{
                borderColor:
                  selectedBlock.type === 'shift' && selectedBlock.color && selectedBlock.color !== 'transparent'
                    ? selectedBlock.color
                    : undefined,
              }}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedBlock.type === 'shift' ? 'Shift Options' : t('calendar.rota.eventOptions')}
                  </h3>
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

                <div
                  className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200"
                  style={{
                    borderColor:
                      selectedBlock.type === 'shift' && selectedBlock.color && selectedBlock.color !== 'transparent'
                        ? selectedBlock.color
                        : undefined,
                  }}
                >
                  <p className="text-sm font-medium text-slate-700">{selectedBlock.label}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(selectedBlock.date).toLocaleDateString(dateLocaleTag, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  {selectedBlock.type === 'shift' && getShiftTimeRangeForLabel(selectedBlock.label) ? (
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      {getShiftTimeRangeForLabel(selectedBlock.label)}
                    </p>
                  ) : null}
                </div>

                {!deleteConfirm ? (
                  <div className="flex flex-col gap-2">
                    {selectedBlock.type === 'event' ? (
                      <button
                        onClick={handleEdit}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
                                   bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950
                                   text-slate-50 font-medium
                                   shadow-[0_14px_40px_rgba(15,23,42,0.35)]
                                   hover:brightness-110 active:scale-[0.98]
                                   border border-slate-800/70 transition-all"
                      >
                        <Edit2 className="w-4 h-4 text-sky-300" />
                        {t('calendar.rota.editEvent')}
                      </button>
                    ) : null}
                    <button
                      onClick={handleDelete}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
                                 bg-gradient-to-r from-red-500 via-rose-500 to-red-600
                                 text-white font-medium
                                 shadow-[0_14px_40px_rgba(239,68,68,0.4)]
                                 hover:brightness-110 active:scale-[0.98]
                                 border border-red-500/80 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                      {selectedBlock.type === 'shift' ? 'Delete Shift' : t('calendar.rota.deleteEvent')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-700 text-center">
                      {selectedBlock.type === 'shift'
                        ? 'Are you sure you want to delete this shift?'
                        : t('calendar.rota.deleteConfirmQuestion')}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                      >
                        {t('calendar.rota.cancel')}
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                      >
                      {deleting
                        ? t('calendar.rota.deleting')
                        : selectedBlock.type === 'shift'
                          ? 'Delete Shift'
                          : t('calendar.rota.delete')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

