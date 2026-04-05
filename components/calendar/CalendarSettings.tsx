'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Layers, Download, Upload, CheckCircle2, AlertCircle, Calendar, CalendarDays } from 'lucide-react'
import { authedFetch } from '@/lib/supabase/authedFetch'
import {
  readCalendarSettings,
  writeCalendarSettingsPatch,
  type CalendarViewPreference,
} from '@/lib/calendar/calendarSettingsStorage'
import { useTranslation } from '@/components/providers/language-provider'

export { CALENDAR_SETTINGS_CHANGED_EVENT } from '@/lib/calendar/calendarSettingsStorage'

/**
 * Shift calendar settings that are actually wired in the app today.
 */
export function CalendarSettings() {
  const { t } = useTranslation()
  const [showShiftBars, setShowShiftBars] = useState(true)
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(1)
  const [defaultCalendarView, setDefaultCalendarView] = useState<CalendarViewPreference>('month')
  const [status, setStatus] = useState<'idle' | 'exporting' | 'importing' | 'ok' | 'err'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const s = readCalendarSettings()
    if (typeof s.showShiftBars === 'boolean') setShowShiftBars(s.showShiftBars)
    setWeekStartsOn(s.weekStartsOn === 0 ? 0 : 1)
    const v = s.defaultCalendarView
    if (v === 'week' || v === 'day' || v === 'year' || v === 'month') setDefaultCalendarView(v)
  }, [])

  function flashSaved() {
    setMessage(t('calendar.settings.saved'))
    setStatus('ok')
    window.setTimeout(() => {
      setMessage(null)
      setStatus('idle')
    }, 2000)
  }

  function onToggleShiftBars(next: boolean) {
    setShowShiftBars(next)
    writeCalendarSettingsPatch({ showShiftBars: next })
    flashSaved()
  }

  function onWeekStartChange(next: 0 | 1) {
    setWeekStartsOn(next)
    writeCalendarSettingsPatch({ weekStartsOn: next })
    flashSaved()
  }

  function onDefaultViewChange(next: CalendarViewPreference) {
    setDefaultCalendarView(next)
    writeCalendarSettingsPatch({ defaultCalendarView: next })
    flashSaved()
  }

  async function handleExportIcs() {
    setStatus('exporting')
    setMessage(null)
    try {
      const now = Math.floor(Date.now() / 1000)
      const fromTS = now - 90 * 86400
      const toTS = now + 365 * 86400
      const res = await authedFetch(
        `/api/calendar/export/ics?fromTS=${fromTS}&toTS=${toTS}`,
        { method: 'GET' },
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || `Export failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shiftcoach-calendar-${format(new Date(), 'yyyy-MM-dd')}.ics`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setStatus('ok')
      setMessage(t('calendar.settings.downloadStarted'))
    } catch (e) {
      setStatus('err')
      setMessage(e instanceof Error ? e.message : 'Export failed')
    }
  }

  async function handleImportIcs(file: File) {
    setStatus('importing')
    setMessage(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await authedFetch('/api/calendar/import/ics', {
        method: 'POST',
        body: fd,
      })
      const j = (await res.json().catch(() => ({}))) as {
        error?: string
        imported?: number
        failed?: number
      }
      if (!res.ok) {
        throw new Error(j.error || `Import failed (${res.status})`)
      }
      setStatus('ok')
      setMessage(
        t('calendar.settings.imported', {
          imported: j.imported ?? 0,
          failedPart:
            typeof j.failed === 'number' && j.failed > 0
              ? t('calendar.settings.importFailedPart', { failed: j.failed })
              : '',
        }),
      )
    } catch (e) {
      setStatus('err')
      setMessage(e instanceof Error ? e.message : 'Import failed')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const viewOptions: { id: CalendarViewPreference; labelKey: string }[] = [
    { id: 'month', labelKey: 'calendar.settings.defaultView.month' },
    { id: 'week', labelKey: 'calendar.settings.defaultView.week' },
    { id: 'day', labelKey: 'calendar.settings.defaultView.day' },
    { id: 'year', labelKey: 'calendar.settings.defaultView.year' },
  ]

  return (
    <div className="space-y-6">
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        {t('calendar.settings.intro')}
      </p>

      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/40 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <Calendar className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('calendar.settings.defaultView.title')}
            </h3>
            <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              {t('calendar.settings.defaultView.subtitle')}
            </p>
            <div className="mt-3 space-y-2">
              {viewOptions.map((opt) => (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-0.5 hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
                >
                  <input
                    type="radio"
                    name="defaultCalendarView"
                    checked={defaultCalendarView === opt.id}
                    onChange={() => onDefaultViewChange(opt.id)}
                    className="h-4 w-4 border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-900"
                  />
                  <span className="text-sm text-slate-800 dark:text-slate-200">{t(opt.labelKey)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/40 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('calendar.settings.weekStart.title')}
            </h3>
            <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              {t('calendar.settings.weekStart.subtitle')}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="weekStartsOn"
                  checked={weekStartsOn === 1}
                  onChange={() => onWeekStartChange(1)}
                  className="h-4 w-4 border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-900"
                />
                <span className="text-sm text-slate-800 dark:text-slate-200">
                  {t('calendar.settings.weekStart.monday')}
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="weekStartsOn"
                  checked={weekStartsOn === 0}
                  onChange={() => onWeekStartChange(0)}
                  className="h-4 w-4 border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-900"
                />
                <span className="text-sm text-slate-800 dark:text-slate-200">
                  {t('calendar.settings.weekStart.sunday')}
                </span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/40 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <Layers className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('calendar.settings.shiftBars.title')}
            </h3>
            <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              {t('calendar.settings.shiftBars.subtitle')}
            </p>
            <label className="mt-3 flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={showShiftBars}
                onChange={(e) => onToggleShiftBars(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-900"
              />
              <span className="text-sm text-slate-800 dark:text-slate-200">
                {t('calendar.settings.shiftBars.checkbox')}
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/40 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t('calendar.settings.ics.title')}
        </h3>
        <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
          {t('calendar.settings.ics.subtitle')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleExportIcs()}
            disabled={status === 'exporting'}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            {status === 'exporting' ? t('calendar.settings.ics.exporting') : t('calendar.settings.ics.export')}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={status === 'importing'}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Upload className="h-3.5 w-3.5" />
            {status === 'importing' ? t('calendar.settings.ics.importing') : t('calendar.settings.ics.import')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".ics,text/calendar"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleImportIcs(f)
            }}
          />
        </div>
      </section>

      {message && (
        <div
          className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs ${
            status === 'err'
              ? 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200'
              : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-200'
          }`}
        >
          {status === 'err' ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{message}</span>
        </div>
      )}
    </div>
  )
}
