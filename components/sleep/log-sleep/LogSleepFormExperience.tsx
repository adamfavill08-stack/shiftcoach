'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, CheckCircle2, MoonStar, PlusCircle, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import type { SleepLogInput, SleepType } from '@/lib/sleep/types'
import { useTranslation } from '@/components/providers/language-provider'
import { inferShiftAwareSleepLog } from '@/lib/sleep/inferShiftAwareSleepLog'
import type { ShiftRowInput } from '@/lib/shift-context/resolveShiftContext'
import { analyzeSleepBlockRelativeToShifts } from '@/lib/sleep/shiftRelativeSleepClassification'
import { resolveLogSleepContextChip } from '@/lib/sleep/logSleepContextChip'
import { resolveLogSleepRecoveryExplainer } from '@/lib/sleep/logSleepRecoveryCopy'
import { SleepContextChip } from '@/components/sleep/log-sleep/SleepContextChip'
import { SleepBlockCard } from '@/components/sleep/log-sleep/SleepBlockCard'
import { FeelingSelector, feelingToQualityNumber, type SleepFeelingId } from '@/components/sleep/log-sleep/FeelingSelector'
import { RecoveryStatusCard } from '@/components/sleep/log-sleep/RecoveryStatusCard'
import { RecoveryPlanCard } from '@/components/sleep/log-sleep/RecoveryPlanCard'

const inputClass =
  'h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 pr-10 text-[13px] font-semibold text-[var(--text-main)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_2px_6px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-blue)_45%,transparent)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)]'

export type LogSleepFormVariant = 'page' | 'modal'

export type LogSleepFormExperienceProps = {
  variant: LogSleepFormVariant
  /** When false, effects that reset/sync the form are paused (e.g. modal closed). */
  active: boolean
  onSubmit: (data: SleepLogInput) => Promise<void>
  defaultStart?: Date | null
  defaultEnd?: Date | null
  shiftRows?: ShiftRowInput[]
  timeZone?: string | null
  targetSleepMinutes?: number | null
  /** Increment to re-seed start/end from defaults (e.g. after a successful save on the page). */
  initNonce?: number
  /** Modal: closes. Page: optional (unused if `homeHref` set). */
  onCancel?: () => void
  /** Page: back navigates here. Modal: ignored (use onCancel). */
  homeHref?: string
  /** Optional: header “trends” control (e.g. switch parent to overview tab). */
  onOpenTrends?: () => void
  /** Called after a successful save (modal uses this to close). */
  onAfterSuccessfulSave?: () => void
}

export function LogSleepFormExperience({
  variant,
  active,
  onSubmit,
  defaultStart,
  defaultEnd,
  shiftRows,
  timeZone,
  targetSleepMinutes,
  initNonce = 0,
  onCancel,
  homeHref = '/dashboard',
  onAfterSuccessfulSave,
  onOpenTrends,
}: LogSleepFormExperienceProps) {
  const { t } = useTranslation()
  const [browserTimeZone, setBrowserTimeZone] = useState('UTC')
  const [form, setForm] = useState({
    type: 'main_sleep' as SleepType,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    feeling: 'okay' as SleepFeelingId,
    notes: '',
  })

  const [saving, setSaving] = useState(false)
  const [manualTypeEdited, setManualTypeEdited] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    try {
      setBrowserTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
    } catch {
      setBrowserTimeZone('UTC')
    }
  }, [])

  const formatDateForInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  const formatTimeForInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  useEffect(() => {
    if (!active) return

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
      feeling: 'okay',
      notes: '',
    })
    setManualTypeEdited(false)
    setDetailsOpen(false)
  }, [active, defaultStart, defaultEnd, initNonce])

  const sleepLogTimeZone = timeZone?.trim() || browserTimeZone

  const previewTimes = useMemo(() => {
    if (!form.startDate || !form.startTime || !form.endDate || !form.endTime) return null
    const startAt = new Date(`${form.startDate}T${form.startTime}`)
    const endAt = new Date(`${form.endDate}T${form.endTime}`)
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      return null
    }
    return { startAt, endAt }
  }, [form.endDate, form.endTime, form.startDate, form.startTime])

  const rotaSuggestion = useMemo(() => {
    if (!previewTimes || !shiftRows?.length) return null
    return inferShiftAwareSleepLog({
      startAt: previewTimes.startAt,
      endAt: previewTimes.endAt,
      shifts: shiftRows,
      timeZone: sleepLogTimeZone,
    })
  }, [previewTimes, shiftRows, sleepLogTimeZone])

  const targetMin =
    typeof targetSleepMinutes === 'number' && Number.isFinite(targetSleepMinutes) && targetSleepMinutes > 0
      ? Math.round(targetSleepMinutes)
      : Math.round(7 * 60)

  const shiftRelative = useMemo(() => {
    if (!previewTimes || !shiftRows?.length) return null
    return analyzeSleepBlockRelativeToShifts({
      sleepStartMs: previewTimes.startAt.getTime(),
      sleepEndMs: previewTimes.endAt.getTime(),
      shifts: shiftRows,
      timeZone: sleepLogTimeZone,
      targetSleepMinutes: targetMin,
    })
  }, [previewTimes, shiftRows, sleepLogTimeZone, targetMin])

  const recoveryExplainer = useMemo(() => {
    if (!shiftRelative) return null
    return resolveLogSleepRecoveryExplainer(shiftRelative, sleepLogTimeZone)
  }, [shiftRelative, sleepLogTimeZone])

  const contextChip = useMemo(
    () =>
      previewTimes && rotaSuggestion
        ? resolveLogSleepContextChip({
            previewEnd: previewTimes.endAt,
            rotaSuggestion,
            shiftRows,
            timeZone: sleepLogTimeZone,
          })
        : null,
    [previewTimes, rotaSuggestion, shiftRows, sleepLogTimeZone],
  )

  useEffect(() => {
    if (!active || manualTypeEdited || !rotaSuggestion) return
    if (form.type === rotaSuggestion.suggestedType) return
    setForm((prev) => ({ ...prev, type: rotaSuggestion.suggestedType }))
  }, [active, form.type, manualTypeEdited, rotaSuggestion])

  const durationLine = useMemo(() => {
    if (!previewTimes) return null
    const mins = Math.round((previewTimes.endAt.getTime() - previewTimes.startAt.getTime()) / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h === 0) return t('sleepLogs.durationHM', { h: 0, m })
    if (m === 0) return t('sleepLogs.durationH', { h })
    return t('sleepLogs.durationHM', { h, m })
  }, [previewTimes, t])

  const classificationPill =
    shiftRelative != null ? (
      <span className="sleep-context-pill max-w-[95%] px-4 py-2.5 text-xs font-semibold tracking-wide sm:gap-2.5 sm:px-5">
        <MoonStar className="h-4 w-4 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
        <span className="truncate">{t(`sleepPlan.shiftRelative.class.${shiftRelative.sleepClass}`)}</span>
      </span>
    ) : null

  const handleAddNapPreset = () => {
    const now = new Date()
    const start = new Date(now.getTime() - 45 * 60_000)
    setForm((prev) => ({
      ...prev,
      startDate: formatDateForInput(start),
      startTime: formatTimeForInput(start),
      endDate: formatDateForInput(now),
      endTime: formatTimeForInput(now),
      type: 'nap',
    }))
    setManualTypeEdited(true)
  }

  const handleBack = () => {
    if (onCancel) onCancel()
  }

  const headerRow =
    variant === 'modal' ? (
      <button
        type="button"
        onClick={handleBack}
        aria-label={t('sleepLog.backAria')}
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] text-[var(--text-soft)] transition-all hover:bg-[var(--card)] hover:text-[var(--text-main)] active:scale-95"
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={2} />
      </button>
    ) : (
      <Link
        href={homeHref}
        aria-label={t('sleepLog.backAria')}
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] text-[var(--text-soft)] transition-all hover:bg-[var(--card)] hover:text-[var(--text-main)] active:scale-95"
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={2} />
      </Link>
    )

  const headerBlock = (
    <header
      className={
        variant === 'modal'
          ? 'relative z-10 shrink-0 border-b border-[var(--border-subtle)] px-5 pb-3 pt-4 sm:px-6'
          : 'relative z-10 shrink-0 border-b border-[var(--border-subtle)] px-0 pb-3 pt-0'
      }
    >
      <div className="relative flex h-11 items-center justify-center">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">{headerRow}</div>
        <h2 className="text-lg font-bold tracking-tight text-[var(--text-main)] sm:text-xl">{t('sleepLog.title')}</h2>
        {onOpenTrends ? (
          <button
            type="button"
            onClick={onOpenTrends}
            aria-label={t('sleepLog.trendsAria')}
            className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] text-[var(--text-soft)] transition hover:bg-[var(--card)] hover:text-[var(--text-main)]"
          >
            <TrendingUp className="h-5 w-5" strokeWidth={2} />
          </button>
        ) : (
          <div className="absolute right-0 top-1/2 h-10 w-10 -translate-y-1/2" aria-hidden />
        )}
      </div>
      <div className="mt-3">
        <SleepContextChip chip={contextChip} />
      </div>
    </header>
  )

  const bodyBlock = (
    <div className="space-y-5">
      <SleepBlockCard
        startDate={form.startDate}
        startTime={form.startTime}
        endDate={form.endDate}
        endTime={form.endTime}
        onChangeStartDate={(v) => setForm((p) => ({ ...p, startDate: v }))}
        onChangeStartTime={(v) => setForm((p) => ({ ...p, startTime: v }))}
        onChangeEndDate={(v) => setForm((p) => ({ ...p, endDate: v }))}
        onChangeEndTime={(v) => setForm((p) => ({ ...p, endTime: v }))}
        durationLine={durationLine}
        classificationSlot={classificationPill}
        rotaWarning={rotaSuggestion?.warning ?? null}
      />

      <FeelingSelector value={form.feeling} onChange={(feeling) => setForm((p) => ({ ...p, feeling }))} />

      {shiftRelative && recoveryExplainer ? (
        <RecoveryStatusCard
          recoveryState={shiftRelative.recoveryState}
          explainerKey={recoveryExplainer.key}
          explainerParams={recoveryExplainer.params}
        />
      ) : null}

      {shiftRelative ? <RecoveryPlanCard nextStepMessage={shiftRelative.nextStepMessage} /> : null}

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] shadow-[var(--shadow-soft)]">
        <button
          type="button"
          id="sleep-log-details-toggle"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t('sleepLog.section.details')}
          </span>
          {detailsOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-[var(--text-soft)]" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-soft)]" aria-hidden />
          )}
        </button>
        {detailsOpen ? (
          <div className="space-y-4 border-t border-[var(--border-subtle)] px-4 pb-4 pt-3">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {t('sleepForm.typeLabel')}
              </label>
              <div className="relative group">
                <select
                  value={form.type}
                  onChange={(e) => {
                    setManualTypeEdited(true)
                    setForm({ ...form, type: e.target.value as SleepType })
                  }}
                  className={`${inputClass} appearance-none cursor-pointer pr-10`}
                >
                  <option value="main_sleep">{t('sleepType.main_sleep')}</option>
                  <option value="post_shift_sleep">{t('sleepType.post_shift_sleep')}</option>
                  <option value="recovery_sleep">{t('sleepType.recovery_sleep')}</option>
                  <option value="nap">{t('sleepType.nap')}</option>
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
                  strokeWidth={2.5}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {t('sleepLog.notesLabel')}
              </label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 py-3 text-[13px] font-medium text-[var(--text-main)] shadow-[0_1px_3px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-blue)_45%,transparent)]"
                placeholder={t('sleepLog.notesPlaceholder')}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )

  const footerBlock = (
    <footer
      className={
        variant === 'modal'
          ? 'relative z-10 shrink-0 border-t border-[var(--border-subtle)] bg-[var(--card)] px-5 pt-4 pb-[max(1.25rem,calc(0.75rem+env(safe-area-inset-bottom,0px)))] sm:px-6'
          : 'relative z-10 mt-2 shrink-0 border-t border-[var(--border-subtle)] bg-transparent pt-4 pb-[max(1rem,calc(0.5rem+env(safe-area-inset-bottom,0px)))]'
      }
    >
      <div className="flex flex-col gap-3">
        <button
          type="button"
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

              const q = feelingToQualityNumber(form.feeling)

              await onSubmit({
                type: form.type,
                startAt: startAt.toISOString(),
                endAt: endAt.toISOString(),
                quality: q,
                notes: form.notes.trim() || undefined,
                source: 'manual',
                timezone: sleepLogTimeZone,
              })
              onAfterSuccessfulSave?.()
            } catch (error) {
              alert(error instanceof Error ? error.message : t('sleepLog.errSave'))
            } finally {
              setSaving(false)
            }
          }}
          className="flex min-h-[3.25rem] w-full items-center justify-center gap-2.5 rounded-2xl px-4 py-3 text-[15px] font-semibold text-white shadow-[0_6px_20px_color-mix(in_srgb,var(--accent-blue)_35%,transparent)] transition-all hover:opacity-[0.95] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'var(--accent-blue)' }}
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20">
            <CheckCircle2 className="h-5 w-5 text-white" strokeWidth={2.2} aria-hidden />
          </span>
          {saving ? t('sleepForm.saving') : t('sleepLog.saveSleep')}
        </button>

        <button
          type="button"
          onClick={handleAddNapPreset}
          className="flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-[var(--accent-blue)] transition hover:underline"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full border border-[color-mix(in_srgb,var(--accent-blue)_35%,var(--border-subtle))] bg-[var(--card-subtle)]">
            <PlusCircle className="h-4 w-4" strokeWidth={2} style={{ color: 'var(--accent-blue)' }} aria-hidden />
          </span>
          {t('sleepLog.addNap')}
        </button>

        {variant === 'modal' ? (
          <button
            type="button"
            onClick={handleBack}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] py-2.5 text-[13px] font-semibold text-[var(--text-soft)] transition-all hover:bg-[var(--card)]"
          >
            {t('sleepForm.cancel')}
          </button>
        ) : null}
      </div>
    </footer>
  )

  if (variant === 'modal') {
    return (
      <div className="relative flex max-h-[min(92dvh,92vh)] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-[var(--card)] shadow-[var(--shadow-soft)] duration-300 animate-in slide-in-from-bottom-4 sm:max-h-[92vh] sm:rounded-[28px] sm:slide-in-from-bottom-0 sm:zoom-in-95">
        <div className="pointer-events-none absolute inset-0 rounded-t-[28px] ring-1 ring-[var(--border-subtle)] sm:rounded-[28px]" />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          {headerBlock}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{bodyBlock}</div>
          {footerBlock}
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col">
      {headerBlock}
      <div className="py-5">{bodyBlock}</div>
      {footerBlock}
    </div>
  )
}
