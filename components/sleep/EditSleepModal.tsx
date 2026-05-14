'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, Clock, X } from 'lucide-react'
import type { SleepHistoryEntry } from '@/lib/hooks/useSleepHistory'
import { notifySleepLogsUpdated } from '@/lib/circadian/circadianAgent'
import { useLanguage, useTranslation } from '@/components/providers/language-provider'
import { intlLocaleForApp } from '@/lib/i18n/supportedLocales'

type EditSleepModalProps = {
  entry: SleepHistoryEntry
  onClose: () => void
  onUpdated: (updated: SleepHistoryEntry) => void
}

export function EditSleepModal({ entry, onClose, onUpdated }: EditSleepModalProps) {
  const { language } = useLanguage()
  const { t } = useTranslation()
  const intlLocale = useMemo(() => intlLocaleForApp(language), [language])

  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [quality, setQuality] = useState(entry.quality ?? 3)
  const [type, setType] = useState<'sleep' | 'nap'>(
    entry.naps === 0 || entry.naps === null ? 'sleep' : 'nap',
  )
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const formatDateForInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  const formatTimeForInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const formatDisplayDate = useCallback(
    (dateStr: string) => {
      if (!dateStr) return ''
      const d = new Date(`${dateStr}T12:00:00`)
      return d.toLocaleDateString(intlLocale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    },
    [intlLocale],
  )

  const formatDisplayTime = useCallback(
    (timeStr: string) => {
      if (!timeStr) return ''
      const parts = timeStr.split(':')
      const h = parseInt(parts[0] || '0', 10)
      const m = parseInt(parts[1] || '0', 10)
      const d = new Date()
      d.setHours(h, m, 0, 0)
      return d.toLocaleTimeString(intlLocale, { hour: 'numeric', minute: '2-digit' })
    },
    [intlLocale],
  )

  useEffect(() => {
    const start = new Date(entry.start_ts)
    const end = new Date(entry.end_ts)

    setStartDate(formatDateForInput(start))
    setStartTime(formatTimeForInput(start))
    setEndDate(formatDateForInput(end))
    setEndTime(formatTimeForInput(end))
  }, [entry])

  const handleSave = async () => {
    if (!startDate || !startTime || !endDate || !endTime) {
      setError(t('sleepForm.errStartEnd'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const startISO = new Date(`${startDate}T${startTime}`).toISOString()
      const endISO = new Date(`${endDate}T${endTime}`).toISOString()
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

      const res = await fetch(`/api/sleep/sessions/${entry.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startAt: startISO,
          endAt: endISO,
          type: type === 'nap' ? 'nap' : 'main_sleep',
          quality,
          timezone,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || data.error || t('sleepEdit.errUpdate'))
        setLoading(false)
        return
      }

      const updatedSession = data.session ?? data.sleep_log
      if (updatedSession) {
        notifySleepLogsUpdated()
        onUpdated({
          ...entry,
          start_ts: updatedSession.start_at ?? startISO,
          end_ts: updatedSession.end_at ?? endISO,
          quality: updatedSession.quality ?? quality,
          naps: updatedSession.type === 'nap' ? 1 : 0,
          sleep_hours:
            (new Date(updatedSession.end_at ?? endISO).getTime() -
              new Date(updatedSession.start_at ?? startISO).getTime()) /
            3600000,
        })
      } else {
        notifySleepLogsUpdated()
        onUpdated({
          ...entry,
          start_ts: startISO,
          end_ts: endISO,
          quality,
          naps: type === 'nap' ? 1 : 0,
          sleep_hours: (new Date(endISO).getTime() - new Date(startISO).getTime()) / 3600000,
        })
      }
    } catch (err: unknown) {
      console.error('Update error:', err)
      setError(err instanceof Error && err.message ? err.message : t('sleepEdit.errUpdate'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('sleepEditLegacy.deleteConfirm'))) {
      return
    }

    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/sleep/sessions/${entry.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('sleepEdit.errDelete'))
        setDeleting(false)
        return
      }

      notifySleepLogsUpdated()

      onClose()

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('sleep-refreshed'))
      }, 300)

      onUpdated({
        ...entry,
      })
    } catch (err: unknown) {
      console.error('Delete error:', err)
      setError(err instanceof Error && err.message ? err.message : t('sleepEdit.errDelete'))
    } finally {
      setDeleting(false)
    }
  }

  if (!mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md max-h-[90vh] bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-white/98 to-white/95" />

        <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-white/80" />

        <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-purple-50/30 blur-2xl opacity-50" />

        <div className="relative z-10 flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100/80">
          <h2 className="text-[19px] font-bold tracking-tight text-slate-900">
            {t('sleepEditLegacy.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('sleepDel.closeAria')}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 text-slate-600 hover:text-slate-900 transition-all hover:scale-105 active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto px-7 py-6 space-y-6">
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
              {t('sleepForm.startLabel')}
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
                {t('sleepEdit.dateTimePreview', {
                  date: formatDisplayDate(startDate),
                  time: formatDisplayTime(startTime),
                })}
              </p>
            )}
          </div>

          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
              {t('sleepForm.endLabel')}
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
                {t('sleepEdit.dateTimePreview', {
                  date: formatDisplayDate(endDate),
                  time: formatDisplayTime(endTime),
                })}
              </p>
            )}
          </div>

          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
              {t('sleepLog.qualityLabel')}
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
                  background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${((quality - 1) / 4) * 100}%, rgb(226, 232, 240) ${((quality - 1) / 4) * 100}%, rgb(226, 232, 240) 100%)`,
                }}
              />
              <span className="text-[15px] font-bold text-slate-900 min-w-[3rem] text-right">
                {quality}/5
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
              {t('sleepForm.typeLabel')}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'sleep' | 'nap')}
              className="w-full h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm px-4 text-[13px] font-semibold text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400/60 transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)]"
            >
              <option value="sleep">{t('sleepType.default')}</option>
              <option value="nap">{t('sleepForm.typeNap')}</option>
            </select>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50/80 border border-rose-200/60 px-4 py-3">
              <p className="text-[13px] font-medium text-rose-700">{error}</p>
            </div>
          )}
        </div>

        <div className="relative z-10 px-7 pb-6 pt-4 border-t border-slate-100/80 space-y-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || loading}
            className="w-full h-11 rounded-xl border border-rose-200/80 bg-rose-50/80 backdrop-blur-sm text-[13px] font-semibold text-rose-700 shadow-[0_1px_3px_rgba(244,63,94,0.15)] transition-all hover:shadow-[0_2px_6px_rgba(244,63,94,0.25)] hover:bg-rose-100/80 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? t('sleepDel.deleting') : t('sleepEditLegacy.deleteEntry')}
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border border-slate-200/80 bg-white/90 backdrop-blur-sm text-[13px] font-semibold text-slate-700 shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)] hover:bg-slate-50/80 active:scale-95"
            >
              {t('sleepForm.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || deleting}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all hover:shadow-[0_6px_16px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden"
            >
              {loading ? (
                <span>{t('sleepForm.saving')}</span>
              ) : (
                <>
                  <span className="relative z-10">{t('sleepEdit.saveChanges')}</span>
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
