'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react'
import { SleepEditModal } from '@/components/sleep/SleepEditModal'
import { DeleteSleepConfirmModal } from '@/components/sleep/DeleteSleepConfirmModal'
import { useLanguage, useTranslation } from '@/components/providers/language-provider'
import { intlLocaleForApp } from '@/lib/i18n/supportedLocales'
import { getShiftedDayKey } from '@/lib/sleep/utils'
import type { SleepType } from '@/lib/sleep/types'

type SleepHistoryItem = {
  id: string
  start_at: string
  end_at: string
  type: SleepType
  quality: number | null
  notes?: string | null
  source?: string | null
  date?: string | null
}

type GroupedDay = {
  date: string
  sessions: SleepHistoryItem[]
  totalMinutes: number
}

function getMinutes(startAt: string, endAt: string) {
  return Math.max(0, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000))
}

export function SleepHistoryManagerPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const { t } = useTranslation()
  const intlLocale = useMemo(() => intlLocaleForApp(language), [language])

  const formatDateTime = useCallback(
    (value: string) => {
      const d = new Date(value)
      return d.toLocaleString(intlLocale, {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    },
    [intlLocale],
  )

  const typeLabel = useCallback(
    (type: SleepType) => {
      switch (type) {
        case 'main_sleep':
          return t('sleepType.main_sleep')
        case 'post_shift_sleep':
          return t('sleepType.post_shift_sleep')
        case 'recovery_sleep':
          return t('sleepType.recovery_sleep')
        case 'nap':
          return t('sleepType.nap')
        default:
          return t('sleepType.default')
      }
    },
    [t],
  )

  const qualityLabelFromNum = useCallback(
    (n: number | null | undefined) => {
      if (n == null) return ''
      switch (n) {
        case 5:
          return t('sleepQuality.excellent')
        case 4:
          return t('sleepQuality.good')
        case 3:
          return t('sleepQuality.fair')
        case 2:
          return t('sleepQuality.poor')
        case 1:
          return t('sleepQuality.veryPoor')
        default:
          return t('sleepQuality.fair')
      }
    },
    [t],
  )

  const [items, setItems] = useState<SleepHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<SleepHistoryItem | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setActionError(null)

      const res = await fetch('/api/sleep/history?days=30', { cache: 'no-store' })
      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || t('sleepHistMgr.errLoad'))
      }

      setItems(json?.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sleepHistMgr.errLoad'))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void fetchHistory()
  }, [fetchHistory])

  const groupedDays = useMemo<GroupedDay[]>(() => {
    const map = new Map<string, GroupedDay>()

    for (const item of items) {
      const key = item.date || getShiftedDayKey(item.start_at)
      const existing = map.get(key)
      const minutes = getMinutes(item.start_at, item.end_at)

      if (existing) {
        existing.sessions.push(item)
        existing.totalMinutes += minutes
      } else {
        map.set(key, {
          date: key,
          sessions: [item],
          totalMinutes: minutes,
        })
      }
    }

    return Array.from(map.values())
      .map((day) => ({
        ...day,
        sessions: [...day.sessions].sort(
          (a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
        ),
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [items])

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId) return
    try {
      setDeletingId(pendingDeleteId)
      setActionError(null)

      const res = await fetch(`/api/sleep/sessions/${pendingDeleteId}`, {
        method: 'DELETE',
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || t('sleepHistMgr.errDelete'))
      }

      await fetchHistory()
      router.refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('sleepHistMgr.errDelete'))
    } finally {
      setDeletingId(null)
      setPendingDeleteId(null)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/sleep"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          aria-label={t('sleepHistMgr.backAria')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-sm font-semibold tracking-[0.18em] text-slate-800 uppercase">
            {t('sleepHistMgr.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t('sleepHistMgr.subtitle')}</p>
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="h-4 w-40 rounded bg-slate-200 animate-pulse mb-4" />
          <div className="h-16 rounded bg-slate-100 animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : groupedDays.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          {t('sleepHistMgr.empty')}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedDays.map((day) => (
            <section
              key={day.date}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString(intlLocale, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {t('sleepHistMgr.dayTotal', { h: (day.totalMinutes / 60).toFixed(1) })}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {day.sessions.map((session) => {
                  const duration = getMinutes(session.start_at, session.end_at) / 60

                  return (
                    <div
                      key={session.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-900">
                            {typeLabel(session.type)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {t('sleepLogs.timeRange', {
                              start: formatDateTime(session.start_at),
                              end: formatDateTime(session.end_at),
                            })}
                          </p>
                          <p className="text-xs text-slate-500">
                            {t('sleepLogs.durationH', { h: duration.toFixed(1) })}
                            {session.quality != null ? ` · ${qualityLabelFromNum(session.quality)}` : ''}
                            {session.source ? ` · ${session.source}` : ''}
                          </p>
                          {session.notes ? (
                            <p className="text-xs text-slate-500 italic">
                              {session.notes}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingSession(session)}
                            disabled={deletingId === session.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {t('sleepHistMgr.edit')}
                          </button>

                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(session.id)}
                            disabled={deletingId === session.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deletingId === session.id ? t('sleepDel.deleting') : t('sleepHistMgr.delete')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <SleepEditModal
        open={!!editingSession}
        session={
          editingSession
            ? {
                id: editingSession.id,
                type: editingSession.type,
                startAt: editingSession.start_at,
                endAt: editingSession.end_at,
                quality: editingSession.quality,
                source: editingSession.source ?? undefined,
              }
            : null
        }
        onClose={() => setEditingSession(null)}
        onSuccess={async () => {
          setEditingSession(null)
          await fetchHistory()
          router.refresh()
        }}
      />

      <DeleteSleepConfirmModal
        open={!!pendingDeleteId}
        loading={!!pendingDeleteId && deletingId === pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          void handleDeleteConfirm()
        }}
      />
    </div>
  )
}
