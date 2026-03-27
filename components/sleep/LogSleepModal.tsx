'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, X, ChevronDown } from 'lucide-react'
import type { SleepLogInput, SleepType } from '@/lib/sleep/types'
import { qualityLabelToNumber } from '@/lib/sleep/utils'

type DisplayQuality = 'Excellent' | 'Good' | 'Fair' | 'Poor'

export function LogSleepModal({
  open,
  onClose,
  onSubmit,
  defaultType = 'main_sleep',
  defaultStart,
  defaultEnd,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: SleepLogInput) => Promise<void>
  defaultType?: SleepType
  defaultStart?: Date | null
  defaultEnd?: Date | null
}) {
  const [form, setForm] = useState({
    type: defaultType,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    quality: 'Good' as DisplayQuality,
    notes: '',
  })

  const [saving, setSaving] = useState(false)

  const formatDateForInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  const formatTimeForInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  useEffect(() => {
    if (!open) return

    let startDate: Date
    let endDate: Date

    if (defaultStart && defaultEnd) {
      startDate = defaultStart
      endDate = defaultEnd
    } else {
      const now = new Date()
      const start = new Date(now)
      start.setHours(now.getHours() - 8, 0, 0, 0)
      startDate = start
      endDate = now
    }

    setForm({
      type: defaultType,
      startDate: formatDateForInput(startDate),
      startTime: formatTimeForInput(startDate),
      endDate: formatDateForInput(endDate),
      endTime: formatTimeForInput(endDate),
      quality: 'Good',
      notes: '',
    })
  }, [open, defaultType, defaultStart, defaultEnd])

  if (!open) return null

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
          <h2 className="text-[19px] font-bold tracking-tight text-slate-900">Log sleep</h2>
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
          </div>

          {/* Type & Quality */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                TYPE
              </label>
              <div className="relative group">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as SleepType })}
                  className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 pr-10 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)] appearance-none cursor-pointer"
                >
                  <option value="main_sleep">Main Sleep</option>
                  <option value="post_shift_sleep">Post-Shift Sleep</option>
                  <option value="recovery_sleep">Recovery Sleep</option>
                  <option value="nap">Nap</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" strokeWidth={2.5} />
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
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
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
              NOTES
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 py-3 text-[13px] text-slate-900 font-medium shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all resize-none hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)]"
              placeholder="Anything to remember about this sleep?"
            />
          </div>
        </div>

        {/* Footer with buttons */}
        <div className="relative z-10 px-7 py-5 border-t border-slate-100/80 bg-gradient-to-b from-white/95 to-white">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-12 px-4 rounded-xl bg-white/90 backdrop-blur-sm border border-slate-200/80 text-[13px] font-semibold text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-all hover:bg-white hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] active:scale-95"
            >
              Cancel
            </button>
            <button
              disabled={saving || !form.startDate || !form.startTime || !form.endDate || !form.endTime}
              onClick={async () => {
                setSaving(true)
                try {
                  const startAt = new Date(`${form.startDate}T${form.startTime}`)
                  const endAt = new Date(`${form.endDate}T${form.endTime}`)
                  
                  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
                    throw new Error('Invalid date or time')
                  }

                  if (endAt <= startAt) {
                    throw new Error('End time must be after start time')
                  }

                  const durationMinutes = Math.round((endAt.getTime() - startAt.getTime()) / 60000)
                  if (durationMinutes < 10) {
                    throw new Error('Sleep session must be at least 10 minutes')
                  }
                  if (durationMinutes > 24 * 60) {
                    throw new Error('Sleep session cannot be longer than 24 hours')
                  }

                  await onSubmit({
                    type: form.type,
                    startAt: startAt.toISOString(),
                    endAt: endAt.toISOString(),
                    quality: qualityLabelToNumber(form.quality),
                    notes: form.notes.trim() || undefined,
                    source: 'manual',
                  })
                  onClose()
                } catch (error) {
                  alert(error instanceof Error ? error.message : 'Failed to save sleep')
                } finally {
                  setSaving(false)
                }
              }}
              className="flex-1 h-12 px-4 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white text-[13px] font-semibold shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
            >
              <span className="relative z-10">{saving ? 'Saving…' : 'Save'}</span>
              {/* Shine effect on hover */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
