'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/providers/language-provider'
import { LogSleepModal } from './LogSleepModal'
import { SleepEditModal } from './SleepEditModal'
import { DeleteSleepConfirmModal } from './DeleteSleepConfirmModal'
import { LastWorkBlockCard } from './LastWorkBlockCard'
import { deriveSleepMotivationBand, SleepMotivationCard } from './SleepMotivationCard'
import { ShiftSleepOverviewCard } from './ShiftSleepOverviewCard'
import type { SleepLogInput, SleepType } from '@/lib/sleep/types'
import {
  pickDefaultShiftedDay,
  formatYmdInTimeZone,
  addCalendarDaysToYmd,
  type SleepBarPoint,
} from '@/lib/sleep/utils'
import { authedFetch } from '@/lib/supabase/authedFetch'
import { notifySleepLogsUpdated } from '@/lib/circadian/circadianAgent'

interface SleepSession {
  id: string
  start_at: string
  end_at: string
  type: SleepType
  source?: string | null
  durationHours: number
  quality?: string | number | null
  notes?: string | null
}

interface ShiftedDay {
  date: string
  shiftedDayStart: string
  sessions: SleepSession[]
  totalMinutes: number
  totalHours: number
}

function extractApiErrorMessage(errorData: any, fallback: string): string {
  if (!errorData) return fallback
  if (typeof errorData.error === 'string' && errorData.error.trim()) return errorData.error
  if (typeof errorData.message === 'string' && errorData.message.trim()) return errorData.message
  if (errorData.error && typeof errorData.error === 'object') {
    if (typeof errorData.error.message === 'string' && errorData.error.message.trim()) {
      return errorData.error.message
    }
  }
  return fallback
}

function getShiftAdjustedTargetMinutes(baseTargetMinutes: number, shiftLabel: string) {
  if (baseTargetMinutes <= 0) return 0
  switch (shiftLabel) {
    case 'NIGHT':
      return Math.round(baseTargetMinutes * 1.1)
    case 'EARLY':
      return Math.round(baseTargetMinutes * 1.05)
    case 'OFF':
      return Math.round(baseTargetMinutes * 0.95)
    default:
      return baseTargetMinutes
  }
}

export function ShiftWorkerSleepPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [shiftedDays, setShiftedDays] = useState<ShiftedDay[]>([])
  const [sevenDayChartBars, setSevenDayChartBars] = useState<SleepBarPoint[]>([])
  const [sevenDayCalendarDays, setSevenDayCalendarDays] = useState<
    Array<{ date: string; totalMinutes: number; sessions?: SleepSession[] }>
  >([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [logModalType, setLogModalType] = useState<SleepType>('main_sleep')
  const [logModalStart, setLogModalStart] = useState<Date | null>(null)
  const [logModalEnd, setLogModalEnd] = useState<Date | null>(null)
  const [editingSession, setEditingSession] = useState<SleepSession | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [shiftByDate, setShiftByDate] = useState<Map<string, string>>(new Map())
  const [sleepGoalHours, setSleepGoalHours] = useState<number | null>(null)
  const [hasWearableConnection, setHasWearableConnection] = useState(false)
  const [lastWearableSyncAt, setLastWearableSyncAt] = useState<number | null>(null)
  const [isWearableSyncing, setIsWearableSyncing] = useState(false)
  const [heroActionError, setHeroActionError] = useState<string | null>(null)
  const [profileFirstName, setProfileFirstName] = useState<string | null>(null)

  const selectedDayRef = useRef<string | null>(null)
  useEffect(() => {
    selectedDayRef.current = selectedDay
  }, [selectedDay])

  const userTimeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  )

  // Fetch shifted day sleep data
  const fetchShiftedDays = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true)
      const tz = encodeURIComponent(userTimeZone)
      const res = await authedFetch(`/api/sleep/24h-grouped?days=14&tz=${tz}`, { cache: 'no-store' })
      
      if (!res.ok) {
        console.error('[ShiftWorkerSleepPage] Failed to fetch:', res.status)
        setShiftedDays([])
        return
      }

      const data = await res.json()
      const days = data.days || []
      setShiftedDays(days)
      const picked = pickDefaultShiftedDay(
        days,
        data.currentShiftedDay,
        selectedDayRef.current,
      )
      if (picked) setSelectedDay(picked)
    } catch (err) {
      console.error('[ShiftWorkerSleepPage] Error:', err)
      setShiftedDays([])
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [userTimeZone])

  const fetchSevenDayChart = useCallback(async () => {
    try {
      const tz = encodeURIComponent(userTimeZone)
      const anchorDate = encodeURIComponent(formatYmdInTimeZone(new Date(), userTimeZone))
      const res = await authedFetch(
        `/api/sleep/7days?tz=${tz}&anchorDate=${anchorDate}`,
        { cache: 'no-store' },
      )
      if (!res.ok) {
        console.error('[ShiftWorkerSleepPage] 7days chart:', res.status)
        return
      }
      const json = await res.json()
      const rows: Array<{
        date?: string
        totalMinutes?: number
        sessions?: SleepSession[]
      }> = json.days || []
      setSevenDayCalendarDays(
        rows.map((r) => ({
          date: String(r.date ?? '').slice(0, 10),
          totalMinutes: Math.max(0, r.totalMinutes ?? 0),
          sessions: Array.isArray(r.sessions) ? r.sessions : [],
        })),
      )
      const fromApi = json.chartBars as SleepBarPoint[] | undefined
      if (Array.isArray(fromApi) && fromApi.length === 7) {
        setSevenDayChartBars(
          fromApi.map((b) => ({
            dateKey: String(b.dateKey ?? '').slice(0, 10),
            totalMinutes: Math.max(0, Number(b.totalMinutes) || 0),
          })),
        )
        return
      }
      const by = new Map(
        rows.map((r) => [String(r.date ?? '').slice(0, 10), Math.max(0, r.totalMinutes ?? 0)]),
      )
      const endYmd = formatYmdInTimeZone(new Date(), userTimeZone)
      const bars: SleepBarPoint[] = []
      for (let i = 6; i >= 0; i--) {
        const key = addCalendarDaysToYmd(endYmd, -i)
        bars.push({ dateKey: key, totalMinutes: by.get(key) ?? 0 })
      }
      setSevenDayChartBars(bars)
    } catch (err) {
      console.error('[ShiftWorkerSleepPage] 7days chart error:', err)
    }
  }, [userTimeZone])

  useEffect(() => {
    void fetchShiftedDays(true)
  }, [fetchShiftedDays])

  useEffect(() => {
    void fetchSevenDayChart()
  }, [fetchSevenDayChart])

  const fetchProfileSleepAndName = useCallback(async () => {
    try {
      const res = await authedFetch('/api/profile', { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      const goal = json?.profile?.sleep_goal_h
      if (typeof goal === 'number' && !Number.isNaN(goal) && goal > 0 && goal < 16) {
        setSleepGoalHours(goal)
      }
      const rawName = json?.profile?.name
      if (typeof rawName === 'string' && rawName.trim()) {
        const first = rawName.trim().split(/\s+/)[0]
        setProfileFirstName(first || null)
      } else {
        setProfileFirstName(null)
      }
    } catch (err) {
      console.error('[ShiftWorkerSleepPage] profile fetch error:', err)
    }
  }, [])

  useEffect(() => {
    void fetchProfileSleepAndName()
  }, [fetchProfileSleepAndName])

  const fetchShifts = useCallback(async () => {
    try {
      const res = await authedFetch('/api/shifts?days=30', { cache: 'no-store' })
      if (!res.ok) return

      const json = await res.json()
      const rows: any[] = json?.shifts ?? json?.items ?? []
      const map = new Map<string, string>()
      for (const row of rows) {
        if (row?.date) {
          map.set(row.date, row.label || row.shift_label || 'OFF')
        }
      }
      setShiftByDate(map)
    } catch (err) {
      console.error('[ShiftWorkerSleepPage] shift fetch error:', err)
    }
  }, [])

  useEffect(() => {
    void fetchShifts()
  }, [fetchShifts])

  const fetchWearableStatus = useCallback(async () => {
    try {
      const res = await authedFetch('/api/wearables/status', { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      setHasWearableConnection(Boolean(json?.connected))
      const lastSync =
        json?.lastSyncAt ??
        json?.last_synced_at ??
        json?.lastSuccessfulSyncAt ??
        null
      setLastWearableSyncAt(lastSync ? new Date(lastSync).getTime() : null)
    } catch (err) {
      console.error('[ShiftWorkerSleepPage] wearable status error:', err)
    }
  }, [])

  useEffect(() => {
    void fetchWearableStatus()
  }, [fetchWearableStatus])

  const chartHighlightYmd = useMemo(() => formatYmdInTimeZone(new Date(), userTimeZone), [userTimeZone])

  const refreshSleepPageData = useCallback(async () => {
    try {
      await Promise.all([fetchShiftedDays(false), fetchSevenDayChart(), fetchShifts()])
      void fetchProfileSleepAndName()
      void authedFetch('/api/shift-rhythm?force=true').catch(() => {})
      void authedFetch('/api/sleep/tonight-target').catch(() => {})
      router.refresh()
    } catch (err) {
      console.error('[ShiftWorkerSleepPage] refresh error:', err)
    }
  }, [fetchShiftedDays, fetchSevenDayChart, fetchProfileSleepAndName, fetchShifts, router])

  const handleSyncWearable = useCallback(async () => {
    try {
      setHeroActionError(null)
      setIsWearableSyncing(true)
      const now = Date.now()
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const startTimeMillis = startOfDay.getTime()
      const res = await authedFetch('/api/wearables/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTimeMillis, endTimeMillis: now }),
      })
      const json = await res.json().catch(() => ({}))
      if (json?.error === 'no_wearable_connection') {
        setHeroActionError(t('sleepSW.noWearable'))
        return
      }
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, t('sleepSW.syncFailed')))
      }
      await Promise.all([fetchWearableStatus(), refreshSleepPageData()])
    } catch (err) {
      setHeroActionError(err instanceof Error ? err.message : t('sleepSW.syncFailed'))
    } finally {
      setIsWearableSyncing(false)
    }
  }, [fetchWearableStatus, refreshSleepPageData, t])

  // Handle log sleep submit
  const handleLogSleep = async (data: SleepLogInput) => {
    try {
      const res = await authedFetch('/api/sleep/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: t('sleepForm.errSave') }))
        throw new Error(extractApiErrorMessage(errorData, t('sleepForm.errSave')))
      }

      notifySleepLogsUpdated()

      setIsLogModalOpen(false)
      setLogModalStart(null)
      setLogModalEnd(null)

      await refreshSleepPageData()
    } catch (error) {
      console.error('[ShiftWorkerSleepPage] Error logging sleep:', error)
      throw error
    }
  }

  // Handle delete
  const handleDeleteClick = (sessionId: string) => {
    setDeletingSessionId(sessionId)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingSessionId) return

    setIsDeleting(true)
    try {
      const res = await authedFetch(`/api/sleep/sessions/${deletingSessionId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        alert(extractApiErrorMessage(errorData, t('sleepSW.deleteSessionFailed')))
        setIsDeleting(false)
        setDeletingSessionId(null)
        return
      }

      notifySleepLogsUpdated()

      setDeletingSessionId(null)
      await refreshSleepPageData()
    } catch (err) {
      console.error('[ShiftWorkerSleepPage] Delete error:', err)
      alert(t('sleepSW.deleteSessionFailed'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeletingSessionId(null)
    setIsDeleting(false)
  }

  const selectedDayData = selectedDay
    ? (shiftedDays.find((d) => d.date === selectedDay) ?? shiftedDays[0])
    : shiftedDays[0]

  const calendarFocusYmd = chartHighlightYmd
  const useCalendarOverview = sevenDayCalendarDays.length > 0
  const calendarOverviewRow = sevenDayCalendarDays.find((d) => d.date === calendarFocusYmd)

  const shiftForDay = useCalendarOverview
    ? shiftByDate.get(calendarFocusYmd) || 'OFF'
    : selectedDayData?.date
      ? shiftByDate.get(selectedDayData.date) || 'OFF'
      : 'OFF'

  const sessions = useCalendarOverview
    ? (calendarOverviewRow?.sessions ?? [])
    : (selectedDayData?.sessions ?? [])
  const baseTargetMinutes = sleepGoalHours ? Math.round(sleepGoalHours * 60) : 0
  const adjustedTargetMinutes = getShiftAdjustedTargetMinutes(baseTargetMinutes, shiftForDay)

  let totalMinutes = 0
  let primaryMinutes = 0
  let napMinutes = 0

  const typeMinutes: Partial<Record<SleepType, number>> = {}
  let latestWearableSyncAt: number | null = null
  let primarySleepStartHour: number | null = null
  let longestPrimaryMinutes = 0

  for (const s of sessions) {
    const minutes = Math.max(0, Math.round(s.durationHours * 60))
    totalMinutes += minutes

    if (s.type === 'nap') {
      napMinutes += minutes
    } else {
      primaryMinutes += minutes
      if (minutes > longestPrimaryMinutes) {
        longestPrimaryMinutes = minutes
        const startHour = new Date(s.start_at).getHours()
        primarySleepStartHour = Number.isNaN(startHour) ? null : startHour
      }
    }

    typeMinutes[s.type] = (typeMinutes[s.type] ?? 0) + minutes

    if (s.source && s.source !== 'manual') {
      const endTime = new Date(s.end_at).getTime()
      if (Number.isFinite(endTime) && (!latestWearableSyncAt || endTime > latestWearableSyncAt)) {
        latestWearableSyncAt = endTime
      }
    }
  }

  const circadianAlignment: 'good' | 'ok' | 'poor' | null = (() => {
    if (!sessions.length) return null
    const primarySessions = sessions.filter((s) => s.type !== 'nap')
    if (!primarySessions.length) return null

    const longest = [...primarySessions].sort((a, b) => b.durationHours - a.durationHours)[0]
    const startHour = new Date(longest.start_at).getHours()
    if (Number.isNaN(startHour)) return null

    if (shiftForDay === 'NIGHT') {
      if (startHour >= 6 && startHour <= 12) return 'good'
      if (startHour >= 4 && startHour <= 14) return 'ok'
      return 'poor'
    }

    if (shiftForDay === 'EARLY') {
      if (startHour >= 19 && startHour <= 22) return 'good'
      if (startHour >= 18 && startHour <= 23) return 'ok'
      return 'poor'
    }

    if (shiftForDay === 'LATE') {
      if (startHour >= 22 || startHour <= 1) return 'good'
      if (startHour >= 21 || startHour <= 2) return 'ok'
      return 'poor'
    }

    if (shiftForDay === 'OFF') {
      if (startHour >= 21 || startHour <= 1) return 'good'
      if (startHour >= 20 || startHour <= 2) return 'ok'
      return 'poor'
    }

    if (startHour >= 20 || startHour <= 1) return 'good'
    if (startHour >= 18 || startHour <= 3) return 'ok'
    return 'poor'
  })()

  let dominantType: SleepType | null = null
  let maxMinutes = 0
  for (const [type, minutes] of Object.entries(typeMinutes)) {
    if ((minutes ?? 0) > maxMinutes) {
      maxMinutes = minutes ?? 0
      dominantType = type as SleepType
    }
  }

  const sleepDebtMinutes = adjustedTargetMinutes > 0 ? Math.max(0, adjustedTargetMinutes - totalMinutes) : null

  const motivationBand = deriveSleepMotivationBand({
    totalMinutes,
    adjustedTargetMinutes,
    sleepDebtMinutes,
  })

  // Show loading state
  if (loading && shiftedDays.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-sm text-slate-500">{t('sleepSW.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Page header with back arrow */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--card)] text-[var(--text-soft)] transition hover:bg-[var(--card-subtle)] hover:text-[var(--text-main)]"
          aria-label={t('sleepSW.backHome')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-sm font-semibold tracking-tight text-[var(--text-main)]">
          {t('sleepSW.pageTitle')}
        </h1>
      </div>

      <ShiftSleepOverviewCard
        totalMinutes={totalMinutes}
        targetMinutes={adjustedTargetMinutes}
        primaryMinutes={primaryMinutes}
        napMinutes={napMinutes}
        dominantType={dominantType}
        hasWearableConnection={hasWearableConnection}
        lastSyncAt={lastWearableSyncAt ?? latestWearableSyncAt}
        isWearableSyncing={isWearableSyncing}
        sleepDebtMinutes={sleepDebtMinutes}
        circadianAlignment={circadianAlignment}
        actionError={heroActionError}
        onLogSleep={() => {
          setHeroActionError(null)
          if (shiftForDay === 'NIGHT' && totalMinutes <= 0) {
            setLogModalType('post_shift_sleep')
          } else if (sleepDebtMinutes != null && sleepDebtMinutes >= 120) {
            setLogModalType('recovery_sleep')
          } else if (totalMinutes > 0) {
            setLogModalType('nap')
          } else {
            setLogModalType('main_sleep')
          }
          setLogModalStart(null)
          setLogModalEnd(null)
          setIsLogModalOpen(true)
        }}
        onSyncWearable={handleSyncWearable}
        editLogsHref="/sleep/history"
        sevenDayBars={sevenDayChartBars}
        highlightDateKey={chartHighlightYmd}
        chartTimeZone={userTimeZone}
      />

      <LastWorkBlockCard timeZone={userTimeZone} authedFetch={authedFetch} />

      <SleepMotivationCard profileFirstName={profileFirstName} band={motivationBand} />

      <footer className="pt-6 pb-2 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          {t('detail.common.disclaimerBrand')}
        </p>
        <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
          {t('detail.common.disclaimerLine1')}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
          {t('detail.common.disclaimerLine2')}
        </p>
      </footer>

      {/* Log Sleep Modal */}
      <LogSleepModal
        open={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false)
          setLogModalStart(null)
          setLogModalEnd(null)
        }}
        onSubmit={handleLogSleep}
        defaultType={logModalType}
        defaultStart={logModalStart}
        defaultEnd={logModalEnd}
      />

      {/* Edit Session Modal */}
      {editingSession && (
        <SleepEditModal
          open={true}
          session={{
            id: editingSession.id,
            type: editingSession.type,
            startAt: editingSession.start_at,
            endAt: editingSession.end_at,
            durationHours: editingSession.durationHours,
            quality: editingSession.quality,
            source: editingSession.source ?? 'manual',
          }}
          onClose={() => setEditingSession(null)}
          onSuccess={async () => {
            setEditingSession(null)
            await refreshSleepPageData()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingSessionId && (
        <DeleteSleepConfirmModal
          open={!!deletingSessionId}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          loading={isDeleting}
        />
      )}
    </div>
  )
}

