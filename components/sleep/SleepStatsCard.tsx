'use client'

import Link from 'next/link'
import { Inter } from 'next/font/google'
import { useTranslation } from '@/components/providers/language-provider'
import type { SleepType } from '@/lib/sleep/types'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export type SleepStatsCardProps = {
  totalMinutes: number
  targetMinutes: number
  primaryMinutes: number
  napMinutes: number
  dominantType: SleepType | null
  hasWearableConnection?: boolean
  lastSyncAt?: number | null
  isWearableSyncing?: boolean
  sleepDebtMinutes?: number | null
  circadianAlignment?: 'good' | 'ok' | 'poor' | null
  actionError?: string | null
  onLogSleep: () => void
  onSyncWearable?: () => Promise<void> | void
  editLogsHref: string
}

const WEARABLE_STALE_MS = 4 * 60 * 60 * 1000 // 4h

type ProgressState = 'empty' | 'neutral' | 'behind' | 'progress' | 'on_track' | 'recovery'

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

function formatSleepDuration(t: TranslateFn, totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(safeMinutes / 60)
  const m = safeMinutes % 60
  return t('sleepCard.durationHM', { h, m })
}

function getProgressState(totalMinutes: number, targetMinutes: number): ProgressState {
  if (totalMinutes <= 0) return 'empty'
  if (targetMinutes <= 0) return 'neutral'
  if (totalMinutes < targetMinutes * 0.6) return 'behind'
  if (totalMinutes < targetMinutes) return 'progress'
  if (totalMinutes <= targetMinutes * 1.15) return 'on_track'
  return 'recovery'
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

export function SleepStatsCard({
  totalMinutes,
  targetMinutes,
  primaryMinutes,
  napMinutes,
  dominantType,
  hasWearableConnection = false,
  lastSyncAt = null,
  isWearableSyncing = false,
  sleepDebtMinutes = null,
  circadianAlignment = null,
  actionError = null,
  onLogSleep,
  onSyncWearable,
  editLogsHref,
}: SleepStatsCardProps) {
  const { t } = useTranslation()
  const syncAgeMs = lastSyncAt ? Date.now() - lastSyncAt : Number.POSITIVE_INFINITY
  const wearableStale = hasWearableConnection && syncAgeMs > WEARABLE_STALE_MS
  const progressState = getProgressState(totalMinutes, targetMinutes)

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

  return (
    <section className="relative w-full overflow-hidden rounded-lg bg-[var(--card)] px-4 py-4">
      <div
        className={`${inter.className} relative z-10 flex flex-col items-center gap-3 text-center`}
      >
        {actionError ? (
          <p className="w-full text-left text-xs text-rose-600 dark:text-rose-400" role="alert">
            {actionError}
          </p>
        ) : null}

        <div className="flex w-full gap-2.5">
          <button
            type="button"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className="flex-1 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:from-slate-800 hover:to-slate-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {primaryAction.label}
          </button>
          {secondaryAction.href ? (
            <Link
              href={secondaryAction.href}
              className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] px-3.5 py-2.5 text-center text-sm font-semibold text-[var(--text-soft)] transition hover:bg-[var(--card-subtle)] active:scale-[0.99]"
            >
              {secondaryAction.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={secondaryAction.onClick ?? undefined}
              disabled={!secondaryAction.onClick}
              className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] px-3.5 py-2.5 text-center text-sm font-semibold text-[var(--text-soft)] transition hover:bg-[var(--card-subtle)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>

        <div className="grid w-full grid-cols-2 gap-2 pt-0.5">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] px-3 py-2.5 text-left">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t('sleepCard.primarySleep')}
            </div>
            <div className="text-[13px] font-semibold text-[var(--text-main)]">
              {formatSleepDuration(t, primaryMinutes)}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] px-3 py-2.5 text-left">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t('sleepCard.naps')}
            </div>
            <div className="text-[13px] font-semibold text-[var(--text-main)]">
              {formatSleepDuration(t, napMinutes)}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] px-3 py-2.5 text-left">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t('sleepCard.primaryType')}
            </div>
            <div className="text-[13px] font-semibold text-[var(--text-main)]">
              {dominantType ? t(`sleepType.${dominantType}`) : t('sleepCard.typeNone')}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] px-3 py-2.5 text-left">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t('sleepCard.lastSync')}
            </div>
            <div className="text-[13px] font-semibold text-[var(--text-main)]">
              {formatRelativeSyncLabel(t, lastSyncAt, hasWearableConnection)}
            </div>
          </div>
          <div className="col-span-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] px-3 py-2.5 text-left">
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
