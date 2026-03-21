'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, X, ChevronDown, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type SleepSession = {
  id: string
  session_type: 'main' | 'nap'
  start_time: string
  end_time: string
  durationHours?: number
  quality?: string | number | null
  source?: string
}

type SleepEditModalProps = {
  open: boolean
  onClose: () => void
  session: SleepSession | null
  onSuccess?: () => void
}

export function SleepEditModal({ open, onClose, session, onSuccess }: SleepEditModalProps) {
  const router = useRouter()
  const [form, setForm] = useState({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    type: 'main' as 'main' | 'nap',
    quality: 'Good' as 'Excellent' | 'Good' | 'Fair' | 'Poor',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Helper to normalize quality value
  const normalizeQuality = (quality: string | number | null | undefined): 'Excellent' | 'Good' | 'Fair' | 'Poor' => {
    if (!quality) return 'Good'
    if (typeof quality === 'number') {
      const qualityMap: Record<number, 'Excellent' | 'Good' | 'Fair' | 'Poor'> = { 
        5: 'Excellent', 4: 'Good', 3: 'Fair', 2: 'Fair', 1: 'Poor' 
      }
      return qualityMap[quality] || 'Good'
    }
    if (typeof quality === 'string') {
      const normalized = quality.charAt(0).toUpperCase() + quality.slice(1).toLowerCase()
      if (['Excellent', 'Good', 'Fair', 'Poor'].includes(normalized)) {
        return normalized as 'Excellent' | 'Good' | 'Fair' | 'Poor'
      }
    }
    return 'Good'
  }

  // Initialize form when modal opens or session changes
  useEffect(() => {
    if (open && session) {
      const start = new Date(session.start_time)
      const end = new Date(session.end_time)
      
      setForm({
        startDate: formatDateForInput(start),
        startTime: formatTimeForInput(start),
        endDate: formatDateForInput(end),
        endTime: formatTimeForInput(end),
        type: session.session_type,
        quality: normalizeQuality(session.quality),
      })
      setError(null)
      setShowDeleteConfirm(false)
    }
  }, [open, session])

  const handleSave = async () => {
    if (!session) return

    setError(null)
    
    if (!form.startDate || !form.startTime || !form.endDate || !form.endTime) {
      setError('Please provide both start and end dates and times.')
      return
    }

    setSaving(true)
    try {
      // Combine date and time into ISO strings
      const startDate = new Date(`${form.startDate}T${form.startTime}`)
      const endDate = new Date(`${form.endDate}T${form.endTime}`)
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date or time')
      }
      
      // Ensure end is after start
      if (endDate <= startDate) {
        throw new Error('End time must be after start time')
      }

      // Update session via PATCH
      const payload = {
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        session_type: form.type,
        quality: form.quality,
      }
      
      console.log('[SleepEditModal] Updating session:', session.id, 'with payload:', payload)
      
      const res = await fetch(`/api/sleep/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to update sleep' }))
        console.error('[SleepEditModal] Update failed:', {
          status: res.status,
          statusText: res.statusText,
          error: errorData,
        })
        throw new Error(errorData.error || errorData.details || 'Failed to update sleep')
      }

      const responseData = await res.json().catch(() => null)
      console.log('[SleepEditModal] Update successful:', responseData)

      // Trigger updates
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sleepRefresh', Date.now().toString())
        window.dispatchEvent(new CustomEvent('sleep-refreshed'))
      }

      // Trigger circadian recalculation
      fetch('/api/shift-rhythm?force=true').catch(() => {})

      // Refresh page to update sleep summary
      router.refresh()

      // Call success callback if provided
      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (err) {
      console.error('[SleepEditModal] Save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save sleep')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!session) return

    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/sleep/sessions/${session.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to delete sleep' }))
        throw new Error(errorData.error || 'Failed to delete sleep')
      }

      // Trigger updates
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('sleepRefresh', Date.now().toString())
        window.dispatchEvent(new CustomEvent('sleep-refreshed'))
      }

      // Trigger circadian recalculation
      fetch('/api/shift-rhythm?force=true').catch(() => {})

      // Refresh page to update sleep summary
      router.refresh()

      // Call success callback if provided
      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (err) {
      console.error('[SleepEditModal] Delete error:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete sleep')
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  if (!open || !session) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
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
            Edit Sleep Session
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
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 pr-10 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)]"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" strokeWidth={2} />
              </div>
              <div className="relative group">
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 pr-10 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)]"
                />
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" strokeWidth={2} />
              </div>
            </div>
            {form.startDate && form.startTime && (
              <p className="text-[12px] text-slate-500 px-1 font-medium">
                {formatDisplayDate(form.startDate)} at {formatDisplayTime(form.startTime)}
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
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 pr-10 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)]"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" strokeWidth={2} />
              </div>
              <div className="relative group">
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 pr-10 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)]"
                />
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" strokeWidth={2} />
              </div>
            </div>
            {form.endDate && form.endTime && (
              <p className="text-[12px] text-slate-500 px-1 font-medium">
                {formatDisplayDate(form.endDate)} at {formatDisplayTime(form.endTime)}
              </p>
            )}
          </div>

          {/* Type Selector */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
              TYPE
            </label>
            <div className="relative group">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'main' | 'nap' })}
                className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 pr-10 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)] appearance-none cursor-pointer"
              >
                <option value="main">Main Sleep</option>
                <option value="nap">Nap</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" strokeWidth={2.5} />
            </div>
          </div>

          {/* Quality Selector */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
              QUALITY
            </label>
            <div className="relative group">
              <select
                value={form.quality}
                onChange={(e) => setForm({ ...form, quality: e.target.value as 'Excellent' | 'Good' | 'Fair' | 'Poor' })}
                className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 pr-10 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)] appearance-none cursor-pointer"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" strokeWidth={2.5} />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-xl bg-rose-50/80 border border-rose-200/60 px-4 py-3">
              <p className="text-[13px] font-medium text-rose-700">{error}</p>
            </div>
          )}

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className="rounded-xl bg-amber-50/80 border border-amber-200/60 px-4 py-3 space-y-2">
              <p className="text-[13px] font-semibold text-amber-900">
                Are you sure you want to delete this sleep session?
              </p>
              <p className="text-[12px] text-amber-700">
                This will update your 7-day bars, sleep summary, and body clock calculations.
              </p>
            </div>
          )}
        </div>

        {/* Footer with buttons */}
        <div className="relative z-10 px-7 py-5 border-t border-slate-100/80 bg-gradient-to-b from-white/95 to-white">
          <div className="flex flex-col gap-3">
            {/* Delete button */}
            <button
              onClick={handleDelete}
              disabled={deleting || saving}
              className="w-full h-12 px-4 rounded-xl bg-white/90 backdrop-blur-sm border border-rose-200/80 text-[13px] font-semibold text-rose-600 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-all hover:bg-rose-50/80 hover:border-rose-300/80 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.5} />
              {deleting ? 'Deleting...' : showDeleteConfirm ? 'Confirm Delete' : 'Delete Session'}
            </button>

            {/* Save and Cancel buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={saving || deleting}
                className="flex-1 h-12 px-4 rounded-xl bg-white/90 backdrop-blur-sm border border-slate-200/80 text-[13px] font-semibold text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-all hover:bg-white hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                disabled={saving || deleting || !form.startDate || !form.startTime || !form.endDate || !form.endTime}
                onClick={handleSave}
                className="flex-1 h-12 px-4 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white text-[13px] font-semibold shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
              >
                <span className="relative z-10">{saving ? 'Saving…' : 'Save Changes'}</span>
                {/* Shine effect on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

