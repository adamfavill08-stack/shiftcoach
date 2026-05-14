'use client'

import { useMemo, type ReactNode } from 'react'
import { BedDouble, ArrowRight, ArrowDown, Link2, Calendar, Clock } from 'lucide-react'
import { useLanguage, useTranslation } from '@/components/providers/language-provider'

const fieldShell =
  'rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:rounded-[12px] sm:px-3.5 sm:py-2 dark:shadow-[0_1px_2px_rgba(0,0,0,0.3)]'

const fieldFocusWithin =
  'focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--accent-blue)_40%,transparent)] focus-within:ring-offset-0'

const nativeFieldPickerOverlayClass =
  'absolute inset-0 z-[1] m-0 min-h-[2.25rem] w-full cursor-pointer border-0 p-0 opacity-0 disabled:cursor-not-allowed'

function parseYmdLocal(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function formatLongDate(ymd: string, locale: string): string {
  const d = parseYmdLocal(ymd)
  if (!d) return ''
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
  } catch {
    return ymd
  }
}

function intlLocaleFor(language: string): string {
  if (language === 'en') return 'en-GB'
  if (language === 'pt-BR') return 'pt-BR'
  return language
}

type Props = {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  onChangeStartDate: (v: string) => void
  onChangeStartTime: (v: string) => void
  onChangeEndDate: (v: string) => void
  onChangeEndTime: (v: string) => void
  durationLine: string | null
  classificationSlot: ReactNode
  rotaWarning: 'overlaps_shift' | 'off_day_after_night' | null
}

export function SleepBlockCard({
  startDate,
  startTime,
  endDate,
  endTime,
  onChangeStartDate,
  onChangeStartTime,
  onChangeEndDate,
  onChangeEndTime,
  durationLine,
  classificationSlot,
  rotaWarning,
}: Props) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const intlLocale = intlLocaleFor(language)

  const startTimeDisabled = !startDate
  const endTimeDisabled = !endDate

  const startDateDisplay = useMemo(() => formatLongDate(startDate, intlLocale), [startDate, intlLocale])
  const endDateDisplay = useMemo(() => formatLongDate(endDate, intlLocale), [endDate, intlLocale])

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="flex items-center gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[color-mix(in_srgb,var(--accent-indigo)_38%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent-indigo)_14%,var(--card-subtle))] text-[var(--text-main)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent-blue)_18%,transparent),0_10px_28px_color-mix(in_srgb,var(--accent-indigo)_22%,transparent)] dark:shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent-blue)_22%,transparent),0_10px_32px_color-mix(in_srgb,var(--accent-indigo)_28%,transparent)]"
          aria-hidden
        >
          <BedDouble className="h-[1.05rem] w-[1.05rem] text-[var(--text-main)]" strokeWidth={2.25} />
        </span>
        <h3 className="text-base font-bold tracking-tight text-[var(--text-main)]">{t('sleepLog.section.sleepBlock')}</h3>
      </div>

      <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:gap-2 md:gap-3">
        <div className="flex min-w-0 w-full flex-1 flex-col gap-2 sm:min-w-0">
          <p className="text-sm font-bold tracking-tight text-[var(--text-main)]">{t('sleepLog.timeBlock.startLabel')}</p>

          <div className={`${fieldShell} ${fieldFocusWithin}`}>
            <p className="text-[10px] font-medium leading-none tracking-tight text-[var(--text-muted)]">
              {t('sleepLog.timeBlock.dateFieldLabel')}
            </p>
            <div className="relative mt-1">
              <div className="pointer-events-none relative z-0 flex min-h-[2.25rem] items-center gap-2 py-0.5">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" strokeWidth={1.5} aria-hidden />
                <span
                  className={`min-w-0 break-words text-[11px] font-normal leading-snug tracking-tight sm:text-xs ${
                    startDateDisplay ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {startDateDisplay || t('sleepLog.timeBlock.datePlaceholder')}
                </span>
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onChangeStartDate(e.target.value)}
                aria-label={t('sleepLog.timeBlock.ariaChangeStartDate')}
                className={nativeFieldPickerOverlayClass}
              />
            </div>
          </div>

          <div className={`${fieldShell} ${fieldFocusWithin} ${startTimeDisabled ? 'opacity-90' : ''}`}>
            <p className="text-[10px] font-medium leading-none tracking-tight text-[var(--text-muted)]">
              {t('sleepLog.timeBlock.timeFieldLabel')}
            </p>
            <div className="relative mt-1">
              <div
                className={`pointer-events-none relative z-0 flex min-h-[2.25rem] items-center gap-2 py-0.5 ${startTimeDisabled ? 'opacity-40' : ''}`}
              >
                <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" strokeWidth={1.5} aria-hidden />
                <span className="text-[1.125rem] font-semibold tabular-nums leading-none tracking-tight text-[var(--text-main)] sm:text-xl">
                  {startTime || '—'}
                </span>
              </div>
              <input
                type="time"
                value={startTime}
                disabled={startTimeDisabled}
                title={startTimeDisabled ? t('sleepLog.timeBlock.hintStartDateFirst') : undefined}
                onChange={(e) => onChangeStartTime(e.target.value)}
                aria-label={t('sleepLog.timeBlock.ariaChangeStartTime')}
                className={nativeFieldPickerOverlayClass}
              />
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-center py-0.5 text-[var(--text-muted)] sm:w-8 sm:py-0 sm:px-0.5"
          aria-hidden
        >
          <ArrowDown className="h-4 w-4 opacity-80 sm:hidden" strokeWidth={1.75} />
          <ArrowRight className="hidden h-4 w-4 opacity-80 sm:block sm:h-[1.125rem] sm:w-[1.125rem]" strokeWidth={1.5} />
        </div>

        <div className="flex min-w-0 w-full flex-1 flex-col gap-2 sm:min-w-0">
          <p className="text-sm font-bold tracking-tight text-[var(--text-main)]">{t('sleepLog.timeBlock.endLabel')}</p>

          <div className={`${fieldShell} ${fieldFocusWithin}`}>
            <p className="text-[10px] font-medium leading-none tracking-tight text-[var(--text-muted)]">
              {t('sleepLog.timeBlock.dateFieldLabel')}
            </p>
            <div className="relative mt-1">
              <div className="pointer-events-none relative z-0 flex min-h-[2.25rem] items-center gap-2 py-0.5">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" strokeWidth={1.5} aria-hidden />
                <span
                  className={`min-w-0 break-words text-[11px] font-normal leading-snug tracking-tight sm:text-xs ${
                    endDateDisplay ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {endDateDisplay || t('sleepLog.timeBlock.datePlaceholder')}
                </span>
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onChangeEndDate(e.target.value)}
                aria-label={t('sleepLog.timeBlock.ariaChangeEndDate')}
                className={nativeFieldPickerOverlayClass}
              />
            </div>
          </div>

          <div className={`${fieldShell} ${fieldFocusWithin} ${endTimeDisabled ? 'opacity-90' : ''}`}>
            <p className="text-[10px] font-medium leading-none tracking-tight text-[var(--text-muted)]">
              {t('sleepLog.timeBlock.timeFieldLabel')}
            </p>
            <div className="relative mt-1">
              <div
                className={`pointer-events-none relative z-0 flex min-h-[2.25rem] items-center gap-2 py-0.5 ${endTimeDisabled ? 'opacity-40' : ''}`}
              >
                <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" strokeWidth={1.5} aria-hidden />
                <span className="text-[1.125rem] font-semibold tabular-nums leading-none tracking-tight text-[var(--text-main)] sm:text-xl">
                  {endTime || '—'}
                </span>
              </div>
              <input
                type="time"
                value={endTime}
                disabled={endTimeDisabled}
                title={endTimeDisabled ? t('sleepLog.timeBlock.hintEndDateFirst') : undefined}
                onChange={(e) => onChangeEndTime(e.target.value)}
                aria-label={t('sleepLog.timeBlock.ariaChangeEndTime')}
                className={nativeFieldPickerOverlayClass}
              />
            </div>
          </div>
        </div>
      </div>

      {durationLine ? (
        <div className="mt-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t('sleepLog.durationAutoCalculated')}
          </p>
          <p className="mt-2 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-indigo)] bg-clip-text text-[2.15rem] font-bold tabular-nums leading-none tracking-tight text-transparent sm:text-4xl">
            {durationLine}
          </p>
        </div>
      ) : null}

      {classificationSlot ? <div className="mt-6 flex flex-col items-center gap-2">{classificationSlot}</div> : null}

      {classificationSlot ? (
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-[color-mix(in_srgb,var(--accent-indigo)_72%,var(--text-muted))]">
          <Link2 className="h-3.5 w-3.5 shrink-0 text-[color-mix(in_srgb,var(--accent-indigo)_80%,var(--text-muted))]" strokeWidth={2} aria-hidden />
          {t('sleepLog.rotaAutoLink')}
        </p>
      ) : null}

      {rotaWarning ? (
        <p
          className={`mt-4 rounded-xl border px-3 py-2.5 text-xs font-medium leading-relaxed ${
            rotaWarning === 'overlaps_shift'
              ? 'border-amber-200/80 bg-amber-500/10 text-amber-950 dark:border-amber-900/40 dark:bg-amber-500/15 dark:text-amber-50'
              : 'border-[var(--border-subtle)] bg-[var(--card-subtle)] text-[var(--text-soft)]'
          }`}
          role="status"
        >
          {rotaWarning === 'overlaps_shift'
            ? t('sleepPlan.feedback.overlap_shift')
            : t('sleepLog.warning.offDayAfterNight')}
        </p>
      ) : null}
    </section>
  )
}
