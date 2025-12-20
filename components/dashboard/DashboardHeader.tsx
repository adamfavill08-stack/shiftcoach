'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Bell, Calendar, MoreHorizontal, MessageCircle } from 'lucide-react'

import { CoachChatModal } from '@/components/modals/CoachChatModal'
import { NotificationModal } from '@/components/notifications/NotificationModal'
import { useNotifications } from '@/lib/hooks/useNotifications'
import SyncWearableButton from '@/components/wearables/SyncWearableButton'

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
  const router = useRouter()
  const [isCoachChatOpen, setIsCoachChatOpen] = useState(false)
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false)
  const [coachEnabled, setCoachEnabled] = useState<boolean | null>(null)
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications()
  
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
          fetch(`/api/shifts?from=${fromDate}&to=${toDate}`, {
            cache: 'no-store'
          }),
          fetch(`/api/rota/event?month=${today.getMonth() + 1}&year=${today.getFullYear()}`, {
            cache: 'no-store'
          })
        ])
        
        if (!shiftsRes.ok) {
          console.error('[DashboardHeader] Failed to fetch shifts')
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

    const loadCoachSetting = async () => {
      try {
        const res = await fetch('/api/profile', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null))
        if (res && res.profile) {
          const tone = res.profile.ai_coach_tone as string | null | undefined
          setCoachEnabled(tone !== null)
        } else {
          setCoachEnabled(true)
        }
      } catch {
        setCoachEnabled(true)
      }
    }
    void loadCoachSetting()

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

  // Icon button base styles - standardized
  const iconBtn = "h-9 w-9 rounded-full grid place-items-center hover:bg-slate-100/70 dark:hover:bg-slate-800/50 active:scale-[0.98] transition group"

  return (
    <>
      <header 
        className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/45 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/40 safe-top" 
        style={{ paddingTop: 'calc(env(safe-area-inset-top))' }}
      >
        {/* Top highlight overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/70 dark:from-slate-900/70 to-transparent" />
        
        {/* Bottom fade overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-white/70 dark:to-slate-900/70" />
        
        <div className="mx-auto max-w-md px-4 relative">
          <div className="h-14 flex items-center justify-between">
            {/* Left: Brand button - unified with cluster language */}
            <button
              onClick={() => router.push('/dashboard')}
              className="h-10 w-10 rounded-full bg-white/60 dark:bg-slate-900/40 backdrop-blur border border-slate-200/50 dark:border-slate-700/40 shadow-[0_8px_20px_-16px_rgba(0,0,0,0.14)] grid place-items-center hover:bg-white/80 dark:hover:bg-slate-800/50 active:scale-[0.98] transition"
              aria-label="ShiftCoach"
            >
              <Image
                src="/Faviconnew.png"
                alt="ShiftCoach"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
                priority
              />
            </button>

            {/* Center: Context cue - tightened editorial style */}
            <div className="hidden sm:inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white/50 dark:bg-slate-900/40 backdrop-blur border border-slate-200/40 dark:border-slate-700/40 text-[11px] font-medium text-slate-600 dark:text-slate-300">
              Today <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" /> {todayShiftLabel}
            </div>

            {/* Right: Pill cluster - slimmer and more system */}
            <div className="inline-flex items-center gap-1 rounded-full bg-white/60 dark:bg-slate-900/40 backdrop-blur border border-slate-200/50 dark:border-slate-700/40 shadow-[0_8px_20px_-16px_rgba(0,0,0,0.14)] px-1.5 py-1">
              <SyncWearableButton />
              
              <button
                onClick={() => router.push('/rota')}
                className={iconBtn}
                aria-label="Calendar"
                type="button"
              >
                <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200" />
              </button>
              
              <button
                onClick={() => setIsNotificationModalOpen(true)}
                className={`${iconBtn} relative`}
                aria-label="Notifications"
                type="button"
              >
                <Bell className="h-4 w-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-400/70 dark:bg-rose-500/80 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
              
              {coachEnabled !== false && (
                <button
                  onClick={() => setIsCoachChatOpen(true)}
                  className={iconBtn}
                  aria-label="Chat with your coach"
                  type="button"
                >
                  <MessageCircle className="h-4 w-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200" />
                </button>
              )}
              
              <button
                onClick={() => router.push('/settings')}
                className={iconBtn}
                aria-label="More options"
                type="button"
              >
                <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Calendar preview - integrated into header */}
        <div className="mx-auto max-w-md bg-transparent rounded-2xl px-4 py-3.5 relative">
          {/* Faint baseline to anchor the row */}
          <div className="absolute left-0 right-0 top-5 h-px bg-gradient-to-r from-transparent via-slate-200/60 dark:via-slate-700/50 to-transparent" />
          
          {loadingShifts ? (
            <div className="flex items-center justify-between gap-3 relative">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
                  <div className="h-4 w-6 bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 relative">
              {shifts.map((shift) => {
                const isToday = shift.date === new Date().toISOString().slice(0, 10)
                const style = getDayStyle(shift, isToday)
                const dayLetter = formatDayLetter(shift.date)
                const dayNumber = formatDayNumber(shift.date)
                const hasShift = shift.label && shift.label.toUpperCase() !== 'OFF' && shift.label !== ''
                const event = events.get(shift.date)
                const isSelected = hasShift || !!event
                
                return (
                  <div
                    key={shift.date}
                    className="flex flex-col items-center gap-1.5 flex-1 min-w-0"
                  >
                    {/* Day letter in circle - CalAI premium styling */}
                    <div className="relative">
                      <button
                        className={`relative flex items-center justify-center rounded-full w-8 h-8 ${style.border} ${style.bg} hover:bg-white/90 dark:hover:bg-slate-800/60 active:scale-[0.98] transition-transform transition-colors`}
                      >
                        <span className={`text-[12px] font-semibold ${style.letterColor} leading-none`}>
                          {dayLetter}
                        </span>
                        
                        {/* Today dot indicator */}
                        {isToday && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500/80 dark:bg-rose-400/70 ring-2 ring-white dark:ring-slate-900" />
                        )}
                      </button>
                    </div>
                    
                    {/* Day number */}
                    <span className={`text-xs font-medium tabular-nums ${style.numberColor} leading-none`}>
                      {dayNumber}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </header>

      {isCoachChatOpen && (
        <CoachChatModal onClose={() => setIsCoachChatOpen(false)} />
      )}

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
