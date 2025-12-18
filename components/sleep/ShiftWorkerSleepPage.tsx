'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { QuickSleepLogButtons } from './QuickSleepLogButtons'
import { SleepTimelineBar } from './SleepTimelineBar'
import { SleepSessionList } from './SleepSessionList'
import { LogSleepModal } from './LogSleepModal'
import { SleepEditModal } from './SleepEditModal'
import { DeleteSleepConfirmModal } from './DeleteSleepConfirmModal'
import type { SleepType } from '@/lib/sleep/predictSleep'

interface SleepSession {
  id: string
  start_at: string
  end_at: string
  type: 'sleep' | 'nap'
  durationHours: number
  quality?: string | number | null
  notes?: string | null
}

interface ShiftedDay {
  date: string
  shiftedDayStart: string
  sessions: SleepSession[]
  totalMinutes: number
  totalHours: number
}

/**
 * Get shifted day label (07:00 → 07:00)
 */
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

export function ShiftWorkerSleepPage() {
  const router = useRouter()
  const [shiftedDays, setShiftedDays] = useState<ShiftedDay[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [logModalType, setLogModalType] = useState<SleepType>('main')
  const [logModalStart, setLogModalStart] = useState<Date | null>(null)
  const [logModalEnd, setLogModalEnd] = useState<Date | null>(null)
  const [editingSession, setEditingSession] = useState<SleepSession | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch shifted day sleep data
  const fetchShiftedDays = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/sleep/24h-grouped?days=3', { cache: 'no-store' })
      
      if (!res.ok) {
        console.error('[ShiftWorkerSleepPage] Failed to fetch:', res.status)
        setShiftedDays([])
        return
      }

      const data = await res.json()
      setShiftedDays(data.days || [])
      
      // Auto-select today if available
      if (data.currentShiftedDay && !selectedDay) {
        setSelectedDay(data.currentShiftedDay)
      }
    } catch (err) {
      console.error('[ShiftWorkerSleepPage] Error:', err)
      setShiftedDays([])
    } finally {
      setLoading(false)
    }
  }, [selectedDay])

  useEffect(() => {
    fetchShiftedDays()
    
    // Listen for sleep refresh events
    let refreshTimeout: NodeJS.Timeout | null = null
    const handleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      refreshTimeout = setTimeout(() => {
        fetchShiftedDays()
      }, 300)
    }
    window.addEventListener('sleep-refreshed', handleRefresh)
    
    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      window.removeEventListener('sleep-refreshed', handleRefresh)
    }
  }, [fetchShiftedDays])

  // Handle quick log button click
  const handleQuickLog = async (type: SleepType, start: Date, end: Date) => {
    setLogModalType(type)
    setLogModalStart(start)
    setLogModalEnd(end)
    setIsLogModalOpen(true)
  }

  // Handle log sleep submit
  const handleLogSleep = async (data: {
    type: 'sleep' | 'nap'
    start: string
    end: string
    quality: 'Excellent' | 'Good' | 'Fair' | 'Poor'
    notes?: string
  }) => {
    try {
      const res = await fetch('/api/sleep/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.type,
          startAt: data.start,
          endAt: data.end,
          quality: data.quality,
          notes: data.notes || null,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to save sleep' }))
        throw new Error(errorData.error || 'Failed to save sleep')
      }

      // Trigger all recalculations
      window.dispatchEvent(new CustomEvent('sleep-refreshed'))
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sleepRefresh', Date.now().toString())
      }
      
      // Trigger circadian, sleep deficit, shift rhythm, tonight's target recalculations
      fetch('/api/shift-rhythm?force=true').catch(() => {})
      fetch('/api/sleep/deficit').catch(() => {})
      fetch('/api/sleep/tonight-target').catch(() => {})
      
      router.refresh()
      
      setIsLogModalOpen(false)
      setLogModalStart(null)
      setLogModalEnd(null)
      
      // Refresh after a moment
      setTimeout(() => {
        fetchShiftedDays()
      }, 500)
    } catch (error) {
      console.error('[ShiftWorkerSleepPage] Error logging sleep:', error)
      throw error
    }
  }

  // Handle delete
  const handleDeleteClick = (sessionId: string) => {
    setDeletingSessionId(sessionId)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingSessionId) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/sleep/sessions/${deletingSessionId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        alert(errorData.error || 'Failed to delete session')
        setIsDeleting(false)
        setDeletingSessionId(null)
        return
      }

      setDeletingSessionId(null)
      
      // Trigger all recalculations
      window.dispatchEvent(new CustomEvent('sleep-refreshed'))
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sleepRefresh', Date.now().toString())
      }
      
      // Trigger circadian, sleep deficit, shift rhythm, tonight's target recalculations
      fetch('/api/shift-rhythm?force=true').catch(() => {})
      fetch('/api/sleep/deficit').catch(() => {})
      fetch('/api/sleep/tonight-target').catch(() => {})
      
      router.refresh()
      
      setTimeout(() => {
        fetchShiftedDays()
      }, 500)
    } catch (err) {
      console.error('[ShiftWorkerSleepPage] Delete error:', err)
      alert('Failed to delete session')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeletingSessionId(null)
    setIsDeleting(false)
  }

  // Get selected day data
  const selectedDayData = selectedDay 
    ? shiftedDays.find(d => d.date === selectedDay)
    : shiftedDays[0] // Default to most recent

  // Calculate shifted day end
  const shiftedDayEnd = selectedDayData 
    ? new Date(new Date(selectedDayData.shiftedDayStart).getTime() + 24 * 60 * 60 * 1000).toISOString()
    : ''

  // Show loading state
  if (loading && shiftedDays.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-sm text-slate-500">Loading sleep data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Header: Today's Sleep */}
      <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.5)] px-7 py-6">
        {/* Gradient overlays */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 via-white/60 to-white/85" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-white/50 ring-inset" />
        <div className="pointer-events-none absolute -inset-4 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/20 blur-3xl" />
        
        <div className="relative z-10">
          <h2 className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1">
            Sleep Log
          </h2>
          {selectedDayData ? (
            <>
              <h1 className="text-[17px] font-bold tracking-[-0.01em] text-slate-900 mb-2">
                {getShiftedDayLabel(selectedDayData.shiftedDayStart)}
              </h1>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                {selectedDayData.totalHours.toFixed(1)} hours total
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[17px] font-bold tracking-[-0.01em] text-slate-900 mb-2">
                Today's Sleep (07:00 → 07:00)
              </h1>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                No sleep logged yet
              </p>
            </>
          )}
        </div>
      </section>

      {/* Quick Sleep Log Buttons */}
      <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.5)] px-7 py-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 via-white/60 to-white/85" />
        <div className="relative z-10">
          <h2 className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-4">
            Quick Log
          </h2>
          <QuickSleepLogButtons onLogSleep={handleQuickLog} />
        </div>
      </section>

      {/* Sleep Timeline Bar */}
      {selectedDayData && selectedDayData.sessions.length > 0 && (
        <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.5)] px-7 py-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 via-white/60 to-white/85" />
          <div className="relative z-10">
            <h2 className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-4">
              Timeline
            </h2>
            <SleepTimelineBar
              sessions={selectedDayData.sessions}
              shiftedDayStart={selectedDayData.shiftedDayStart}
              shiftedDayEnd={shiftedDayEnd}
              onSessionClick={(session) => setEditingSession(session)}
            />
          </div>
        </section>
      )}

      {/* Sleep Sessions List */}
      <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.5)] px-7 py-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 via-white/60 to-white/85" />
        <div className="relative z-10">
          <h2 className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-4">
            Sessions
          </h2>
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">Loading sessions...</p>
            </div>
          ) : selectedDayData && selectedDayData.sessions.length > 0 ? (
            <SleepSessionList
              sessions={selectedDayData.sessions}
              onEdit={(session) => setEditingSession(session)}
              onDelete={handleDeleteClick}
            />
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500 mb-4">No sleep sessions logged for this day.</p>
              <p className="text-xs text-slate-400">Use the Quick Log buttons above to log your sleep.</p>
            </div>
          )}
        </div>
      </section>

      {/* Log Sleep Modal */}
      <LogSleepModal
        open={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false)
          setLogModalStart(null)
          setLogModalEnd(null)
        }}
        onSubmit={handleLogSleep}
        defaultType={logModalType === 'nap' || logModalType === 'pre_shift_nap' ? 'nap' : 'sleep'}
        defaultStart={logModalStart}
        defaultEnd={logModalEnd}
      />

      {/* Edit Session Modal */}
      {editingSession && (
        <SleepEditModal
          open={true}
          session={{
            id: editingSession.id,
            session_type: editingSession.type === 'nap' ? 'nap' : 'main',
            start_time: editingSession.start_at,
            end_time: editingSession.end_at,
            durationHours: editingSession.durationHours,
            quality: editingSession.quality,
            source: 'manual',
          }}
          onClose={() => setEditingSession(null)}
          onSuccess={() => {
            setEditingSession(null)
            
            // Trigger all recalculations
            window.dispatchEvent(new CustomEvent('sleep-refreshed'))
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('sleepRefresh', Date.now().toString())
            }
            
            // Trigger circadian, sleep deficit, shift rhythm, tonight's target recalculations
            fetch('/api/shift-rhythm?force=true').catch(() => {})
            fetch('/api/sleep/deficit').catch(() => {})
            fetch('/api/sleep/tonight-target').catch(() => {})
            
            router.refresh()
            
            setTimeout(() => {
              fetchShiftedDays()
            }, 500)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingSessionId && (
        <DeleteSleepConfirmModal
          open={!!deletingSessionId}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          loading={isDeleting}
        />
      )}
    </div>
  )
}

