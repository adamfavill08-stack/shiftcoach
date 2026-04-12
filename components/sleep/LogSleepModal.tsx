'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, X, ChevronDown } from 'lucide-react'
import type { SleepLogInput, SleepType } from '@/lib/sleep/types'
import { qualityLabelToNumber } from '@/lib/sleep/utils'
import { useTranslation } from '@/components/providers/language-provider'

type DisplayQuality = 'Excellent' | 'Good' | 'Fair' | 'Poor'

export function LogSleepModal({
  open,
  onClose,
  onSubmit,
  defaultStart,
  defaultEnd,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: SleepLogInput) => Promise<void>
  defaultStart?: Date | null
  defaultEnd?: Date | null
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    type: 'main_sleep' as SleepType,
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
      type: 'main_sleep',
      startDate: formatDateForInput(startDate),
      startTime: formatTimeForInput(startDate),
      endDate: formatDateForInput(endDate),
      endTime: formatTimeForInput(endDate),
      quality: 'Good',
      notes: '',
    })
  }, [open, defaultStart, defaultEnd])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal container */}
      <div className="relative flex max-h-[min(90dvh,90vh)] w-full max-w-md flex-col overflow-hidden rounded-t-[32px] bg-[var(--card)] shadow-2xl duration-300 animate-in slide-in-from-bottom-4 sm:max-h-[90vh] sm:rounded-[32px] sm:slide-in-from-bottom-0 sm:zoom-in-95">
        {/* Ultra-premium gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--card)] via-[var(--card)] to-[var(--card-subtle)]" />
        
        {/* Inner glow */}
        <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-[var(--border-subtle)]" />
        
        {/* Ambient glow effect */}
        <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-2xl opacity-50 dark:opacity-30" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-[var(--border-subtle)] px-7 pb-4 pt-6">
          <h2 className="text-[19px] font-bold tracking-tight text-[var(--text-main)]">
            {t('sleepLog.title')}
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
              {t('sleepForm.startLabel')}
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
          </div>

          {/* End Date & Time */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              {t('sleepForm.endLabel')}
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
          </div>

          {/* Type & Quality */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                {t('sleepForm.typeLabel')}
              </label>
              <div className="relative group">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as SleepType })}
                  className="h-12 w-full appearance-none cursor-pointer rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 pr-10 text-[13px] font-semibold text-[var(--text-main)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)] focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                >
                  <option value="main_sleep">{t('sleepType.main_sleep')}</option>
                  <option value="post_shift_sleep">{t('sleepType.post_shift_sleep')}</option>
                  <option value="recovery_sleep">{t('sleepType.recovery_sleep')}</option>
                  <option value="nap">{t('sleepType.nap')}</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-soft)]" strokeWidth={2.5} />
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                {t('sleepLog.qualityLabel')}
              </label>
              <div className="relative group">
                <select
                  value={form.quality}
                  onChange={(e) => setForm({ ...form, quality: e.target.value as 'Excellent' | 'Good' | 'Fair' | 'Poor' })}
                  className="h-12 w-full appearance-none cursor-pointer rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 pr-10 text-[13px] font-semibold text-[var(--text-main)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)] focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                >
                  <option value="Excellent">{t('sleepQuality.excellent')}</option>
                  <option value="Good">{t('sleepQuality.good')}</option>
                  <option value="Fair">{t('sleepQuality.fair')}</option>
                  <option value="Poor">{t('sleepQuality.poor')}</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-soft)]" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              {t('sleepLog.notesLabel')}
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 py-3 text-[13px] font-medium text-[var(--text-main)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)] focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              placeholder={t('sleepLog.notesPlaceholder')}
            />
          </div>
        </div>

        {/* Footer: extra bottom inset on phones (home indicator / gesture bar) */}
        <div className="relative z-10 border-t border-[var(--border-subtle)] bg-gradient-to-b from-[var(--card)] to-[var(--card-subtle)] px-7 pt-5 pb-[max(1.75rem,calc(1rem+env(safe-area-inset-bottom,0px)))]">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="h-12 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 text-[13px] font-semibold text-[var(--text-soft)] shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-all hover:bg-[var(--card)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] active:scale-95"
            >
              {t('sleepForm.cancel')}
            </button>
            <button
              disabled={saving || !form.startDate || !form.startTime || !form.endDate || !form.endTime}
              onClick={async () => {
                setSaving(true)
                try {
                  const startAt = new Date(`${form.startDate}T${form.startTime}`)
                  const endAt = new Date(`${form.endDate}T${form.endTime}`)
                  
                  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
                    throw new Error(t('sleepLog.errInvalid'))
                  }

                  if (endAt <= startAt) {
                    throw new Error(t('sleepLog.errEndAfter'))
                  }

                  const durationMinutes = Math.round((endAt.getTime() - startAt.getTime()) / 60000)
                  if (durationMinutes < 10) {
                    throw new Error(t('sleepLog.errMin10'))
                  }
                  if (durationMinutes > 24 * 60) {
                    throw new Error(t('sleepLog.errMax24'))
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
                  alert(error instanceof Error ? error.message : t('sleepLog.errSave'))
                } finally {
                  setSaving(false)
                }
              }}
              className="flex-1 h-12 px-4 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white text-[13px] font-semibold shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
            >
              <span className="relative z-10">{saving ? t('sleepForm.saving') : t('sleepForm.save')}</span>
              {/* Shine effect on hover */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
