'use client'

import Link from 'next/link'
import { formatSleepChartAxisLabel, getSleepTypeLabel, type SleepBarPoint } from '@/lib/sleep/utils'
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

function formatHoursMinutes(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(safeMinutes / 60)
  const m = safeMinutes % 60
  return `${h}h ${m}m`
}

function getProgressState(totalMinutes: number, targetMinutes: number): ProgressState {
  if (totalMinutes <= 0) return 'empty'
  if (targetMinutes <= 0) return 'neutral'
  if (totalMinutes < targetMinutes * 0.6) return 'behind'
  if (totalMinutes < targetMinutes) return 'progress'
  if (totalMinutes <= targetMinutes * 1.15) return 'on_track'
  return 'recovery'
}

function getHeadline(totalMinutes: number, targetMinutes: number, shiftLabel?: string) {
  const state = getProgressState(totalMinutes, targetMinutes)
  const shift = (shiftLabel || '').toUpperCase()

  if (shift === 'NIGHT') {
    if (state === 'empty') return 'Log post-shift sleep'
    if (state === 'behind') return 'Post-shift recovery needed'
  }

  if (shift === 'OFF') {
    if (state === 'behind') return 'Recovery day - below target'
  }

  switch (state) {
    case 'empty':
      return 'Log your sleep'
    case 'behind':
      return 'Below target for today'
    case 'progress':
      return 'Progressing toward target'
    case 'on_track':
      return 'On track for today'
    case 'recovery':
      return 'Recovery needs covered'
    default:
      return 'Sleep overview'
  }
}

function getSubtext(
  totalMinutes: number,
  primaryMinutes: number,
  napMinutes: number,
  dominantType: SleepType | null,
  sleepDebtMinutes: number | null,
  shiftLabel?: string,
) {
  const shift = (shiftLabel || '').toUpperCase()
  if (totalMinutes <= 0) {
    return 'No sleep logged yet for this day. Log main sleep or naps to keep your body clock accurate.'
  }
  if (shift === 'NIGHT' && totalMinutes > 0) {
    return `Post-shift sleep logged. You've recorded ${formatHoursMinutes(primaryMinutes)} primary sleep and ${formatHoursMinutes(napMinutes)} naps.`
  }
  if (sleepDebtMinutes != null && sleepDebtMinutes >= HIGH_DEBT_MINUTES) {
    return `You've logged ${formatHoursMinutes(primaryMinutes)} of primary sleep and ${formatHoursMinutes(napMinutes)} of naps. Recovery sleep is recommended to close your debt.`
  }
  if (primaryMinutes <= 0 && napMinutes > 0) {
    return `Only naps are logged so far. You've logged ${formatHoursMinutes(napMinutes)} of naps today.`
  }
  if (dominantType === 'post_shift_sleep') {
    return `Post-shift sleep is the main contributor today. You've logged ${formatHoursMinutes(primaryMinutes)} of primary sleep and ${formatHoursMinutes(napMinutes)} of naps.`
  }
  if (dominantType === 'recovery_sleep') {
    return `Recovery sleep is leading today. You've logged ${formatHoursMinutes(primaryMinutes)} of primary sleep and ${formatHoursMinutes(napMinutes)} of naps.`
  }
  if (dominantType === 'main_sleep') {
    return `Primary sleep is logged. You've logged ${formatHoursMinutes(primaryMinutes)} of primary sleep and ${formatHoursMinutes(napMinutes)} of naps today.`
  }
  return `You've logged ${formatHoursMinutes(primaryMinutes)} of primary sleep and ${formatHoursMinutes(napMinutes)} of naps today.`
}

function getSourceLabel(sourceSummary: SourceSummary, totalMinutes: number) {
  if (totalMinutes <= 0 && sourceSummary === 'none') return 'No sleep logged yet'
  if (sourceSummary === 'none') return 'No source data'
  if (sourceSummary === 'manual') return 'Manual data'
  if (sourceSummary === 'wearable') return 'Wearable data'
  return 'Mixed data'
}

function formatRelativeSyncLabel(lastSyncAt: number | null | undefined, hasWearableConnection: boolean) {
  if (!hasWearableConnection) return 'Manual only'
  if (!lastSyncAt) return 'Awaiting first sync'
  const diffMs = Date.now() - lastSyncAt
  const diffMin = Math.max(0, Math.round(diffMs / 60000))
  if (diffMin < 2) return 'Last sync just now'
  if (diffMin < 60) return `Last sync ${diffMin}m ago`
  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return `Last sync ${diffHours}h ago`
  const diffDays = Math.round(diffHours / 24)
  return `Last sync ${diffDays}d ago`
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
  const headline = getHeadline(totalMinutes, targetMinutes, shiftLabel)
  const subtext = getSubtext(totalMinutes, primaryMinutes, napMinutes, dominantType, sleepDebtMinutes, shiftLabel)
  const chipTone = getChipTone(totalMinutes, targetMinutes)
  const syncAgeMs = lastSyncAt ? Date.now() - lastSyncAt : Number.POSITIVE_INFINITY
  const wearableStale = hasWearableConnection && syncAgeMs > WEARABLE_STALE_MS
  const progressState = getProgressState(totalMinutes, targetMinutes)
  const conciseInsight = compactInsight(smartInsight)
  const priorityBlock = actionError
    ? { tone: 'error' as const, text: actionError }
    : wearableStale
    ? { tone: 'warn' as const, text: "Wearable sync delayed. Sync now to keep today's totals accurate." }
    : conciseInsight
    ? { tone: 'info' as const, text: conciseInsight }
    : null

  const primaryAction = wearableStale && onSyncWearable
    ? { label: isWearableSyncing ? 'Syncing…' : 'Sync now', onClick: onSyncWearable, disabled: isWearableSyncing }
    : {
        label:
          progressState === 'empty'
            ? 'Log sleep'
            : progressState === 'behind' || progressState === 'progress'
            ? 'Add sleep'
            : 'Edit logs',
        onClick: onLogSleep,
        disabled: false,
      }

  const secondaryAction = wearableStale
    ? { label: 'Log manually', href: null as string | null, onClick: onLogSleep }
    : { label: totalMinutes > 0 ? 'Edit today' : 'Edit logs', href: editLogsHref, onClick: null as (() => void) | null }

  const maxBarMinutes = Math.max(
    targetMinutes,
    ...sevenDayBars.map((b) => b.totalMinutes),
    60,
  )
  const chartSummary = sevenDayBars
    .map((b) => `${b.dateKey}: ${(b.totalMinutes / 60).toFixed(1)}h`)
    .join('; ')

  return (
    <section className="relative overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-5">
      <div className="relative z-10 flex flex-col items-center text-center gap-3.5">
        <div className="w-full space-y-2 text-left">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Last 7 days
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Last 7 local days ending today · {(targetMinutes / 60).toFixed(1)}h target
            </p>
          </div>
          <div
            className="relative flex h-[136px] w-full items-end gap-1 sm:gap-1.5"
            role="img"
            aria-label={`Sleep hours last seven local days. ${chartSummary}`}
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
                  : new Date(`${day.dateKey}T12:00:00`).toLocaleDateString(undefined, {
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
                    title={`${day.dateKey}: ${(day.totalMinutes / 60).toFixed(1)}h total sleep`}
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
              Selected day:{' '}
              <span className="font-semibold text-[var(--text-main)]">{formatHoursMinutes(totalMinutes)}</span>
              {targetMinutes > 0 ? (
                <span className="text-[var(--text-soft)]">
                  {' '}
                  ({Math.min(999, Math.round((totalMinutes / targetMinutes) * 100))}% of target)
                </span>
              ) : null}
            </span>
            <span>{getSourceLabel(sourceSummary, totalMinutes)}</span>
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
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Primary sleep</div>
            <div className="text-[13px] font-semibold text-[var(--text-main)]">{formatHoursMinutes(primaryMinutes)}</div>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-2.5 text-left">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Naps</div>
            <div className="text-[13px] font-semibold text-[var(--text-main)]">{formatHoursMinutes(napMinutes)}</div>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-2.5 text-left">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Primary type</div>
            <div className="text-[13px] font-semibold text-[var(--text-main)]">
              {dominantType ? getSleepTypeLabel(dominantType) : 'None'}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-2.5 text-left">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Last sync</div>
            <div className="text-[13px] font-semibold text-[var(--text-main)]">
              {formatRelativeSyncLabel(lastSyncAt, hasWearableConnection)}
            </div>
          </div>
          <div className="col-span-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-2.5 text-left">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Recovery need</div>
            <div className="text-sm font-semibold text-[var(--text-main)]">
              {sleepDebtMinutes == null
                ? 'Loading'
                : sleepDebtMinutes > 0
                ? `${formatHoursMinutes(sleepDebtMinutes)} recovery needed`
                : 'Recovery covered'}
            </div>
            <div className="mt-1 text-[10px] text-[var(--text-muted)]">
              Timing alignment:{' '}
              {circadianAlignment == null
                ? 'Not enough data'
                : circadianAlignment === 'good'
                ? 'Good for this shift'
                : circadianAlignment === 'ok'
                ? 'Acceptable for this shift'
                : 'Off for this shift'}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
