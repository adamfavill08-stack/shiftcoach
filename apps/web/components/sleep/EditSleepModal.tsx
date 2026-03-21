'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, Clock, X } from 'lucide-react'
import type { SleepHistoryEntry } from '@/lib/hooks/useSleepHistory'

type EditSleepModalProps = {
  entry: SleepHistoryEntry
  onClose: () => void
  onUpdated: (updated: SleepHistoryEntry) => void
}

export function EditSleepModal({ entry, onClose, onUpdated }: EditSleepModalProps) {
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [quality, setQuality] = useState(entry.quality ?? 3)
  const [type, setType] = useState<'sleep' | 'nap'>(entry.naps === 0 || entry.naps === null ? 'sleep' : 'nap')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Helper functions for date/time formatting
  const formatDateForInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  const formatTimeForInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  useEffect(() => {
    // Convert ISO timestamps to date and time inputs
    const start = new Date(entry.start_ts)
    const end = new Date(entry.end_ts)

    setStartDate(formatDateForInput(start))
    setStartTime(formatTimeForInput(start))
    setEndDate(formatDateForInput(end))
    setEndTime(formatTimeForInput(end))
  }, [entry])

  const handleSave = async () => {
    if (!startDate || !startTime || !endDate || !endTime) {
      setError('Please provide both start and end dates and times.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Convert date and time to ISO strings
      const startISO = new Date(`${startDate}T${startTime}`).toISOString()
      const endISO = new Date(`${endDate}T${endTime}`).toISOString()

      const res = await fetch(`/api/sleep/log/${entry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: startISO,
          endTime: endISO,
          quality,
          naps: type === 'nap' ? 1 : 0,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || data.error || 'Failed to update sleep log')
        setLoading(false)
        return
      }

      // Update the entry with the response
      if (data.sleep_log) {
        onUpdated(data.sleep_log)
      } else {
        // Fallback: refetch or update manually
        onUpdated({
          ...entry,
          start_ts: startISO,
          end_ts: endISO,
          quality,
          naps: type === 'nap' ? 1 : 0,
          sleep_hours: (new Date(endISO).getTime() - new Date(startISO).getTime()) / 3600000,
        })
      }
    } catch (err: any) {
      console.error('Update error:', err)
      setError(err?.message || 'Failed to update sleep log')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this sleep log? This cannot be undone.')) {
      return
    }

    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/sleep/log/${entry.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to delete sleep log')
        setDeleting(false)
        return
      }

      // Close modal first
      onClose()
      
      // Wait a moment for database to process, then trigger refresh
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('sleep-refreshed'))
      }, 300)
      
      // Also call onUpdated to trigger parent refresh
      onUpdated({
        ...entry,
        // Mark as deleted so parent can handle refresh
      })
    } catch (err: any) {
      console.error('Delete error:', err)
      setError(err?.message || 'Failed to delete sleep log')
    } finally {
      setDeleting(false)
    }
  }

  if (!mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal container */}
      <div className="relative w-full max-w-md max-h-[90vh] bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        {/* Ultra-premium gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-white/98 to-white/95" />
        
        {/* Inner glow */}
        <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-white/80" />
        
        {/* Ambient glow effect */}
        <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-purple-50/30 blur-2xl opacity-50" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100/80">
          <h2 className="text-[19px] font-bold tracking-tight text-slate-900">
            Edit sleep/nap
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 text-slate-600 hover:text-slate-900 transition-all hover:scale-105 active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-7 py-6 space-y-6">
          {/* Start Date & Time */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
              START
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative group">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 pr-10 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)]"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" strokeWidth={2} />
              </div>
              <div className="relative group">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 pr-10 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)]"
                />
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" strokeWidth={2} />
              </div>
            </div>
            {startDate && startTime && (
              <p className="text-[12px] text-slate-500 px-1 font-medium">
                {formatDisplayDate(startDate)} at {formatDisplayTime(startTime)}
              </p>
            )}
          </div>

          {/* End Date & Time */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
              END
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative group">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 pr-10 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)]"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" strokeWidth={2} />
              </div>
              <div className="relative group">
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 pr-10 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)]"
                />
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" strokeWidth={2} />
              </div>
            </div>
            {endDate && endTime && (
              <p className="text-[12px] text-slate-500 px-1 font-medium">
                {formatDisplayDate(endDate)} at {formatDisplayTime(endTime)}
              </p>
            )}
          </div>

          {/* Quality Slider */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
              QUALITY
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={5}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="flex-1 h-2 rounded-full bg-gradient-to-r from-slate-200 to-slate-300 appearance-none cursor-pointer accent-blue-500"
                style={{
                  background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${((quality - 1) / 4) * 100}%, rgb(226, 232, 240) ${((quality - 1) / 4) * 100}%, rgb(226, 232, 240) 100%)`
                }}
              />
              <span className="text-[15px] font-bold text-slate-900 min-w-[3rem] text-right">{quality}/5</span>
            </div>
          </div>

          {/* Type Selector */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
              TYPE
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'sleep' | 'nap')}
              className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)]"
            >
              <option value="sleep">Sleep</option>
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
        <div className="relative z-10 px-7 pb-6 pt-4 border-t border-slate-100/80 space-y-3">
          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={deleting || loading}
            className="w-full h-11 rounded-xl border border-rose-200/80 bg-rose-50/80 backdrop-blur-sm text-[13px] font-semibold text-rose-700 shadow-[0_1px_3px_rgba(244,63,94,0.15)] transition-all hover:shadow-[0_2px_6px_rgba(244,63,94,0.25)] hover:bg-rose-100/80 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting...' : 'Delete Entry'}
          </button>
          
          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm text-[13px] font-semibold text-slate-700 shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)] hover:bg-slate-50/80 active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || deleting}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all hover:shadow-[0_6px_16px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <span className="relative z-10">Save Changes</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shine" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

