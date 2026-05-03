'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '@/components/providers/language-provider'
import { authedFetch } from '@/lib/supabase/authedFetch'
import { parseManualHistoryResponse, type ManualHistoryEntry } from '@/lib/activity/manualHistoryApi'
import { formatManualTimeWindow, manualHistoryRowSemantics } from '@/lib/activity/manualHistoryUi'

const ACTIVITY_KINDS = new Set(['walk', 'run', 'workout', 'shift', 'custom'])

function activityTypeLabel(t: (key: string) => string, activityType: string | null): string {
  if (activityType && ACTIVITY_KINDS.has(activityType)) {
    return t(`activityLog.kind.${activityType}`)
  }
  return activityType?.trim() ? activityType : t('activityLog.kind.custom')
}

export type ManualActivityHistorySectionProps = {
  /** Civil activity date (YYYY-MM-DD). Omit to use server default “today” in the browser time zone. */
  activityDate?: string | null
}

export function ManualActivityHistorySection({ activityDate }: ManualActivityHistorySectionProps) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<ManualHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tz =
    typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      qs.set('tz', tz)
      if (activityDate && /^\d{4}-\d{2}-\d{2}$/.test(activityDate)) {
        qs.set('date', activityDate)
      }
      const res = await authedFetch(`/api/activity/manual?${qs.toString()}`, { cache: 'no-store' })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof (json as { error?: string })?.error === 'string' ? (json as { error: string }).error : null)
        setEntries([])
        return
      }
      const parsed = parseManualHistoryResponse(json)
      setEntries(parsed?.entries ?? [])
    } catch {
      setEntries([])
      setError('fetch_failed')
    } finally {
      setLoading(false)
    }
  }, [activityDate, tz])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onRefresh = () => {
      void load()
    }
    window.addEventListener('activity-manual-logged', onRefresh)
    window.addEventListener('wearables-synced', onRefresh)
    return () => {
      window.removeEventListener('activity-manual-logged', onRefresh)
      window.removeEventListener('wearables-synced', onRefresh)
    }
  }, [load])

  const timeOpts = { timeZone: tz }

  return (
    <section
      className="w-full rounded-xl border border-[#05afc5]/25 bg-white px-4 py-4 shadow-sm dark:border-[#05afc5]/30 dark:bg-[var(--card)]"
      aria-labelledby="manual-activity-history-heading"
    >
      <h2
        id="manual-activity-history-heading"
        className="text-sm font-semibold tracking-tight text-slate-900 dark:text-[var(--text-main)]"
      >
        {t('activityLog.manualHistory.title')}
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-[var(--text-soft)]">
        {t('activityLog.manualHistory.trustWearable')}
      </p>

      {error ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {t('activityLog.manualHistory.loadError')}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-3 space-y-2" aria-hidden>
          <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700/80" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700/80" />
        </div>
      ) : entries.length === 0 ? (
        <p
          className="mt-3 text-sm text-slate-500 dark:text-[var(--text-muted)]"
          data-testid="manual-history-empty"
        >
          {t('activityLog.manualHistory.empty')}
        </p>
      ) : (
        <div className="mt-3">
          <div
            className="mb-2 hidden grid-cols-[1fr_auto] gap-2 text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:grid dark:text-[var(--text-muted)]"
            aria-hidden
          >
            <span>{t('activityLog.manualHistory.colEntry')}</span>
            <span className="text-right">{t('activityLog.manualHistory.colStatus')}</span>
          </div>
          <ul className="space-y-2">
            {entries.map((e) => {
              const { statusKind: kind, muted } = manualHistoryRowSemantics(e.merge_status)
              const windowLabel = formatManualTimeWindow(e.start_time, e.end_time, timeOpts)
              const typeLabel = activityTypeLabel(t, e.activity_type)
              const stepsLabel = e.steps.toLocaleString()
              const badgeText =
                kind === 'replaced'
                  ? t('activityLog.manualHistory.statusReplaced')
                  : kind === 'not_counted'
                    ? t('activityLog.manualHistory.badgeNotCounted')
                    : t('activityLog.manualHistory.badgeCounted')

              return (
                <li
                  key={e.id}
                  data-testid="manual-history-row"
                  data-entry-id={e.id}
                  data-status-kind={kind}
                  data-muted={muted ? 'true' : 'false'}
                  className={`grid grid-cols-1 gap-2 rounded-lg border border-slate-100 px-3 py-2.5 sm:grid-cols-[1fr_auto] sm:items-center dark:border-[var(--border-subtle)] ${
                    muted ? 'opacity-60' : ''
                  }`}
                  style={{ background: muted ? 'var(--ring-bg, rgb(248 250 252))' : undefined }}
                >
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium leading-snug ${muted ? 'text-slate-500 line-through dark:text-[var(--text-muted)]' : 'text-slate-900 dark:text-[var(--text-main)]'}`}
                    >
                      {typeLabel}
                      <span className="font-normal text-slate-600 dark:text-[var(--text-soft)]">
                        {' '}
                        &middot; {stepsLabel} {t('activityLog.metric.steps')}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-[var(--text-muted)]">{windowLabel}</p>
                  </div>
                  <div className="flex justify-start sm:justify-end">
                    <span
                      className={`inline-flex max-w-full shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-snug ${
                        kind === 'counted'
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/35 dark:text-emerald-100'
                          : kind === 'replaced'
                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-600/50 dark:text-slate-100'
                            : 'bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100'
                      }`}
                    >
                      {badgeText}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
