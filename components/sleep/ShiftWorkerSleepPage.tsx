'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLanguage, useTranslation } from '@/components/providers/language-provider'
import { LOCALE_META } from '@/lib/i18n/supportedLocales'
import { SleepTimelineBar } from './SleepTimelineBar'
import { LogSleepModal } from './LogSleepModal'
import { SleepEditModal } from './SleepEditModal'
import { DeleteSleepConfirmModal } from './DeleteSleepConfirmModal'
import { ShiftSleepOverviewCard } from './ShiftSleepOverviewCard'
import { getShiftAwareInsightKey } from '@/lib/sleep/coaching'
import type { SleepLogInput, SleepType } from '@/lib/sleep/types'
import {
  pickDefaultShiftedDay,
  formatYmdInTimeZone,
  addCalendarDaysToYmd,
  type SleepBarPoint,
} from '@/lib/sleep/utils'
import { authedFetch } from '@/lib/supabase/authedFetch'
import { notifySleepLogsUpdated } from '@/lib/circadian/circadianAgent'

type WeekSleepOverview = {
  loading: boolean
  error: string | null
  weeklyDeficit: number | null
  requiredDaily: number | null
  category: string | null
  consistencyScore: number | null
  consistencyError: string | null
}

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

interface SleepHistoryDay {
  date: string
  totalMinutes: number
  shiftLabel: string
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

function SleepMetricsCard({
  targetHours,
  targetLoading,
  week,
}: {
  targetHours: number
  targetLoading: boolean
  week: WeekSleepOverview
}) {
  const { t } = useTranslation()
  const weekLoading = week.loading
  const deficitHours = week.weeklyDeficit
  const deficitLabel =
    deficitHours == null
      ? '—'
      : deficitHours <= 0
        ? t('sleepSW.deficitAhead', { h: Math.abs(deficitHours).toFixed(1) })
        : t('sleepSW.deficitBehind', { h: deficitHours.toFixed(1) })
  const deficitSub =
    deficitHours == null
      ? week.error || t('sleepSW.deficitSubError')
      : deficitHours <= 0
        ? t('sleepSW.deficitSubAhead')
        : t('sleepSW.deficitSubBehind')

  const consistencyPct = week.consistencyScore
  const consistencySub =
    consistencyPct != null
      ? t('sleepSW.consistencySub')
      : week.consistencyError || t('sleepSW.consistencyNeedData')

  return (
    <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--text-muted)] uppercase">
            {t('sleepSW.metricsTitle')}
          </p>
          <h2 className="text-sm font-semibold tracking-tight text-[var(--text-main)]">
            {t('sleepSW.metricsHeading')}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="space-y-1">
          <p className="font-semibold tracking-[0.14em] uppercase text-[var(--text-muted)]">
            {t('sleepSW.tonightTarget')}
          </p>
          <p className="text-lg font-semibold text-[var(--text-main)]">
            {targetLoading ? '—' : `${targetHours.toFixed(1)}h`}
          </p>
          <p className="text-[11px] leading-snug text-[var(--text-soft)]">
            {t('sleepSW.tonightHint')}
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-semibold tracking-[0.14em] uppercase text-[var(--text-muted)]">
            {t('sleepSW.consistency')}
          </p>
          {weekLoading ? (
            <div className="mb-1 h-1.5 w-full rounded-full bg-[var(--card-subtle)] animate-pulse" />
          ) : (
            <div className="mb-1 h-1.5 w-full rounded-full bg-[var(--card-subtle)] overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-500/80 dark:bg-sky-400/80 transition-[width] duration-300"
                style={{ width: consistencyPct != null ? `${consistencyPct}%` : '0%' }}
              />
            </div>
          )}
          <p className="text-[11px] leading-snug text-[var(--text-muted)]">
            {weekLoading
              ? '…'
              : consistencyPct != null
                ? t('sleepSW.consistencyLine', { pct: consistencyPct })
                : consistencySub}
          </p>
        </div>

        <div className="space-y-1 text-right">
          <p className="font-semibold tracking-[0.14em] uppercase text-[var(--text-muted)]">
            {t('sleepSW.deficit')}
          </p>
          <p className="text-lg font-semibold text-[var(--text-main)]">
            {weekLoading ? '—' : deficitLabel}
          </p>
          <p className="text-[11px] leading-snug text-[var(--text-soft)]">
            {weekLoading ? '…' : deficitSub}
          </p>
        </div>
      </div>
    </section>
  )
}

function SleepStageGrid() {
  const { t } = useTranslation()
  const stages = [
    { label: t('sleepSW.stage.deep'), description: t('sleepSW.stageDesc.deep') },
    { label: t('sleepSW.stage.rem'), description: t('sleepSW.stageDesc.rem') },
    { label: t('sleepSW.stage.light'), description: t('sleepSW.stageDesc.light') },
    { label: t('sleepSW.stage.awake'), description: t('sleepSW.stageDesc.awake') },
  ]

  return (
    <section className="grid grid-cols-2 gap-3">
      {stages.map((stage) => (
        <div
          key={stage.label}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] px-4 py-3"
        >
          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-[var(--text-soft)]">
            <span className="uppercase tracking-[0.12em]">{stage.label}</span>
            <span>0%</span>
          </div>
          <div className="mb-2 h-1.5 w-full rounded-full bg-[var(--card-subtle)]" />
          <p className="text-[11px] leading-snug text-[var(--text-soft)]">
            {stage.description}
          </p>
        </div>
      ))}
    </section>
  )
}

function SleepDebtCard({ week }: { week: WeekSleepOverview }) {
  const { t } = useTranslation()
  const { loading, error, weeklyDeficit, category } = week

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-32 bg-slate-200/70 dark:bg-slate-700/60 rounded animate-pulse" />
        <div className="h-3 w-full bg-slate-200/70 dark:bg-slate-700/60 rounded animate-pulse" />
      </div>
    )
  }

  if (error || weeklyDeficit === null || category === null) {
    return (
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {error || t('sleepSW.debtNoData')}
      </div>
    )
  }

  const hoursBehind = weeklyDeficit
  const absHours = Math.abs(hoursBehind).toFixed(1)
  const isSurplus = hoursBehind <= 0

  let label: string
  let message: string
  let toneClasses: string

  if (isSurplus) {
    label = t('sleepSW.debtBanked')
    message = t('sleepSW.debtBankedMsg')
    toneClasses = 'bg-emerald-50/80 text-emerald-700 border-emerald-200'
  } else if (category === 'low') {
    label = t('sleepSW.debtMild')
    message = t('sleepSW.debtMildMsg')
    toneClasses = 'bg-sky-50/80 text-sky-700 border-sky-200'
  } else if (category === 'medium') {
    label = t('sleepSW.debtModerate')
    message = t('sleepSW.debtModerateMsg')
    toneClasses = 'bg-amber-50/80 text-amber-700 border-amber-200'
  } else {
    label = t('sleepSW.debtHigh')
    message = t('sleepSW.debtHighMsg')
    toneClasses = 'bg-rose-50/80 text-rose-700 border-rose-200'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400">
            {t('sleepSW.debtWeeklyTitle')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('sleepSW.debtWeeklySub')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('sleepSW.behindAhead')}</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {isSurplus ? '-' : '+'}
            {absHours}h
          </p>
        </div>
      </div>
      <div className={`rounded-2xl px-3 py-2 text-[11px] font-medium border ${toneClasses}`}>
        <p className="text-[11px] mb-0.5">{label}</p>
        <p className="text-[11px] font-normal opacity-90">{message}</p>
      </div>
    </div>
  )
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

const initialWeekOverview: WeekSleepOverview = {
  loading: true,
  error: null,
  weeklyDeficit: null,
  requiredDaily: null,
  category: null,
  consistencyScore: null,
  consistencyError: null,
}

export function ShiftWorkerSleepPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const dateLocale = LOCALE_META[language]?.intl ?? 'en-GB'
  const [weekSleepOverview, setWeekSleepOverview] = useState<WeekSleepOverview>(initialWeekOverview)
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

  // Last 30 days history for guidance
  const [historyDays, setHistoryDays] = useState<SleepHistoryDay[]>([])
  const [shiftByDate, setShiftByDate] = useState<Map<string, string>>(new Map())
  const [historyLoading, setHistoryLoading] = useState(true)
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null)
  const [sleepGoalHours, setSleepGoalHours] = useState<number | null>(null)
  const [hasWearableConnection, setHasWearableConnection] = useState(false)
  const [lastWearableSyncAt, setLastWearableSyncAt] = useState<number | null>(null)
  const [isWearableSyncing, setIsWearableSyncing] = useState(false)
  const [heroActionError, setHeroActionError] = useState<string | null>(null)

  const getHistoryRating = useCallback(
    (totalM: number) => {
      const goal = sleepGoalHours ?? 7.5
      if (!totalM || totalM <= 0) {
        return {
          label: t('sleepSW.rating.noneLabel'),
          message: t('sleepSW.rating.noneMsg'),
          tone: 'neutral' as const,
        }
      }
      const hours = totalM / 60
      if (hours >= goal + 0.5) {
        return {
          label: t('sleepSW.rating.greatLabel'),
          message: t('sleepSW.rating.greatMsg'),
          tone: 'good' as const,
        }
      }
      if (hours >= goal - 0.5) {
        return {
          label: t('sleepSW.rating.okLabel'),
          message: t('sleepSW.rating.okMsg'),
          tone: 'ok' as const,
        }
      }
      if (hours >= goal - 2) {
        return {
          label: t('sleepSW.rating.warnLabel'),
          message: t('sleepSW.rating.warnMsg'),
          tone: 'warn' as const,
        }
      }
      return {
        label: t('sleepSW.rating.badLabel'),
        message: t('sleepSW.rating.badMsg'),
        tone: 'bad' as const,
      }
    },
    [t, sleepGoalHours],
  )

  const selectedDayRef = useRef<string | null>(null)
  useEffect(() => {
    selectedDayRef.current = selectedDay
  }, [selectedDay])

  const userTimeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  )

  const fetchWeekSleepOverview = useCallback(async () => {
    setWeekSleepOverview((s) => ({ ...s, loading: true, error: null }))
    try {
      const [defRes, conRes] = await Promise.all([
        authedFetch('/api/sleep/deficit', { cache: 'no-store' }),
        authedFetch('/api/sleep/consistency', { cache: 'no-store' }),
      ])
      if (!defRes.ok) {
        throw new Error(`deficit ${defRes.status}`)
      }
      const defJson = await defRes.json()
      const conJson = conRes.ok ? await conRes.json().catch(() => ({})) : {}
      setWeekSleepOverview({
        loading: false,
        error: null,
        weeklyDeficit: defJson.weeklyDeficit ?? 0,
        requiredDaily: defJson.requiredDaily ?? 7.5,
        category: defJson.category ?? 'low',
        consistencyScore:
          typeof conJson.consistencyScore === 'number' ? conJson.consistencyScore : null,
        consistencyError: typeof conJson.error === 'string' ? conJson.error : null,
      })
    } catch (err) {
      console.error('[ShiftWorkerSleepPage] week metrics:', err)
      setWeekSleepOverview({
        loading: false,
        error: t('sleepSW.weekMetricsError'),
        weeklyDeficit: null,
        requiredDaily: null,
        category: null,
        consistencyScore: null,
        consistencyError: null,
      })
    }
  }, [t])

  useEffect(() => {
    void fetchWeekSleepOverview()
  }, [fetchWeekSleepOverview])

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

  // Fetch profile-based sleep goal (takes into account age, sex, etc. set in profile)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await authedFetch('/api/profile', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        const goal = json?.profile?.sleep_goal_h
        if (typeof goal === 'number' && !Number.isNaN(goal) && goal > 0 && goal < 16) {
          setSleepGoalHours(goal)
        }
      } catch (err) {
        console.error('[ShiftWorkerSleepPage] profile fetch error:', err)
      }
    }

    fetchProfile()
  }, [])

  // Fetch last 30 days history for guidance card
  const fetchSleepHistory = useCallback(async () => {
    try {
      setHistoryLoading(true)
      const res = await authedFetch('/api/sleep/history', { cache: 'no-store' })
      if (!res.ok) {
        console.error('[ShiftWorkerSleepPage] history error:', res.status)
        setHistoryDays([])
        return
      }
      const json = await res.json()
      const items: any[] = json.items || []

      const byDate: Record<string, { totalMinutes: number; shiftLabel: string }> = {}

      for (const item of items) {
        const date: string | null = item.date || null
        if (!date) continue

        const start = item.start_at
        const end = item.end_at
        let minutes = 0
        if (start && end) {
          minutes = Math.max(
            0,
            Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000),
          )
        }

        if (!byDate[date]) {
          byDate[date] = {
            totalMinutes: 0,
            shiftLabel: item.shift_label || 'OFF',
          }
        }
        byDate[date].totalMinutes += minutes
        if (byDate[date].shiftLabel === 'OFF' && item.shift_label) {
          byDate[date].shiftLabel = item.shift_label
        }
      }

      const entries: SleepHistoryDay[] = Object.entries(byDate)
        .map(([date, v]) => ({
          date,
          totalMinutes: v.totalMinutes,
          shiftLabel: v.shiftLabel,
        }))
        .sort((a, b) => (a.date < b.date ? 1 : -1))

      setHistoryDays(entries)
      setSelectedHistoryDate((prev) => prev ?? entries[0]?.date ?? null)
    } catch (err) {
      console.error('[ShiftWorkerSleepPage] history fetch error:', err)
      setHistoryDays([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSleepHistory()
  }, [fetchSleepHistory])

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
      await Promise.all([
        fetchShiftedDays(false),
        fetchSevenDayChart(),
        fetchSleepHistory(),
        fetchShifts(),
        fetchWeekSleepOverview(),
      ])
      void authedFetch('/api/shift-rhythm?force=true').catch(() => {})
      void authedFetch('/api/sleep/tonight-target').catch(() => {})
      router.refresh()
    } catch (err) {
      console.error('[ShiftWorkerSleepPage] refresh error:', err)
    }
  }, [fetchShiftedDays, fetchSevenDayChart, fetchSleepHistory, fetchShifts, fetchWeekSleepOverview, router])

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
  const sources = new Set<string>()
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

    if (s.source) {
      sources.add(s.source)
    }

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

  let sourceSummary: 'none' | 'manual' | 'wearable' | 'mixed' = 'none'
  if (sources.size === 1) {
    const onlySource = Array.from(sources)[0]
    sourceSummary = onlySource === 'manual' ? 'manual' : 'wearable'
  } else if (sources.size > 1) {
    sourceSummary = 'mixed'
  }

  const sleepDebtMinutes = adjustedTargetMinutes > 0 ? Math.max(0, adjustedTargetMinutes - totalMinutes) : null
  const smartInsight = t(
    getShiftAwareInsightKey({
      shiftLabel: shiftForDay,
      totalMinutes,
      targetMinutes: adjustedTargetMinutes,
      primaryMinutes,
      napMinutes,
      dominantType,
      sourceSummary,
      sleepDebtMinutes,
      circadianAlignment,
    }),
  )
  const shiftedDayEnd = selectedDayData
    ? new Date(new Date(selectedDayData.shiftedDayStart).getTime() + 24 * 60 * 60 * 1000).toISOString()
    : ''

  const calendarTimelineStart = `${calendarFocusYmd}T00:00:00`
  const calendarTimelineEnd = `${calendarFocusYmd}T23:59:59.999`
  const timelineSessions = useCalendarOverview
    ? (calendarOverviewRow?.sessions ?? [])
    : (selectedDayData?.sessions ?? [])
  const showSleepTimeline =
    timelineSessions.length > 0 &&
    (useCalendarOverview ? Boolean(calendarOverviewRow) : Boolean(selectedDayData))

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

  const selectedHistory =
    historyDays.find((d) => d.date === selectedHistoryDate) || historyDays[0] || null

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
        <h1 className="text-xs font-semibold tracking-[0.22em] text-[var(--text-soft)] uppercase">
          {t('sleepSW.pageTitle')}
        </h1>
      </div>

      <ShiftSleepOverviewCard
        totalMinutes={totalMinutes}
        targetMinutes={adjustedTargetMinutes}
        primaryMinutes={primaryMinutes}
        napMinutes={napMinutes}
        sourceSummary={sourceSummary}
        dominantType={dominantType}
        shiftLabel={shiftForDay}
        hasWearableConnection={hasWearableConnection}
        lastSyncAt={lastWearableSyncAt ?? latestWearableSyncAt}
        isWearableSyncing={isWearableSyncing}
        sleepDebtMinutes={sleepDebtMinutes}
        circadianAlignment={circadianAlignment}
        smartInsight={smartInsight}
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

      {/* Sleep metrics card */}
      <SleepMetricsCard
        targetHours={sleepGoalHours ?? 7.5}
        targetLoading={sleepGoalHours == null}
        week={weekSleepOverview}
      />

      {/* Weekly sleep debt (Google Fit style) */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4">
        <SleepDebtCard week={weekSleepOverview} />
      </section>

      {/* Sleep Timeline Bar */}
      {showSleepTimeline && (
        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4">
          <h2 className="mb-3 text-xs font-semibold tracking-[0.16em] uppercase text-[var(--text-muted)]">
            {t('sleepSW.timelineTitle')}
          </h2>
          <SleepTimelineBar
            sessions={timelineSessions}
            shiftedDayStart={useCalendarOverview ? calendarTimelineStart : selectedDayData!.shiftedDayStart}
            shiftedDayEnd={useCalendarOverview ? calendarTimelineEnd : shiftedDayEnd}
            shiftLabel={shiftForDay}
            onSessionClick={(session) => setEditingSession(session)}
          />
        </section>
      )}

      {/* 30-day sleep guide */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-[var(--text-main)]">
              {t('sleepSW.last30Title')}
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              {t('sleepSW.last30Sub')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {historyDays.length > 0 && (
              <select
                className="rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-1 text-xs text-[var(--text-soft)]"
                value={selectedHistory?.date ?? historyDays[0].date}
                onChange={(e) => setSelectedHistoryDate(e.target.value)}
              >
                {historyDays.map((d) => {
                  const dateObj = new Date(d.date + 'T12:00:00')
                  const label = dateObj.toLocaleDateString(dateLocale, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })
                  const shift = d.shiftLabel && d.shiftLabel !== 'OFF' ? ` · ${d.shiftLabel}` : ''
                  return (
                    <option key={d.date} value={d.date}>
                      {label}{shift}
                    </option>
                  )
                })}
              </select>
            )}
            <Link
              href="/sleep/history"
              className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--card)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-soft)] hover:bg-[var(--card-subtle)]"
            >
              {t('sleepSW.editLogs')}
            </Link>
          </div>
        </div>

        {historyLoading && !selectedHistory ? (
          <div className="py-6 space-y-2">
            <div className="h-4 w-32 bg-slate-200/70 dark:bg-slate-700/60 rounded animate-pulse" />
            <div className="h-3 w-full bg-slate-200/70 dark:bg-slate-700/60 rounded animate-pulse" />
          </div>
        ) : selectedHistory ? (
          (() => {
            const rating = getHistoryRating(selectedHistory.totalMinutes)
            const hours = (selectedHistory.totalMinutes / 60) || 0
            const toneClasses =
              rating.tone === 'good'
                ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200'
                : rating.tone === 'ok'
                ? 'bg-sky-50/80 text-sky-700 border-sky-200'
                : rating.tone === 'warn'
                ? 'bg-amber-50/80 text-amber-700 border-amber-200'
                : rating.tone === 'bad'
                ? 'bg-rose-50/80 text-rose-700 border-rose-200'
                : 'bg-slate-50/80 text-slate-700 border-slate-200'

            return (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-[var(--text-muted)]">
                      {t('sleepSW.totalSleepShiftedDay')}
                    </p>
                    <p className="mt-0.5 text-2xl font-semibold text-[var(--text-main)]">
                      {hours.toFixed(1)}h
                    </p>
                  </div>
                  {selectedHistory.shiftLabel && selectedHistory.shiftLabel !== 'OFF' && (
                    <span className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-2.5 py-0.5 text-[10px] text-[var(--text-soft)]">
                      {selectedHistory.shiftLabel}
                    </span>
                  )}
                </div>
                <div
                  className={`rounded-2xl px-3 py-2 text-[11px] font-medium border ${toneClasses}`}
                >
                  <p className="text-[11px] mb-0.5">{rating.label}</p>
                  <p className="text-[11px] font-normal opacity-90">{rating.message}</p>
                </div>
              </div>
            )
          })()
        ) : (
          <p className="text-xs text-[var(--text-muted)]">
            {t('sleepSW.historyEmpty')}
          </p>
        )}
      </section>

      {/* Sleep stages snapshot (de-emphasized) */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-5 py-4">
        <div className="mb-3">
          <h2 className="text-xs font-semibold tracking-[0.14em] uppercase text-[var(--text-muted)]">
            {t('sleepSW.stagesTitle')}
          </h2>
          <p className="mt-1 text-[11px] text-[var(--text-soft)]">
            {t('sleepSW.stagesSub')}
          </p>
        </div>
        <SleepStageGrid />
      </section>

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

