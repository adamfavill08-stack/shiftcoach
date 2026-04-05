'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useLanguage, useTranslation } from '@/components/providers/language-provider'
import { intlLocaleForApp } from '@/lib/i18n/supportedLocales'
import { formatSleepChartAxisLabel, type SleepBarPoint } from '@/lib/sleep/utils'
import type { SleepType } from '@/lib/sleep/types'

type SourceSummary = 'none' | 'manual' | 'wearable' | 'mixed'

type ShiftSleepOverviewCardProps = {
  totalMinutes: number
  targetMinutes: number
  primaryMinutes: number
  napMinutes: number
  sourceSummary: SourceSummary
  dominantType: SleepType | null
  shiftLabel?: string
  hasWearableConnection?: boolean
  lastSyncAt?: number | null
  isWearableSyncing?: boolean
  sleepDebtMinutes?: number | null
  circadianAlignment?: 'good' | 'ok' | 'poor' | null
  smartInsight?: string | null
  actionError?: string | null
  onLogSleep: () => void
  onSyncWearable?: () => Promise<void> | void
  editLogsHref: string
  sevenDayBars: SleepBarPoint[]
  highlightDateKey?: string | null
  /** IANA zone used by /api/sleep/7days; axis labels must match bucket math. */
  chartTimeZone?: string | null
}

const WEARABLE_STALE_MS = 4 * 60 * 60 * 1000 // 4h
const HIGH_DEBT_MINUTES = 120

type ProgressState = 'empty' | 'neutral' | 'behind' | 'progress' | 'on_track' | 'recovery'

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

function formatSleepDuration(t: TranslateFn, totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(safeMinutes / 60)
  const m = safeMinutes % 60
  return t('sleepCard.durationHM', { h, m })
}

/** Decimal hours for chart labels (locale-aware 7 vs 7,5). */
function formatSleepChartHoursDecimal(intlLocale: string, totalMinutes: number) {
  const n = Math.max(0, totalMinutes) / 60
  return new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(n)
}

function getProgressState(totalMinutes: number, targetMinutes: number): ProgressState {
  if (totalMinutes <= 0) return 'empty'
  if (targetMinutes <= 0) return 'neutral'
  if (totalMinutes < targetMinutes * 0.6) return 'behind'
  if (totalMinutes < targetMinutes) return 'progress'
  if (totalMinutes <= targetMinutes * 1.15) return 'on_track'
  return 'recovery'
}

function getHeadlineKey(totalMinutes: number, targetMinutes: number, shiftLabel?: string): string {
  const state = getProgressState(totalMinutes, targetMinutes)
  const shift = (shiftLabel || '').toUpperCase()

  if (shift === 'NIGHT') {
    if (state === 'empty') return 'sleepCard.hl.logPostShift'
    if (state === 'behind') return 'sleepCard.hl.postRecovery'
  }

  if (shift === 'OFF') {
    if (state === 'behind') return 'sleepCard.hl.recoveryBelow'
  }

  switch (state) {
    case 'empty':
      return 'sleepCard.hl.logYourSleep'
    case 'behind':
      return 'sleepCard.hl.belowTarget'
    case 'progress':
      return 'sleepCard.hl.progressing'
    case 'on_track':
      return 'sleepCard.hl.onTrack'
    case 'recovery':
      return 'sleepCard.hl.recoveryCovered'
    default:
      return 'sleepCard.hl.overview'
  }
}

function getSubtextParts(
  t: TranslateFn,
  totalMinutes: number,
  primaryMinutes: number,
  napMinutes: number,
  dominantType: SleepType | null,
  sleepDebtMinutes: number | null,
  shiftLabel?: string,
): { key: string; params?: Record<string, string | number> } {
  const shift = (shiftLabel || '').toUpperCase()
  const primary = formatSleepDuration(t, primaryMinutes)
  const naps = formatSleepDuration(t, napMinutes)
  if (totalMinutes <= 0) {
    return { key: 'sleepCard.sub.noSleep' }
  }
  if (shift === 'NIGHT' && totalMinutes > 0) {
    return { key: 'sleepCard.sub.nightLogged', params: { primary, naps } }
  }
  if (sleepDebtMinutes != null && sleepDebtMinutes >= HIGH_DEBT_MINUTES) {
    return { key: 'sleepCard.sub.debt', params: { primary, naps } }
  }
  if (primaryMinutes <= 0 && napMinutes > 0) {
    return { key: 'sleepCard.sub.onlyNaps', params: { naps } }
  }
  if (dominantType === 'post_shift_sleep') {
    return { key: 'sleepCard.sub.postShiftDom', params: { primary, naps } }
  }
  if (dominantType === 'recovery_sleep') {
    return { key: 'sleepCard.sub.recoveryDom', params: { primary, naps } }
  }
  if (dominantType === 'main_sleep') {
    return { key: 'sleepCard.sub.mainDom', params: { primary, naps } }
  }
  return { key: 'sleepCard.sub.default', params: { primary, naps } }
}

function getSourceLabelKey(sourceSummary: SourceSummary, totalMinutes: number): string {
  if (totalMinutes <= 0 && sourceSummary === 'none') return 'sleepCard.sourceNoneLogged'
  if (sourceSummary === 'none') return 'sleepCard.sourceNoData'
  if (sourceSummary === 'manual') return 'sleepCard.sourceManual'
  if (sourceSummary === 'wearable') return 'sleepCard.sourceWearable'
  return 'sleepCard.sourceMixed'
}

function formatRelativeSyncLabel(
  t: TranslateFn,
  lastSyncAt: number | null | undefined,
  hasWearableConnection: boolean,
) {
  if (!hasWearableConnection) return t('sleepCard.syncManualOnly')
  if (!lastSyncAt) return t('sleepCard.syncAwaiting')
  const diffMs = Date.now() - lastSyncAt
  const diffMin = Math.max(0, Math.round(diffMs / 60000))
  if (diffMin < 2) return t('sleepCard.syncJustNow')
  if (diffMin < 60) return t('sleepCard.syncMinAgo', { m: diffMin })
  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return t('sleepCard.syncHoursAgo', { h: diffHours })
  const diffDays = Math.round(diffHours / 24)
  return t('sleepCard.syncDaysAgo', { d: diffDays })
}

function compactInsight(text: string | null | undefined): string | null {
  if (!text) return null
  const firstSentence = text.match(/^[^.!?]+[.!?]?/)?.[0]?.trim() || text.trim()
  if (firstSentence.length <= 120) return firstSentence
  return `${firstSentence.slice(0, 117).trimEnd()}...`
}

function getChipTone(totalMinutes: number, targetMinutes: number) {
  const state = getProgressState(totalMinutes, targetMinutes)
  switch (state) {
    case 'behind':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'progress':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'on_track':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'recovery':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200'
  }
}

function barClasses(minutes: number, targetMinutes: number) {
  if (minutes <= 0) {
    return 'bg-[var(--card-subtle)] border border-[var(--border-subtle)]'
  }
  if (targetMinutes <= 0) return 'bg-sky-500/85 dark:bg-sky-400/80'
  const r = minutes / targetMinutes
  if (r < 0.6) return 'bg-amber-500/90 dark:bg-amber-500/75'
  if (r < 1) return 'bg-sky-500/90 dark:bg-sky-400/80'
  if (r <= 1.15) return 'bg-emerald-500/90 dark:bg-emerald-500/75'
  return 'bg-indigo-500/85 dark:bg-indigo-400/75'
}

const CHART_H = 128

export function ShiftSleepOverviewCard({
  totalMinutes,
  targetMinutes,
  primaryMinutes,
  napMinutes,
  sourceSummary,
  dominantType,
  shiftLabel,
  hasWearableConnection = false,
  lastSyncAt = null,
  isWearableSyncing = false,
  sleepDebtMinutes = null,
  circadianAlignment = null,
  smartInsight = null,
  actionError = null,
  onLogSleep,
  onSyncWearable,
  editLogsHref,
  sevenDayBars,
  highlightDateKey = null,
  chartTimeZone = null,
}: ShiftSleepOverviewCardProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const intlLocale = useMemo(() => intlLocaleForApp(language), [language])
  const headline = t(getHeadlineKey(totalMinutes, targetMinutes, shiftLabel))
  const subParts = getSubtextParts(
    t,
    totalMinutes,
    primaryMinutes,
    napMinutes,
    dominantType,
    sleepDebtMinutes,
    shiftLabel,
  )
  const subtext = t(subParts.key, subParts.params)
  const chipTone = getChipTone(totalMinutes, targetMinutes)
  const syncAgeMs = lastSyncAt ? Date.now() - lastSyncAt : Number.POSITIVE_INFINITY
  const wearableStale = hasWearableConnection && syncAgeMs > WEARABLE_STALE_MS
  const progressState = getProgressState(totalMinutes, targetMinutes)
  const conciseInsight = compactInsight(smartInsight)
  const priorityBlock = actionError
    ? { tone: 'error' as const, text: actionError }
    : wearableStale
    ? { tone: 'warn' as const, text: t('sleepCard.warnStale') }
    : conciseInsight
    ? { tone: 'info' as const, text: conciseInsight }
    : null

  const primaryAction = wearableStale && onSyncWearable
    ? {
        label: isWearableSyncing ? t('sleepCard.btnSyncing') : t('sleepCard.btnSyncNow'),
        onClick: onSyncWearable,
        disabled: isWearableSyncing,
      }
    : {
        label:
          progressState === 'empty'
            ? t('sleepCard.btnLogSleep')
            : progressState === 'behind' || progressState === 'progress'
              ? t('sleepCard.btnAddSleep')
              : t('sleepCard.btnEditLogs'),
        onClick: onLogSleep,
        disabled: false,
      }

  const secondaryAction = wearableStale
    ? { label: t('sleepCard.btnLogManually'), href: null as string | null, onClick: onLogSleep }
    : {
        label: totalMinutes > 0 ? t('sleepCard.btnEditToday') : t('sleepCard.btnEditLogs'),
        href: editLogsHref,
        onClick: null as (() => void) | null,
      }

  const maxBarMinutes = Math.max(
    targetMinutes,
    ...sevenDayBars.map((b) => b.totalMinutes),
    60,
  )
  const chartSummary = useMemo(
    () =>
      sevenDayBars
        .map((b) =>
          t('sleepCard.chartSummarySegment', {
            date: b.dateKey,
            hours: t('sleepCard.chartHoursLabel', {
              n: formatSleepChartHoursDecimal(intlLocale, b.totalMinutes),
            }),
          }),
        )
        .join('; '),
    [sevenDayBars, t, intlLocale],
  )

  return (
    <section className="relative overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-5">
      <div className="relative z-10 flex flex-col items-center text-center gap-3.5">
        <div className="w-full space-y-2 text-left">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t('sleepCard.last7')}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {t('sleepCard.chartSub', {
                target: formatSleepChartHoursDecimal(intlLocale, targetMinutes),
              })}
            </p>
          </div>
          <div
            className="relative flex h-[136px] w-full items-end gap-1 sm:gap-1.5"
            role="img"
            aria-label={t('sleepCard.ariaChart', { summary: chartSummary })}
          >
            {sevenDayBars.map((day) => {
              const hPx =
                day.totalMinutes <= 0
                  ? 3
                  : Math.max(8, Math.round((day.totalMinutes / maxBarMinutes) * CHART_H))
              const isHi = highlightDateKey != null && day.dateKey === highlightDateKey
              const label =
                chartTimeZone && chartTimeZone.trim()
                  ? formatSleepChartAxisLabel(day.dateKey, chartTimeZone)
                  : new Date(`${day.dateKey}T12:00:00`).toLocaleDateString(intlLocale, {
                      weekday: 'short',
                      month: 'numeric',
                      day: 'numeric',
                    })
              return (
                <div
                  key={day.dateKey}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                >
                  <div
                    className={`w-full max-w-[36px] rounded-t-md transition-[height] duration-300 ${barClasses(day.totalMinutes, targetMinutes)} ${
                      isHi
                        ? 'ring-2 ring-sky-500/80 ring-offset-2 ring-offset-[var(--card)] dark:ring-sky-400/70'
                        : ''
                    }`}
                    style={{ height: hPx }}
                    title={t('sleepCard.barTotalTitle', {
                      date: day.dateKey,
                      h: formatSleepChartHoursDecimal(intlLocale, day.totalMinutes),
                    })}
                  />
                  <span className="w-full truncate text-center text-[10px] font-medium text-[var(--text-muted)]">
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
            <span>
              {t('sleepCard.selectedDay')}{' '}
              <span className="font-semibold text-[var(--text-main)]">
                {formatSleepDuration(t, totalMinutes)}
              </span>
              {targetMinutes > 0 ? (
                <span className="text-[var(--text-soft)]">
                  {' '}
                  {t('sleepCard.pctOfTarget', {
                    pct: Math.min(999, Math.round((totalMinutes / targetMinutes) * 100)),
                  })}
                </span>
              ) : null}
            </span>
            <span>{t(getSourceLabelKey(sourceSummary, totalMinutes))}</span>
          </div>
        </div>

        <div className="space-y-2.5 max-w-sm">
          {progressState !== 'empty' && (
            <div className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-[11px] font-semibold ${chipTone}`}>
              {headline}
            </div>
          )}
          <p className="text-sm leading-relaxed text-[var(--text-soft)]">{subtext}</p>
        </div>

        {priorityBlock && (
          <div
            className={
              priorityBlock.tone === 'error'
                ? 'w-full rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 text-left'
                : priorityBlock.tone === 'warn'
                ? 'w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 text-left'
                : 'w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] p-3 text-left text-xs leading-relaxed text-[var(--text-soft)]'
            }
          >
            {priorityBlock.text}
          </div>
        )}

        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className="flex-1 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-3 text-sm font-semibold text-white hover:from-slate-800 hover:to-slate-700 disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-[0.99]"
          >
            {primaryAction.label}
          </button>
          {secondaryAction.href ? (
            <Link
              href={secondaryAction.href}
              className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-4 py-3 text-center text-sm font-semibold text-[var(--text-soft)] transition hover:bg-[var(--card-subtle)] active:scale-[0.99]"
            >
              {secondaryAction.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={secondaryAction.onClick ?? undefined}
              disabled={!secondaryAction.onClick}
              className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-4 py-3 text-center text-sm font-semibold text-[var(--text-soft)] transition hover:bg-[var(--card-subtle)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>

        <div className="grid w-full grid-cols-2 gap-2 pt-0.5">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-2.5 text-left">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t('sleepCard.primarySleep')}
            </div>
            <div className="text-[13px] font-semibold text-[var(--text-main)]">
              {formatSleepDuration(t, primaryMinutes)}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-2.5 text-left">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t('sleepCard.naps')}
            </div>
            <div className="text-[13px] font-semibold text-[var(--text-main)]">
              {formatSleepDuration(t, napMinutes)}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-2.5 text-left">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t('sleepCard.primaryType')}
            </div>
            <div className="text-[13px] font-semibold text-[var(--text-main)]">
              {dominantType ? t(`sleepType.${dominantType}`) : t('sleepCard.typeNone')}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-2.5 text-left">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t('sleepCard.lastSync')}
            </div>
            <div className="text-[13px] font-semibold text-[var(--text-main)]">
              {formatRelativeSyncLabel(t, lastSyncAt, hasWearableConnection)}
            </div>
          </div>
          <div className="col-span-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-2.5 text-left">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t('sleepCard.recoveryNeed')}
            </div>
            <div className="text-sm font-semibold text-[var(--text-main)]">
              {sleepDebtMinutes == null
                ? t('sleepCard.recoveryLoading')
                : sleepDebtMinutes > 0
                  ? t('sleepCard.recoveryNeeded', { time: formatSleepDuration(t, sleepDebtMinutes) })
                  : t('sleepCard.recoveryCoveredLabel')}
            </div>
            <div className="mt-1 text-[10px] text-[var(--text-muted)]">
              {t('sleepCard.timingLabel')}{' '}
              {circadianAlignment == null
                ? t('sleepCard.timingNone')
                : circadianAlignment === 'good'
                  ? t('sleepCard.timingGood')
                  : circadianAlignment === 'ok'
                    ? t('sleepCard.timingOk')
                    : t('sleepCard.timingPoor')}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
