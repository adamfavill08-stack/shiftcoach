'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Pencil, Trash2, Clock, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

type SleepDay = {
  date: string
  totalMinutes: number
  totalSleepHours: number
}

type SleepSession = {
  id: string
  session_type: 'main' | 'nap'
  start_time: string
  end_time: string
  durationHours: number
  quality?: string | number | null
  source: string
}

type Sleep7DayBarsProps = {
  onRefresh?: () => void
}

export function Sleep7DayBars({ onRefresh }: Sleep7DayBarsProps) {
  const [days, setDays] = useState<SleepDay[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [sessions, setSessions] = useState<SleepSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [editingSession, setEditingSession] = useState<SleepSession | null>(null)
  const [addingSession, setAddingSession] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetch7Days = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/sleep/7days?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[Sleep7DayBars] Failed to fetch:', res.status, errorData)
        setDays([])
        return
      }
      
      const data = (await res.json()) as { days: SleepDay[] }
      console.log('[Sleep7DayBars] API response:', data)
      
      if (!data.days || !Array.isArray(data.days)) {
        console.error('[Sleep7DayBars] Invalid response format:', data)
        setDays([])
        return
      }
      
      setDays(data.days || [])
    } catch (err) {
      console.error('[Sleep7DayBars] Error fetching:', err)
      setDays([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSessionsForDate = useCallback(async (date: string) => {
    try {
      setLoadingSessions(true)
      // Use the working /api/sleep/history route with from=to=date
      const url = `/api/sleep/history?from=${date}&to=${date}&t=${Date.now()}`
      console.log('[Sleep7DayBars] Fetching sessions from:', url)
      
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[Sleep7DayBars] Failed to fetch sessions:', res.status, errorData)
        setSessions([])
        return
      }
      
      const data = (await res.json()) as { items: any[] }
      console.log('[Sleep7DayBars] History API response:', data)
      
      // Map history items to SleepSession format
      // History returns: { items: [{ id, date, start_ts, end_ts, sleep_hours, quality, naps }] }
      const items = data.items || []
      
      const mappedSessions: SleepSession[] = items.map((item: any) => {
        // Determine session type (old schema: naps === 0 means main sleep)
        const sessionType: 'main' | 'nap' = (item.naps === 0 || !item.naps) ? 'main' : 'nap'
        
        // Get times (history uses old schema: start_ts, end_ts)
        const startTime = item.start_ts || item.start_at
        const endTime = item.end_ts || item.end_at
        
        if (!startTime || !endTime) {
          console.warn('[Sleep7DayBars] Skipping item with missing times:', item.id)
          return null
        }
        
        // Calculate duration
        const start = new Date(startTime)
        const end = new Date(endTime)
        const durationMs = end.getTime() - start.getTime()
        const durationHours = Math.max(0, durationMs / (1000 * 60 * 60))
        
        return {
          id: item.id,
          session_type: sessionType,
          start_time: startTime,
          end_time: endTime,
          durationHours,
          quality: item.quality,
          source: 'manual',
        }
      }).filter((s: any) => s !== null) as SleepSession[]
      
      console.log('[Sleep7DayBars] Mapped sessions:', mappedSessions)
      setSessions(mappedSessions)
    } catch (err) {
      console.error('[Sleep7DayBars] Error fetching sessions:', err)
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    fetch7Days()
    
    const handleRefresh = () => {
      setTimeout(() => {
        fetch7Days()
        onRefresh?.()
      }, 500)
    }
    
    window.addEventListener('sleep-refreshed', handleRefresh)
    return () => window.removeEventListener('sleep-refreshed', handleRefresh)
  }, [fetch7Days, onRefresh])

  const handleDayClick = (date: string) => {
    setSelectedDate(date)
    fetchSessionsForDate(date)
  }

  const handleCloseModal = () => {
    setSelectedDate(null)
    setEditingSession(null)
    setAddingSession(false)
    setSessions([])
  }

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Delete this sleep entry? This will update your body clock and sleep stats.')) {
      return
    }

    try {
      const res = await fetch(`/api/sleep/sessions/${sessionId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to delete session')
        return
      }

      // Refresh data
      if (selectedDate) {
        fetchSessionsForDate(selectedDate)
      }
      fetch7Days()
      
      // Trigger refresh for other components
      window.dispatchEvent(new CustomEvent('sleep-refreshed'))
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sleepRefresh', Date.now().toString())
      }
      
      // Trigger circadian recalculation
      fetch('/api/shift-rhythm?force=true').catch(() => {})
      
      // Refresh page to update sleep summary
      router.refresh()
    } catch (err) {
      console.error('[Sleep7DayBars] Delete error:', err)
      alert('Failed to delete session')
    }
  }

  const handleSaveSession = async (sessionData: {
    start_time: string
    end_time: string
    session_type: 'main' | 'nap'
  }) => {
    try {
      let res
      if (editingSession) {
        // Update existing
        res = await fetch(`/api/sleep/sessions/${editingSession.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData),
        })
      } else {
        // Create new
        res = await fetch('/api/sleep/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: sessionData.session_type === 'nap' ? 'nap' : 'sleep',
            startAt: sessionData.start_time,
            endAt: sessionData.end_time,
          }),
        })
      }

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Failed to save session')
        return
      }

      // Refresh data
      if (selectedDate) {
        fetchSessionsForDate(selectedDate)
      }
      fetch7Days()
      
      // Trigger refresh for other components
      window.dispatchEvent(new CustomEvent('sleep-refreshed'))
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sleepRefresh', Date.now().toString())
      }
      
      // Trigger circadian recalculation
      fetch('/api/shift-rhythm?force=true').catch(() => {})
      
      // Refresh page to update sleep summary
      router.refresh()
      
      // Close modal
      setEditingSession(null)
      setAddingSession(false)
    } catch (err) {
      console.error('[Sleep7DayBars] Save error:', err)
      alert('Failed to save session')
    }
  }

  const formatDayLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const dateLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const yesterdayLocal = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
    
    if (dateLocal.getTime() === todayLocal.getTime()) {
      return { day: 'Today', date: '' }
    }
    if (dateLocal.getTime() === yesterdayLocal.getTime()) {
      return { day: 'Yesterday', date: '' }
    }
    
    const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' })
    const dayNum = date.getDate()
    const monthName = date.toLocaleDateString('en-GB', { month: 'short' })
    return { day: dayName, date: `${dayNum} ${monthName}` }
  }

  const getBarColor = (hours: number) => {
    if (hours >= 7) return 'bg-gradient-to-t from-emerald-500 to-emerald-600'
    if (hours >= 5) return 'bg-gradient-to-t from-amber-400 to-yellow-500'
    if (hours > 0) return 'bg-gradient-to-t from-rose-500 to-red-500'
    return 'bg-slate-200/50'
  }

  const getBarWidth = (hours: number) => {
    const maxHours = 10
    return Math.min(100, (hours / maxHours) * 100)
  }

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0 && m === 0) return '0h'
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  // Check if there's any sleep data
  const hasAnySleep = days.some((d) => d.totalSleepHours > 0)

  if (loading && days.length === 0) {
    return (
      <section className="relative overflow-hidden rounded-[24px] bg-white/95 backdrop-blur-xl border border-slate-100/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)] px-5 py-4">
        <div className="py-12 text-center text-sm text-slate-500">Loading sleep data...</div>
      </section>
    )
  }

  return (
    <>
      <section className="relative overflow-hidden rounded-[24px] bg-white/95 backdrop-blur-xl border border-slate-100/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)] px-5 py-4">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">
              Last 7 days
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Sleep duration and quality
            </p>
          </div>

          {/* 7-Day Bars */}
          {!hasAnySleep ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No sleep data yet. Log your sleep to see it here.
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {days.map((day) => {
                const { day: dayLabel, date: dateLabel } = formatDayLabel(day.date)
                const isToday = dayLabel === 'Today'
                const barWidth = getBarWidth(day.totalSleepHours)
                const hasSleep = day.totalSleepHours > 0

                return (
                  <button
                    key={day.date}
                    onClick={() => handleDayClick(day.date)}
                    className="relative group flex flex-col items-center gap-2 rounded-lg border border-slate-100/60 bg-white/80 px-2 py-2.5 transition-all hover:shadow-sm hover:border-slate-200/80 active:scale-95"
                  >
                    {/* Date */}
                    <div className="flex flex-col items-center gap-0 w-full">
                      <p className={`text-[9px] font-bold uppercase tracking-wide ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                        {dayLabel}
                      </p>
                      {dateLabel && (
                        <p className={`text-[10px] font-semibold ${isToday ? 'text-blue-600' : 'text-slate-600'}`}>
                          {dateLabel}
                        </p>
                      )}
                    </div>

                    {/* Sleep bar - horizontal (landscape) */}
                    <div className="relative w-full flex items-center justify-start">
                      <div className="relative w-full h-8 rounded-lg bg-slate-100/60 overflow-hidden">
                        {hasSleep ? (
                          <div
                            className={`absolute left-0 top-0 bottom-0 rounded-lg ${getBarColor(day.totalSleepHours)} transition-all duration-300`}
                            style={{ width: `${barWidth}%` }}
                          />
                        ) : (
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-lg bg-slate-200/50" />
                        )}
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="flex flex-col items-center gap-0 w-full">
                      {hasSleep ? (
                        <p className="text-[12px] font-bold text-slate-900 leading-tight">
                          {formatDuration(day.totalSleepHours)}
                        </p>
                      ) : (
                        <p className="text-[9px] font-medium text-slate-400">
                          —
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Day Edit Modal */}
      {mounted && selectedDate && (
        <DayEditModal
          date={selectedDate}
          sessions={sessions}
          loadingSessions={loadingSessions}
          onClose={handleCloseModal}
          onEdit={(session) => setEditingSession(session)}
          onDelete={handleDelete}
          onAdd={() => setAddingSession(true)}
          onRefresh={() => {
            if (selectedDate) {
              fetchSessionsForDate(selectedDate)
            }
            fetch7Days()
          }}
        />
      )}

      {/* Edit/Add Session Modal */}
      {mounted && (editingSession || addingSession) && (
        <SessionFormModal
          session={editingSession}
          date={selectedDate || ''}
          onClose={() => {
            setEditingSession(null)
            setAddingSession(false)
          }}
          onSave={handleSaveSession}
        />
      )}
    </>
  )
}

function DayEditModal({
  date,
  sessions,
  loadingSessions,
  onClose,
  onEdit,
  onDelete,
  onAdd,
  onRefresh,
}: {
  date: string
  sessions: SleepSession[]
  loadingSessions: boolean
  onClose: () => void
  onEdit: (session: SleepSession) => void
  onDelete: (id: string) => void
  onAdd: () => void
  onRefresh: () => void
}) {
  const formatDayLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' })
    const dayNum = date.getDate()
    const monthName = date.toLocaleDateString('en-GB', { month: 'short' })
    return `${dayName} ${dayNum} ${monthName}`
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0 && m === 0) return '0h'
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md max-h-[85vh] bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100/80">
          <div>
            <h2 className="text-[19px] font-bold tracking-tight text-slate-900">
              {formatDayLabel(date)}
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Edit sleep for this day
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 text-slate-600 hover:text-slate-900 transition-all hover:scale-105 active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Sessions List */}
        <div className="relative z-10 flex-1 overflow-y-auto px-7 py-6">
          {loadingSessions ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No sleep sessions logged for this day.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 py-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${session.session_type === 'main' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                      <span className="text-[13px] font-semibold text-slate-900 capitalize">
                        {session.session_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(session)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50/80 border border-blue-200/60 text-blue-600 hover:bg-blue-100/80 transition-all hover:scale-105 active:scale-95"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => onDelete(session.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50/80 border border-rose-200/60 text-rose-600 hover:bg-rose-100/80 transition-all hover:scale-105 active:scale-95"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-[12px] text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
                    </div>
                    <span className="font-semibold">{formatDuration(session.durationHours)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 px-7 pb-6 pt-4 border-t border-slate-100/80">
          <button
            onClick={onAdd}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all hover:shadow-[0_6px_16px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add sleep for this day
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

function SessionFormModal({
  session,
  date,
  onClose,
  onSave,
}: {
  session: SleepSession | null
  date: string
  onClose: () => void
  onSave: (data: { start_time: string; end_time: string; session_type: 'main' | 'nap' }) => void
}) {
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [sessionType, setSessionType] = useState<'main' | 'nap'>(session?.session_type || 'main')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      // Editing existing session
      const start = new Date(session.start_time)
      const end = new Date(session.end_time)
      
      const formatDateForInput = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      }
      
      const formatTimeForInput = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`
      }
      
      setStartDate(formatDateForInput(start))
      setStartTime(formatTimeForInput(start))
      setEndDate(formatDateForInput(end))
      setEndTime(formatTimeForInput(end))
      setSessionType(session.session_type)
    } else {
      // Adding new session - preset to the selected date
      const today = date ? new Date(date + 'T12:00:00') : new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      const formatDateForInput = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      }
      
      // Default: sleep from 10 PM yesterday to 6 AM today
      setStartDate(formatDateForInput(yesterday))
      setStartTime('22:00')
      setEndDate(formatDateForInput(today))
      setEndTime('06:00')
    }
  }, [session, date])

  const handleSave = async () => {
    if (!startDate || !startTime || !endDate || !endTime) {
      setError('Please provide both start and end dates and times.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const startISO = new Date(`${startDate}T${startTime}`).toISOString()
      const endISO = new Date(`${endDate}T${endTime}`).toISOString()

      if (new Date(endISO) <= new Date(startISO)) {
        setError('End time must be after start time.')
        setLoading(false)
        return
      }

      onSave({
        start_time: startISO,
        end_time: endISO,
        session_type: sessionType,
      })
    } catch (err: any) {
      console.error('Save error:', err)
      setError(err?.message || 'Failed to save session')
    } finally {
      setLoading(false)
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md max-h-[90vh] bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100/80">
          <h2 className="text-[19px] font-bold tracking-tight text-slate-900">
            {session ? 'Edit Sleep Session' : 'Add Sleep Session'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 text-slate-600 hover:text-slate-900 transition-all hover:scale-105 active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Form */}
        <div className="relative z-10 flex-1 overflow-y-auto px-7 py-6 space-y-6">
          {/* Start Date & Time */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
              START
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all"
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all"
              />
            </div>
          </div>

          {/* End Date & Time */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
              END
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all"
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all"
              />
            </div>
          </div>

          {/* Type Selector */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
              TYPE
            </label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value as 'main' | 'nap')}
              className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all"
            >
              <option value="main">Main Sleep</option>
              <option value="nap">Nap</option>
            </select>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50/80 border border-rose-200/60 px-4 py-3">
              <p className="text-[13px] font-medium text-rose-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 px-7 pb-6 pt-4 border-t border-slate-100/80 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm text-[13px] font-semibold text-slate-700 shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)] hover:bg-slate-50/80 active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all hover:shadow-[0_6px_16px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
