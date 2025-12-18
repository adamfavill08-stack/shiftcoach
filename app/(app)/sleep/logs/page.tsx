'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, Clock, Moon, Coffee, Calendar as CalendarIcon, Pencil, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { EditSleepModal } from '@/components/sleep/EditSleepModal'
import { DeleteSleepConfirmModal } from '@/components/sleep/DeleteSleepConfirmModal'

type SleepLogEntry = {
  id: string
  date: string
  start_at: string
  end_at: string
  type: 'sleep' | 'nap'
  durationHours: number
  quality?: string | null
}

type ShiftInfo = {
  date: string
  label: string
  start_ts?: string | null
  end_ts?: string | null
}

type DayGroup = {
  date: string
  dateLabel: string
  dayLabel: string
  logs: SleepLogEntry[]
  shift: ShiftInfo
  totalHours: number
}

export default function SleepLogsPage() {
  const router = useRouter()
  const [days, setDays] = useState<DayGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [editingLog, setEditingLog] = useState<SleepLogEntry | null>(null)
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Calculate date range (last 30 days)
        const now = new Date()
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const fromDate = thirtyDaysAgo.toISOString().slice(0, 10)
        const toDate = now.toISOString().slice(0, 10)

        // Fetch sleep logs and shifts in parallel
        const [sleepRes, shiftsRes] = await Promise.all([
          fetch(`/api/sleep/history?from=${fromDate}&to=${toDate}`, { cache: 'no-store' }),
          fetch(`/api/shifts?from=${fromDate}&to=${toDate}`, { cache: 'no-store' }),
        ])

        if (!sleepRes.ok || !shiftsRes.ok) {
          console.error('[SleepLogsPage] Failed to fetch data')
          setDays([])
          return
        }

        const sleepData = await sleepRes.json()
        const shiftsData = await shiftsRes.json()

        const logs: SleepLogEntry[] = (sleepData.items || []).map((item: any) => {
          const startTime = item.start_at || item.start_ts
          const endTime = item.end_at || item.end_ts
          
          if (!startTime || !endTime) return null
          
          const start = new Date(startTime)
          const end = new Date(endTime)
          const durationMs = end.getTime() - start.getTime()
          const durationHours = durationMs / (1000 * 60 * 60)
          
          // Determine type from old schema (naps) or new schema (type)
          const sessionType: 'sleep' | 'nap' = item.type || (item.naps === 0 || !item.naps ? 'sleep' : 'nap')
          
          // Get date from start time
          const date = start.toISOString().slice(0, 10)
          
          return {
            id: item.id,
            date,
            start_at: startTime,
            end_at: endTime,
            type: sessionType,
            durationHours,
            quality: item.quality,
          }
        }).filter((log: any) => log !== null)

        // Create a map of shifts by date
        const shiftsByDate = new Map<string, ShiftInfo>()
        ;(shiftsData.shifts || []).forEach((shift: any) => {
          shiftsByDate.set(shift.date, {
            date: shift.date,
            label: shift.label || 'OFF',
            start_ts: shift.start_ts,
            end_ts: shift.end_ts,
          })
        })

        // Group logs by date
        const logsByDate = new Map<string, SleepLogEntry[]>()
        logs.forEach((log) => {
          if (!logsByDate.has(log.date)) {
            logsByDate.set(log.date, [])
          }
          logsByDate.get(log.date)!.push(log)
        })

        // Create day groups for the last 30 days (newest first)
        const dayGroups: DayGroup[] = []
        for (let i = 0; i <= 29; i++) {
          const date = new Date(now)
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().slice(0, 10)
          
          const dayLogs = logsByDate.get(dateStr) || []
          // Always show a shift - default to "OFF" if no shift is found
          const shift = shiftsByDate.get(dateStr) || {
            date: dateStr,
            label: 'OFF',
            start_ts: null,
            end_ts: null,
          }
          
          const totalHours = dayLogs.reduce((sum, log) => sum + log.durationHours, 0)
          
          dayGroups.push({
            date: dateStr,
            dateLabel: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            dayLabel: date.toLocaleDateString('en-GB', { weekday: 'short' }),
            // Sort logs within each day from newest to oldest (by start time descending)
            logs: dayLogs.sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()),
            shift,
            totalHours,
          })
        }

        setDays(dayGroups)
      } catch (err) {
        console.error('[SleepLogsPage] Error fetching data:', err)
        setDays([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Listen for sleep refresh events
    const handleRefresh = () => {
      fetchData()
    }
    window.addEventListener('sleep-refreshed', handleRefresh)
    
    return () => {
      window.removeEventListener('sleep-refreshed', handleRefresh)
    }
  }, [])

  const handleEdit = (log: SleepLogEntry) => {
    setEditingLog(log)
  }

  const handleDelete = (logId: string) => {
    setDeletingLogId(logId)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingLogId) return

    setIsDeleting(true)
    try {
      console.log('[SleepLogsPage] Attempting to delete sleep log:', deletingLogId)
      
      const res = await fetch(`/api/sleep/log/${deletingLogId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const responseData = await res.json().catch(() => ({ error: 'Failed to parse response' }))
      
      console.log('[SleepLogsPage] Delete response:', { status: res.status, data: responseData })

      if (!res.ok) {
        const errorMessage = responseData.error || responseData.details || `Failed to delete (${res.status})`
        console.error('[SleepLogsPage] Delete failed:', errorMessage)
        throw new Error(errorMessage)
      }

      // Remove from local state
      setDays(prevDays => {
        const updated = prevDays.map(day => ({
          ...day,
          logs: day.logs.filter(log => log.id !== deletingLogId)
        })).map(day => ({
          ...day,
          totalHours: day.logs.reduce((sum, log) => sum + log.durationHours, 0)
        }))
        return updated
      })

      // Close modal
      setDeletingLogId(null)
      setIsDeleting(false)

      // Trigger refresh for other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sleep-refreshed'))
        window.localStorage.setItem('sleepRefresh', Date.now().toString())
      }
      
      // Refresh router for server components
      router.refresh()
      
      console.log('[SleepLogsPage] Successfully deleted and refreshed')
    } catch (err: any) {
      console.error('[SleepLogsPage] Delete error:', err)
      alert(err.message || 'Failed to delete sleep log. Please try again.')
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeletingLogId(null)
    setIsDeleting(false)
  }

  const handleEditSuccess = (updatedEntry: any) => {
    // Update the log in local state
    setDays(prevDays => 
      prevDays.map(day => ({
        ...day,
        logs: day.logs.map(log => {
          if (log.id === updatedEntry.id) {
            // Recalculate duration
            const start = new Date(updatedEntry.start_ts || updatedEntry.start_at)
            const end = new Date(updatedEntry.end_ts || updatedEntry.end_at)
            const durationMs = end.getTime() - start.getTime()
            const durationHours = durationMs / (1000 * 60 * 60)
            
            return {
              ...log,
              start_at: updatedEntry.start_ts || updatedEntry.start_at,
              end_at: updatedEntry.end_ts || updatedEntry.end_at,
              type: updatedEntry.type || (updatedEntry.naps === 0 ? 'sleep' : 'nap'),
              durationHours,
              quality: updatedEntry.quality,
            }
          }
          return log
        })
      })).map(day => ({
        ...day,
        totalHours: day.logs.reduce((sum, log) => sum + log.durationHours, 0)
      }))
    )

    setEditingLog(null)

    // Trigger refresh for other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sleep-refreshed'))
      window.localStorage.setItem('sleepRefresh', Date.now().toString())
    }
    
    // Refresh router for server components
    router.refresh()
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

  const getShiftColor = (label: string) => {
    const normalized = label.toLowerCase()
    if (normalized.includes('night')) return 'bg-slate-700 text-white'
    if (normalized.includes('day') || normalized.includes('morning') || normalized.includes('afternoon')) return 'bg-blue-100 text-blue-700'
    if (normalized.includes('off') || normalized.includes('rest')) return 'bg-slate-100 text-slate-700'
    return 'bg-slate-200 text-slate-800'
  }

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-4 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 text-slate-700 hover:text-slate-900 transition-all hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <div className="flex-1">
            <h1 className="text-[19px] font-bold tracking-tight text-slate-900">
              Sleep History
            </h1>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Last 30 days
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-slate-100/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : days.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100/80 mb-4">
              <Moon className="h-8 w-8 text-slate-400" strokeWidth={2} />
            </div>
            <p className="text-[15px] font-medium text-slate-600 mb-1">No sleep logs found</p>
            <p className="text-[12px] text-slate-500">Start logging your sleep to see it here</p>
          </div>
        ) : (
          days.map((day) => (
            <div
              key={day.date}
              className="relative overflow-hidden rounded-xl bg-white/90 backdrop-blur-xl border border-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
            >
              {/* Premium gradient overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 to-white/55" />
              
              <div className="relative z-10 p-3.5">
                {/* Day Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100/80 border border-slate-200/60">
                      <CalendarIcon className="h-4 w-4 text-slate-600" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-bold text-slate-900">
                        {day.dayLabel}, {day.dateLabel}
                      </h3>
                      {day.totalHours > 0 && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {formatDuration(day.totalHours)} total
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Shift Badge - Always show, defaults to "OFF" if no shift */}
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${getShiftColor(day.shift?.label || 'OFF')}`}>
                    {day.shift?.label || 'OFF'}
                  </div>
                </div>

                {/* Sleep Logs */}
                {day.logs.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-[11px] text-slate-500">No sleep logged</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {day.logs.map((log) => (
                      <div
                        key={log.id}
                        className="group relative overflow-hidden rounded-lg border border-slate-200/80 bg-white/90 backdrop-blur-sm px-3 py-2.5 transition-all duration-200 hover:shadow-sm hover:border-slate-300/80 cursor-pointer"
                        onClick={() => handleEdit(log)}
                      >
                        {/* Subtle gradient overlay */}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative z-10 flex items-center justify-between">
                          {/* Left: Type indicator and times */}
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            {/* Type indicator */}
                            <div className={`
                              flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center
                              ${log.type === 'sleep' 
                                ? 'bg-blue-50 border border-blue-200/60' 
                                : 'bg-amber-50 border border-amber-200/60'
                              }
                            `}>
                              {log.type === 'sleep' ? (
                                <Moon className="h-4 w-4 text-blue-600" strokeWidth={2} />
                              ) : (
                                <Coffee className="h-4 w-4 text-amber-600" strokeWidth={2} />
                              )}
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`
                                  text-[11px] font-bold uppercase tracking-wide
                                  ${log.type === 'sleep' ? 'text-blue-600' : 'text-amber-600'}
                                `}>
                                  {log.type === 'sleep' ? 'Main Sleep' : 'Nap'}
                                </span>
                                {log.quality && (
                                  <span className="text-[9px] text-slate-500 capitalize px-1 py-0.5 rounded bg-slate-100/60">
                                    {log.quality}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                <Clock className="h-3 w-3 text-slate-400" strokeWidth={2} />
                                <span className="font-medium">
                                  {formatTime(log.start_at)} → {formatTime(log.end_at)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Duration and Actions */}
                          <div className="flex-shrink-0 ml-3 flex items-center gap-2">
                            <div className="text-right">
                              <div className="text-[14px] font-bold text-slate-900">
                                {formatDuration(log.durationHours)}
                              </div>
                            </div>
                            {/* Action buttons - visible on hover */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEdit(log)
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200/60 text-blue-600 hover:text-blue-700 transition-all hover:scale-110 active:scale-95"
                                aria-label="Edit sleep entry"
                              >
                                <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(log.id)
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 border border-red-200/60 text-red-600 hover:text-red-700 transition-all hover:scale-110 active:scale-95"
                                aria-label="Delete sleep entry"
                              >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingLog && (
        <EditSleepModal
          entry={{
            id: editingLog.id,
            date: editingLog.date,
            start_ts: editingLog.start_at,
            end_ts: editingLog.end_at,
            sleep_hours: editingLog.durationHours,
            quality: typeof editingLog.quality === 'string' 
              ? editingLog.quality === 'Excellent' ? 5 
              : editingLog.quality === 'Good' ? 4
              : editingLog.quality === 'Fair' ? 3
              : editingLog.quality === 'Poor' ? 1
              : 3
              : 3,
            naps: editingLog.type === 'nap' ? 1 : 0,
          }}
          onClose={() => setEditingLog(null)}
          onUpdated={handleEditSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingLogId && (
        <DeleteSleepConfirmModal
          open={!!deletingLogId}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          loading={isDeleting}
        />
      )}
    </div>
  )
}

