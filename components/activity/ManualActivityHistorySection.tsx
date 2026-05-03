'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
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

function readDeleteApiMessage(json: unknown, fallback: string): string {
  if (!json || typeof json !== 'object') return fallback
  const o = json as Record<string, unknown>
  const err = o.error
  if (typeof err === 'string') return err
  if (err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string') {
    return (err as { message: string }).message
  }
  if (typeof o.message === 'string') return o.message
  return fallback
}

export type ManualActivityHistorySectionProps = {
  /** Civil activity date (YYYY-MM-DD). Omit to use server default “today” in the browser time zone. */
  activityDate?: string | null
  /** Log page: collapsible disclosure. Activity page: open card (default). */
  layout?: 'card' | 'dropdown'
  /** Log page: allow removing a mistaken manual row (DELETE /api/activity/manual?id=). */
  allowDelete?: boolean
}

export function ManualActivityHistorySection({
  activityDate,
  layout = 'card',
  allowDelete = false,
}: ManualActivityHistorySectionProps) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<ManualHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  const handleDelete = async (id: string) => {
    if (!allowDelete || deletingId) return
    if (!window.confirm(t('activityLog.deleteEntryConfirm'))) return
    setDeleteError(null)
    setDeletingId(id)
    try {
      const res = await authedFetch(`/api/activity/manual?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        cache: 'no-store',
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setDeleteError(readDeleteApiMessage(json, t('activityLog.deleteEntryFailed')))
        return
      }
      await load()
      window.dispatchEvent(new Event('activity-manual-logged'))
      window.dispatchEvent(new Event('wearables-synced'))
    } finally {
      setDeletingId(null)
    }
  }

  const timeOpts = { timeZone: tz }

  const shellClass =
    'w-full rounded-xl border border-[#05afc5]/25 bg-white shadow-sm dark:border-[#05afc5]/30 dark:bg-[var(--card)]'

  const body = (
    <>
      {layout === 'card' ? (
        <>
          <h2
            id="manual-activity-history-heading"
            className="text-sm font-semibold tracking-tight text-slate-900 dark:text-[var(--text-main)]"
          >
            {t('activityLog.manualHistory.title')}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-[var(--text-soft)]">
            {t('activityLog.manualHistory.trustWearable')}
          </p>
        </>
      ) : (
        <p className="text-xs leading-relaxed text-slate-600 dark:text-[var(--text-soft)]">
          {t('activityLog.manualHistory.trustWearable')}
        </p>
      )}

      {error ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {t('activityLog.manualHistory.loadError')}
        </p>
      ) : null}

      {deleteError ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {deleteError}
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
                  className={`rounded-lg border border-slate-100 px-3 py-2.5 dark:border-[var(--border-subtle)] ${
                    muted ? 'opacity-60' : ''
                  } ${allowDelete ? 'sm:grid sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-2' : 'sm:grid sm:grid-cols-[1fr_auto] sm:items-center sm:gap-2'}`}
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
                  <div className="mt-2 flex justify-start sm:mt-0 sm:justify-end">
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
                  {allowDelete ? (
                    <div className="mt-2 flex justify-end sm:mt-0">
                      <button
                        type="button"
                        onClick={() => void handleDelete(e.id)}
                        disabled={deletingId != null}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-40 dark:text-red-300 dark:hover:bg-red-950/40"
                        aria-label={t('activityLog.deleteEntry')}
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                        {deletingId === e.id ? t('activityLog.deletingEntry') : t('activityLog.deleteEntry')}
                      </button>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </>
  )

  if (layout === 'dropdown') {
    return (
      <details className={`${shellClass} group px-0 py-0`}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-[var(--text-main)]">
            {t('activityLog.loggedTodayDropdown.summary', { count: entries.length })}
          </span>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180 dark:text-[var(--text-muted)]"
            aria-hidden
          />
        </summary>
        <div className="border-t border-slate-100 px-4 pb-4 pt-2 dark:border-[var(--border-subtle)]">{body}</div>
      </details>
    )
  }

  return (
    <section className={`${shellClass} px-4 py-4`} aria-labelledby="manual-activity-history-heading">
      {body}
    </section>
  )
}
