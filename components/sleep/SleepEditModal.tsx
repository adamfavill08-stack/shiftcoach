'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, X, ChevronDown, Trash2 } from 'lucide-react'
import type { SleepType } from '@/lib/sleep/types'
import { qualityLabelToNumber } from '@/lib/sleep/utils'

type SleepSession = {
  id: string
  type: SleepType
  startAt: string
  endAt: string
  durationHours?: number
  quality?: string | number | null
  source?: string
}

type SleepEditModalProps = {
  open: boolean
  onClose: () => void
  session: SleepSession | null
  onSuccess?: () => void | Promise<void>
}

export function SleepEditModal({ open, onClose, session, onSuccess }: SleepEditModalProps) {
  const [form, setForm] = useState({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    type: 'main_sleep' as SleepType,
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
      const start = new Date(session.startAt)
      const end = new Date(session.endAt)
      
      setForm({
        startDate: formatDateForInput(start),
        startTime: formatTimeForInput(start),
        endDate: formatDateForInput(end),
        endTime: formatTimeForInput(end),
        type: session.type,
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
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        type: form.type,
        quality: qualityLabelToNumber(form.quality),
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

      // Call success callback if provided
      onClose()
      if (onSuccess) {
        await onSuccess()
      }
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

      // Call success callback if provided
      onClose()
      if (onSuccess) {
        await onSuccess()
      }
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
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-[32px] bg-[var(--card)] shadow-2xl duration-300 animate-in slide-in-from-bottom-4 sm:rounded-[32px] sm:slide-in-from-bottom-0 sm:zoom-in-95">
        {/* Ultra-premium gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--card)] via-[var(--card)] to-[var(--card-subtle)]" />
        
        {/* Inner glow */}
        <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-[var(--border-subtle)]" />
        
        {/* Ambient glow effect */}
        <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-2xl opacity-50 dark:opacity-30" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-[var(--border-subtle)] px-7 pb-4 pt-6">
          <h2 className="text-[19px] font-bold tracking-tight text-slate-900">
            Edit Sleep Session
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] text-[var(--text-soft)] transition-all hover:scale-105 hover:bg-[var(--card-subtle)] hover:text-[var(--text-main)] active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-7 py-6 space-y-6">
          {/* Start Date & Time */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              START
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative group">
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 pr-10 text-[13px] font-semibold text-[var(--text-main)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)] focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                />
                <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-soft)]" strokeWidth={2} />
              </div>
              <div className="relative group">
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 pr-10 text-[13px] font-semibold text-[var(--text-main)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)] focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                />
                <Clock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-soft)]" strokeWidth={2} />
              </div>
            </div>
            {form.startDate && form.startTime && (
              <p className="px-1 text-[12px] font-medium text-[var(--text-muted)]">
                {formatDisplayDate(form.startDate)} at {formatDisplayTime(form.startTime)}
              </p>
            )}
          </div>

          {/* End Date & Time */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              END
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative group">
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 pr-10 text-[13px] font-semibold text-[var(--text-main)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)] focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                />
                <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-soft)]" strokeWidth={2} />
              </div>
              <div className="relative group">
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 pr-10 text-[13px] font-semibold text-[var(--text-main)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)] focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                />
                <Clock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-soft)]" strokeWidth={2} />
              </div>
            </div>
            {form.endDate && form.endTime && (
              <p className="px-1 text-[12px] font-medium text-[var(--text-muted)]">
                {formatDisplayDate(form.endDate)} at {formatDisplayTime(form.endTime)}
              </p>
            )}
          </div>

          {/* Type Selector */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              TYPE
            </label>
            <div className="relative group">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as SleepType })}
                className="h-12 w-full appearance-none cursor-pointer rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 pr-10 text-[13px] font-semibold text-[var(--text-main)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)] focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              >
                <option value="main_sleep">Main Sleep</option>
                <option value="post_shift_sleep">Post-Shift Sleep</option>
                <option value="recovery_sleep">Recovery Sleep</option>
                <option value="nap">Nap</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-soft)]" strokeWidth={2.5} />
            </div>
          </div>

          {/* Quality Selector */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              QUALITY
            </label>
            <div className="relative group">
              <select
                value={form.quality}
                onChange={(e) => setForm({ ...form, quality: e.target.value as 'Excellent' | 'Good' | 'Fair' | 'Poor' })}
                className="h-12 w-full appearance-none cursor-pointer rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 pr-10 text-[13px] font-semibold text-[var(--text-main)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)] focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-soft)]" strokeWidth={2.5} />
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
        <div className="relative z-10 border-t border-[var(--border-subtle)] bg-gradient-to-b from-[var(--card)] to-[var(--card-subtle)] px-7 py-5">
          <div className="flex flex-col gap-3">
            {/* Delete button */}
            <button
              onClick={handleDelete}
              disabled={deleting || saving}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-300/60 bg-rose-50/70 px-4 text-[13px] font-semibold text-rose-700 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-all hover:scale-95 hover:border-rose-300/80 hover:bg-rose-100/70 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-300"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.5} />
              {deleting ? 'Deleting...' : showDeleteConfirm ? 'Confirm Delete' : 'Delete Session'}
            </button>

            {/* Save and Cancel buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={saving || deleting}
                className="h-12 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 text-[13px] font-semibold text-[var(--text-soft)] shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-all hover:bg-[var(--card)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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

