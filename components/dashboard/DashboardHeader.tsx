'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Bell, Calendar, MoreHorizontal } from 'lucide-react'

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

  // Helper function to convert hex color to RGB for opacity
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }

  const getDayStyle = (shift: Shift, isToday: boolean) => {
    const dateStr = shift.date
    const event = events.get(dateStr)
    const label = shift.label?.toUpperCase() || ''
    
    // Debug logging for today
    if (isToday) {
      console.log('[DashboardHeader] Today style check:', {
        date: dateStr,
        label: label || 'null/empty',
        rawLabel: shift.label,
        hasEvent: !!event,
        eventType: event?.type,
      })
    }
    
    // Logo color - always use this for text (matches ShiftCoach logo)
    const LOGO_TEXT_COLOR = '#334155' // slate-700 - matches logo and icon colors
    
    // Priority 1: Check for events (holidays take priority over shifts)
    if (event) {
      // Use event color or default based on type
      const EVENT_TYPE_COLORS: Record<string, string> = {
        holiday: '#FCD34D', // Yellow for holidays
        overtime: '#F97316',
        training: '#22C55E',
        personal: '#A855F7',
        other: '#64748B',
      }
      const eventColor = event.color || EVENT_TYPE_COLORS[event.type || 'other'] || '#FCD34D'
      const rgb = hexToRgb(eventColor)
      
      // For today with event, use event color but keep today indicator
      if (isToday) {
        return {
          circle: '',
          circleBg: '',
          letter: '',
          number: 'text-slate-900 font-bold',
          customStyle: {
            borderColor: eventColor,
            borderWidth: '2px',
            boxShadow: `0 0 0 1px ${eventColor}33`,
            backgroundColor: 'transparent', // Match header background
            textColor: LOGO_TEXT_COLOR, // Always use logo color for text
          },
        }
      }
      
      // Event color styling
      return {
        circle: '',
        circleBg: '',
        letter: '',
        number: 'text-slate-700 font-semibold',
        customStyle: {
          borderColor: `${eventColor}99`,
          borderWidth: '2px',
          backgroundColor: 'transparent', // Match header background
          textColor: LOGO_TEXT_COLOR, // Always use logo color for text
        },
      }
    }
    
    // Priority 2: Shift colors (only if no event)
    // Determine shift color based on label first, then apply today styling
    
    // Night shift - red circle (matches calendar)
    if (label === 'NIGHT' || label.includes('NIGHT')) {
      return {
        circle: '',
        circleBg: '',
        letter: '',
        number: isToday ? 'text-slate-900 font-bold' : 'text-slate-700 font-semibold',
        customStyle: {
          backgroundColor: 'transparent',
          textColor: LOGO_TEXT_COLOR,
          // TEST: If today, use bright green to verify code is running
          borderColor: isToday ? '#22c55e' : 'rgba(239,68,68,0.6)', // green-500 for today (TEST), red for others
          borderWidth: isToday ? '3px' : '2px', // Thicker for today
          boxShadow: isToday ? '0 0 0 2px rgba(34,197,94,0.3)' : undefined,
        },
      }
    }
    
    // Day shift - blue circle (matches calendar)
    if (label === 'DAY' || label.includes('DAY')) {
      return {
        circle: '',
        circleBg: '',
        letter: '',
        number: isToday ? 'text-slate-900 font-bold' : 'text-slate-700 font-semibold',
        customStyle: {
          backgroundColor: 'transparent',
          textColor: LOGO_TEXT_COLOR,
          // TEST: If today, use bright purple to verify code is running
          borderColor: isToday ? '#a855f7' : 'rgba(59,130,246,0.6)', // purple-500 for today (TEST), blue for others
          borderWidth: isToday ? '3px' : '2px', // Thicker for today
          boxShadow: isToday ? '0 0 0 2px rgba(168,85,247,0.3)' : undefined,
        },
      }
    }
    
    // Morning shift - blue circle (matches calendar)
    if (label === 'MORNING' || label.includes('MORNING')) {
      return {
        circle: '',
        circleBg: '',
        letter: '',
        number: isToday ? 'text-slate-900 font-bold' : 'text-slate-700 font-semibold',
        customStyle: {
          backgroundColor: 'transparent',
          textColor: LOGO_TEXT_COLOR,
          borderColor: isToday ? '#3b82f6' : 'rgba(59,130,246,0.6)', // blue-500 with opacity
          borderWidth: isToday ? '2.5px' : '2px',
          boxShadow: isToday ? '0 0 0 1px rgba(59,130,246,0.1)' : undefined,
        },
      }
    }
    
    // Afternoon shift - purple/indigo circle (matches calendar)
    if (label === 'AFTERNOON' || label.includes('AFTERNOON')) {
      return {
        circle: '',
        circleBg: '',
        letter: '',
        number: isToday ? 'text-slate-900 font-bold' : 'text-slate-700 font-semibold',
        customStyle: {
          backgroundColor: 'transparent',
          textColor: LOGO_TEXT_COLOR,
          borderColor: isToday ? '#6366f1' : 'rgba(99,102,241,0.6)', // indigo-500 with opacity
          borderWidth: isToday ? '2.5px' : '2px',
          boxShadow: isToday ? '0 0 0 1px rgba(99,102,241,0.1)' : undefined,
        },
      }
    }
    
    // Off days or no shift - grayed out (no circle)
    if (label === 'OFF' || !label || label === '') {
      if (isToday) {
        console.log('[DashboardHeader] Today is OFF or no shift - using gray border')
      }
      return {
        circle: '',
        circleBg: '',
        letter: 'text-slate-400',
        number: isToday ? 'text-slate-900 font-bold' : 'text-slate-400',
        customStyle: {
          backgroundColor: 'transparent',
          textColor: '#94a3b8', // slate-400 for off days
          ...(isToday && {
            borderColor: '#cbd5e1', // light gray border for today (off day)
            borderWidth: '2.5px',
            boxShadow: '0 0 0 1px rgba(203,213,225,0.2)',
          }),
        },
      }
    }
    
    // Custom/other shifts - yellow circle (fallback)
    return {
      circle: '',
      circleBg: '',
      letter: '',
      number: isToday ? 'text-slate-900 font-bold' : 'text-slate-700 font-semibold',
      customStyle: {
        backgroundColor: 'transparent',
        textColor: LOGO_TEXT_COLOR,
        borderColor: isToday ? '#eab308' : 'rgba(234,179,8,0.6)', // yellow-500 with opacity
        borderWidth: isToday ? '2.5px' : '2px',
        boxShadow: isToday ? '0 0 0 1px rgba(234,179,8,0.1)' : undefined,
      },
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

  return (
    <>
      <header className="px-5 pt-6 safe-top" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
        {/* Logo and buttons row */}
        <div className="flex h-[48px] items-center justify-between bg-transparent px-4 pt-1 pb-3">
          <Image
            src="/Faviconnew.png"
            alt="ShiftCoach Icon"
            width={60}
            height={60}
            className="object-contain"
            priority
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/rota')}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow-sm border border-slate-200/60 hover:bg-white transition-all hover:scale-105 active:scale-95"
              aria-label="Calendar"
              type="button"
            >
              <Calendar className="w-5 h-5 text-slate-700" strokeWidth={2} />
            </button>
            <button
              onClick={() => setIsNotificationModalOpen(true)}
              className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow-sm border border-slate-200/60 hover:bg-white transition-all hover:scale-105 active:scale-95"
              aria-label="Notifications"
              type="button"
            >
              <Bell className="w-5 h-5 text-slate-700" strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {coachEnabled !== false && (
              <button
                onClick={() => setIsCoachChatOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow-sm border border-slate-200/60 hover:bg-white transition-all hover:scale-105 active:scale-95"
                aria-label="Chat with your coach"
                type="button"
              >
                <Image
                  src="/bubble-icon.png"
                  alt="Shift Coach"
                  width={28}
                  height={28}
                  className="w-7 h-7 object-contain"
                  style={{
                    filter:
                      'brightness(0) saturate(100%) invert(15%) sepia(9%) saturate(1033%) hue-rotate(169deg) brightness(95%) contrast(88%)',
                  }}
                />
              </button>
            )}
            <SyncWearableButton />
            <button
              onClick={() => router.push('/settings')}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow-sm border border-slate-200/60 hover:bg-white transition-all hover:scale-105 active:scale-95"
              aria-label="More options"
              type="button"
            >
              <MoreHorizontal className="w-5 h-5 text-slate-700" strokeWidth={2} />
            </button>
          </div>
        </div>
        
        {/* Calendar preview - integrated into header */}
        <div className="bg-transparent rounded-2xl px-4 py-3.5">
          {loadingShifts ? (
            <div className="flex items-center justify-between gap-3">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
                  <div className="h-4 w-6 bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              {shifts.map((shift) => {
                const isToday = shift.date === new Date().toISOString().slice(0, 10)
                const style = getDayStyle(shift, isToday)
                const dayLetter = formatDayLetter(shift.date)
                const dayNumber = formatDayNumber(shift.date)
                
                return (
                  <div
                    key={shift.date}
                    className="flex flex-col items-center gap-1.5 flex-1 min-w-0"
                  >
                    {/* Day letter in circle - ultra premium styling */}
                    <div
                      className={`flex items-center justify-center rounded-full transition-all ${
                        isToday ? 'w-8 h-8' : 'w-7 h-7'
                      } ${
                        style.circleBg || ''
                      } ${
                        style.customStyle || style.circle
                          ? 'shadow-[0_1px_3px_rgba(0,0,0,0.08)] backdrop-blur-sm'
                          : ''
                      }`}
                      style={{
                        borderColor: style.customStyle?.borderColor || undefined,
                        borderWidth: style.customStyle?.borderWidth || undefined,
                        borderStyle: style.customStyle?.borderColor ? 'solid' : undefined,
                        boxShadow: style.customStyle?.boxShadow || undefined,
                        backgroundColor: style.customStyle?.backgroundColor || 'transparent',
                      }}
                    >
                      <span 
                        className={`text-[10px] leading-none`}
                        style={{
                          color: style.customStyle?.textColor || '#334155', // Default to logo color
                          fontWeight: '500'
                        }}
                      >
                        {dayLetter}
                      </span>
                    </div>
                    {/* Day number */}
                    <span className={`text-xs ${style.number} leading-none tracking-tight`}>
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
