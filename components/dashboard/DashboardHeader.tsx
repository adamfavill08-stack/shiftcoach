'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Bell } from 'lucide-react'

import { NotificationModal } from '@/components/notifications/NotificationModal'
import { useTranslation } from '@/components/providers/language-provider'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { authedFetch } from '@/lib/supabase/authedFetch'

type Shift = {
  date: string
  label: string | null
  start_ts: string | null
  end_ts: string | null
}

type RotaEvent = {
  id: string
  event_date?: string | null
  start_at?: string | null
  type: string | null
  color: string | null
  title: string | null
}

export default function DashboardHeader() {
  const { t } = useTranslation()
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications()
  const hasNotifications = notifications.length > 0
  
  const [shifts, setShifts] = useState<Shift[]>([])
  const [events, setEvents] = useState<Map<string, RotaEvent>>(new Map())
  const [loadingShifts, setLoadingShifts] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date()
        const sevenDaysLater = new Date(today)
        sevenDaysLater.setDate(today.getDate() + 7)
        
        const fromDate = today.toISOString().slice(0, 10)
        const toDate = sevenDaysLater.toISOString().slice(0, 10)
        
        // Fetch shifts and events in parallel
        // For events, we need to query by date range - use start_at ISO timestamps
        const startIso = new Date(fromDate + 'T00:00:00Z').toISOString()
        const endIso = new Date(toDate + 'T23:59:59Z').toISOString()
        
        const [shiftsRes, eventsRes] = await Promise.all([
          authedFetch(`/api/shifts?from=${fromDate}&to=${toDate}`, {
            next: { revalidate: 60 },
          } as RequestInit),
          authedFetch(`/api/rota/event?month=${today.getMonth() + 1}&year=${today.getFullYear()}`, {
            next: { revalidate: 60 },
          } as RequestInit),
        ])

        if (!shiftsRes.ok) {
          if (shiftsRes.status === 401 || shiftsRes.status === 403) {
            console.warn('[DashboardHeader] Shifts fetch — session not ready', shiftsRes.status)
          } else {
            console.error('[DashboardHeader] Failed to fetch shifts', shiftsRes.status)
          }
          setShifts([])
          setLoadingShifts(false)
          return
        }

        const shiftsJson = await shiftsRes.json()
        const fetchedShifts = shiftsJson.shifts ?? []
        
        // Process events - create a map of date -> event (prioritizing holidays)
        const eventsMap = new Map<string, RotaEvent>()
        if (eventsRes.ok) {
          const eventsJson = await eventsRes.json()
          const fetchedEvents = eventsJson.events ?? [] as RotaEvent[]
          
          fetchedEvents.forEach((event: RotaEvent) => {
            // Extract date from event_date or start_at
            let eventDate: string | null = null
            if (event.event_date) {
              eventDate = event.event_date
            } else if (event.start_at) {
              eventDate = new Date(event.start_at).toISOString().slice(0, 10)
            }
            
            if (!eventDate) return
            
            // Only include events in our 7-day range
            if (eventDate >= fromDate && eventDate <= toDate) {
              // Prioritize holidays - if there's already an event for this date and it's not a holiday, replace it
              const existingEvent = eventsMap.get(eventDate)
              if (!existingEvent || event.type === 'holiday') {
                eventsMap.set(eventDate, event)
              }
            }
          })
        }
        
        setEvents(eventsMap)
        
        // Create a map of all 7 days (including today)
        const daysMap = new Map<string, Shift>()
        
        // Initialize all 7 days with null/empty data
        for (let i = 0; i < 7; i++) {
          const date = new Date(today)
          date.setDate(today.getDate() + i)
          const dateStr = date.toISOString().slice(0, 10)
          daysMap.set(dateStr, {
            date: dateStr,
            label: null,
            start_ts: null,
            end_ts: null,
          })
        }
        
        // Fill in actual shifts
        fetchedShifts.forEach((shift: Shift) => {
          if (daysMap.has(shift.date)) {
            daysMap.set(shift.date, shift)
          }
        })
        
        // Convert to array and sort by date
        const sortedShifts = Array.from(daysMap.values()).sort((a, b) => 
          a.date.localeCompare(b.date)
        )
        
        setShifts(sortedShifts)
      } catch (err) {
        console.error('[DashboardHeader] Error fetching data:', err)
        setShifts([])
        setEvents(new Map())
      } finally {
        setLoadingShifts(false)
      }
    }

    fetchData()

    // Listen for rota updates to refresh
    const handleRotaUpdate = () => {
      setTimeout(() => fetchData(), 500)
    }

    window.addEventListener('rota-saved', handleRotaUpdate)
    window.addEventListener('rota-cleared', handleRotaUpdate)

    return () => {
      window.removeEventListener('rota-saved', handleRotaUpdate)
      window.removeEventListener('rota-cleared', handleRotaUpdate)
    }
  }, [])

  const getDayStyle = (shift: Shift, isToday: boolean) => {
    const dateStr = shift.date
    const event = events.get(dateStr)
    const label = shift.label?.toUpperCase() || ''
    
    // Check if day has shift (not off day)
    const hasShift = label && label !== 'OFF' && label !== ''
    
    // Determine shift color (muted, soft)
    let borderColor = 'border-slate-200/60 dark:border-slate-700/50' // default
    let bgColor = 'bg-white/70 dark:bg-slate-900/45'
    let borderWidth = 'border' // default thin
    
    // Priority 1: Events (holidays, etc.)
    if (event) {
      const EVENT_COLORS: Record<string, string> = {
        holiday: 'border-yellow-300/50 dark:border-yellow-400/40',
        overtime: 'border-orange-300/50 dark:border-orange-400/40',
        training: 'border-emerald-300/50 dark:border-emerald-400/40',
        personal: 'border-purple-300/50 dark:border-purple-400/40',
        other: 'border-slate-300/50 dark:border-slate-600/40',
      }
      borderColor = EVENT_COLORS[event.type || 'other'] || 'border-slate-300/50 dark:border-slate-600/40'
      bgColor = 'bg-white/80 dark:bg-slate-900/50'
      borderWidth = 'border-2' // thicker for shifts/events
    }
    // Priority 2: Shift types
    else if (label === 'NIGHT' || label.includes('NIGHT')) {
      borderColor = 'border-red-300/50 dark:border-red-400/40' // muted red
      bgColor = 'bg-white/80 dark:bg-slate-900/50'
      borderWidth = 'border-2' // thicker
    } else if (label === 'DAY' || label.includes('DAY')) {
      borderColor = 'border-blue-300/50 dark:border-blue-400/40' // muted blue
      bgColor = 'bg-white/80 dark:bg-slate-900/50'
      borderWidth = 'border-2' // thicker
    } else if (label === 'MORNING' || label.includes('MORNING')) {
      borderColor = 'border-blue-300/50 dark:border-blue-400/40' // muted blue
      bgColor = 'bg-white/80 dark:bg-slate-900/50'
      borderWidth = 'border-2' // thicker
    } else if (label === 'AFTERNOON' || label.includes('AFTERNOON')) {
      borderColor = 'border-indigo-300/50 dark:border-indigo-400/40' // muted indigo
      bgColor = 'bg-white/80 dark:bg-slate-900/50'
      borderWidth = 'border-2' // thicker
    } else if (label === 'EVENING' || label.includes('EVENING')) {
      borderColor = 'border-purple-300/50 dark:border-purple-400/40' // muted purple
      bgColor = 'bg-white/80 dark:bg-slate-900/50'
      borderWidth = 'border-2' // thicker
    }
    
    // Today gets slightly stronger border but still soft
    if (isToday) {
      if (hasShift || event) {
        // Make border slightly more visible for today with shift
        borderColor = borderColor.replace(/\/(\d+)$/, (match, num) => {
          const opacity = parseInt(num)
          return `/${Math.max(20, opacity - 20)}` // Increase visibility slightly
        })
        borderWidth = 'border-2' // keep thicker for today
      } else {
        // Today but no shift - use soft slate
        borderColor = 'border-slate-900/15 dark:border-slate-600/30'
        borderWidth = 'border-2' // thicker even for off days when today
      }
      bgColor = 'bg-white/90 dark:bg-slate-800/60'
    }
    
    return {
      border: `${borderWidth} ${borderColor}`,
      bg: `${bgColor} backdrop-blur`,
      letterColor: hasShift || event ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500',
      numberColor: hasShift || event ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500',
    }
  }

  const formatDayLetter = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { weekday: 'narrow' }).toUpperCase()
  }

  const formatDayNumber = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.getDate()
  }

  // Get today's shift label for context cue
  const todayShiftLabel = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const todayShift = shifts.find(s => s.date === today)
    if (!todayShift || !todayShift.label || todayShift.label === 'OFF' || todayShift.label === 'off') {
      return 'Day Off'
    }
    // Format label nicely
    const label = todayShift.label.toLowerCase()
    if (label.includes('night')) return 'Night shift'
    if (label.includes('day')) return 'Day shift'
    if (label.includes('morning')) return 'Morning shift'
    if (label.includes('afternoon')) return 'Afternoon shift'
    if (label.includes('evening')) return 'Evening shift'
    return todayShift.label.charAt(0).toUpperCase() + todayShift.label.slice(1).toLowerCase()
  }, [shifts])

  return (
    <>
      <div className="relative flex items-center justify-center px-2.5 pt-0.5 pb-0">
        <Image
          src="/logo.svg"
          alt={t('dashboard.header.brandAria')}
          width={280}
          height={140}
          className="h-12 w-auto max-w-[min(320px,90vw)] object-contain object-center dark:invert"
          priority
          unoptimized
        />
        {hasNotifications ? (
          <button
            type="button"
            onClick={() => setIsNotificationModalOpen(true)}
            className="absolute right-2.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-black transition hover:bg-slate-100/80"
            aria-label={t('dashboard.header.notificationsAria')}
          >
            <span className="relative inline-flex">
              <Bell className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              {unreadCount > 0 ? (
                <span
                  className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white dark:ring-slate-900"
                  aria-label={`${unreadCount} unread notifications`}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </span>
          </button>
        ) : null}
      </div>

      {isNotificationModalOpen && (
        <NotificationModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          notifications={notifications}
          markAsRead={markAsRead}
          markAllAsRead={markAllAsRead}
          loading={loading}
        />
      )}
    </>
  )
}
