'use client'

import { useState, useEffect, useCallback } from 'react'
import { SleepTimelineBar } from './SleepTimelineBar'
import { SleepSessionList } from './SleepSessionList'
import type { SleepType } from '@/lib/sleep/predictSleep'

interface SleepSession {
  id: string
  start_at: string
  end_at: string
  type: 'sleep' | 'nap'
  durationHours: number
  quality?: string | number | null
}

interface ShiftedDay {
  date: string
  shiftedDayStart: string
  sessions: SleepSession[]
  totalMinutes: number
  totalHours: number
}

type ShiftWorkerSleepLogSectionProps = {
  onLogSleep: (type: SleepType, start: Date, end: Date) => void
  onEditSession: (session: SleepSession) => void
  onDeleteSession: (sessionId: string) => void
}

function getShiftedDayLabel(shiftedDayStart: string): string {
  const start = new Date(shiftedDayStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  
  const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  
  const isToday = start.toDateString() === new Date().toDateString()
  
  if (isToday) {
    return `Today's Sleep (${formatTime(start)} → ${formatTime(end)})`
  }
  
  return `${formatDate(start)} (${formatTime(start)} → ${formatTime(end)})`
}

export function ShiftWorkerSleepLogSection({
  onLogSleep,
  onEditSession,
  onDeleteSession,
}: ShiftWorkerSleepLogSectionProps) {
  const [shiftedDays, setShiftedDays] = useState<ShiftedDay[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const fetchShiftedDays = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/sleep/24h-grouped?days=3&t=${Date.now()}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[ShiftWorkerSleepLogSection] Failed to fetch:', res.status, errorData)
        setShiftedDays([])
        return
      }

      const data = await res.json()
      console.log('[ShiftWorkerSleepLogSection] Fetched data:', data)
      setShiftedDays(data.days || [])
      
      // Auto-select today if available
      if (data.currentShiftedDay && !selectedDay) {
        setSelectedDay(data.currentShiftedDay)
      } else if (!selectedDay && data.days && data.days.length > 0) {
        // Select most recent day
        setSelectedDay(data.days[0].date)
      }
    } catch (err) {
      console.error('[ShiftWorkerSleepLogSection] Error:', err)
      setShiftedDays([])
    } finally {
      setLoading(false)
    }
  }, [selectedDay])

  useEffect(() => {
    fetchShiftedDays()
    
    // Listen for sleep refresh events (debounced)
    let refreshTimeout: NodeJS.Timeout | null = null
    const handleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      refreshTimeout = setTimeout(() => {
        console.log('[ShiftWorkerSleepLogSection] Refreshing after sleep change...')
        fetchShiftedDays()
      }, 500)
    }
    window.addEventListener('sleep-refreshed', handleRefresh)
    
    // Also listen to localStorage changes (for cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sleepRefresh') {
        if (refreshTimeout) clearTimeout(refreshTimeout)
        refreshTimeout = setTimeout(() => {
          console.log('[ShiftWorkerSleepLogSection] Refreshing after storage change...')
          fetchShiftedDays()
        }, 500)
      }
    }
    window.addEventListener('storage', handleStorageChange)
    
    // Poll for changes (fallback - every 10 seconds)
    const pollInterval = setInterval(() => {
      fetchShiftedDays()
    }, 10000)
    
    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      window.removeEventListener('sleep-refreshed', handleRefresh)
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(pollInterval)
    }
  }, [fetchShiftedDays])

  const selectedDayData = selectedDay 
    ? shiftedDays.find(d => d.date === selectedDay)
    : shiftedDays[0]

  const shiftedDayEnd = selectedDayData 
    ? new Date(new Date(selectedDayData.shiftedDayStart).getTime() + 24 * 60 * 60 * 1000).toISOString()
    : ''

  return (
    <div className="space-y-6">
      {/* Header: Today's Sleep - Ultra Premium */}
      <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_55px_rgba(15,23,42,0.08)] px-6 py-6">
        {/* Multiple gradient overlays for depth */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 via-white/60 to-white/85" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-white/50 ring-inset" />
        <div className="pointer-events-none absolute -inset-4 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-50/40 via-transparent to-transparent" />
        
        <div className="relative z-10">
          <h2 className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-2">
            SLEEP LOG
          </h2>
          {selectedDayData && selectedDayData.sessions.length > 0 ? (
            <>
              <h1 className="text-[17px] font-bold tracking-[-0.01em] text-slate-900 mb-2">
                {getShiftedDayLabel(selectedDayData.shiftedDayStart)}
              </h1>
              <div className="flex items-baseline gap-2">
                <p className="text-[24px] font-semibold text-slate-900">
                  {selectedDayData.totalHours.toFixed(1)}
                </p>
                <p className="text-[13px] font-medium text-slate-500">hours</p>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {selectedDayData.sessions.length} {selectedDayData.sessions.length === 1 ? 'session' : 'sessions'}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[17px] font-bold tracking-[-0.01em] text-slate-900 mb-2">
                Today&apos;s Sleep (07:00 → 07:00)
              </h1>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                No sleep logged yet
              </p>
            </>
          )}
        </div>
      </section>

      {/* Sleep Timeline Bar - Ultra Premium */}
      {selectedDayData && selectedDayData.sessions.length > 0 && (
        <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_55px_rgba(15,23,42,0.08)] px-6 py-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 via-white/60 to-white/85" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-white/50 ring-inset" />
          <div className="relative z-10">
            <h2 className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-4">
              Timeline
            </h2>
            <SleepTimelineBar
              sessions={selectedDayData.sessions}
              shiftedDayStart={selectedDayData.shiftedDayStart}
              shiftedDayEnd={shiftedDayEnd}
              onSessionClick={onEditSession}
            />
          </div>
        </section>
      )}

    </div>
  )
}

