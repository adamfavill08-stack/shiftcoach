'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronLeft, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/providers/language-provider'
import { LogSleepModal } from './LogSleepModal'
import { SleepEditModal } from './SleepEditModal'
import { DeleteSleepConfirmModal } from './DeleteSleepConfirmModal'
import { LastWorkBlockCard } from './LastWorkBlockCard'
import { deriveSleepMotivationBand, SleepMotivationCard } from './SleepMotivationCard'
import { ShiftSleepOverviewCard } from './ShiftSleepOverviewCard'
import { SleepSessionList } from './SleepSessionList'
import { SuggestedSleepPlanCard } from './SuggestedSleepPlanCard'
import type { SleepLogInput, SleepPlanPreferences, SleepType } from '@/lib/sleep/types'
import { estimateShiftRowBounds, type ShiftRowInput } from '@/lib/shift-context/resolveShiftContext'
import {
  computeNightShiftSleepPlan,
  DEFAULT_TARGET_SLEEP_H,
  MAX_COMMUTE_MINUTES,
  PREP_BEFORE_NEXT_SHIFT,
  type CaffeineSensitivity,
} from '@/lib/sleep/nightShiftSleepPlan'
import {
  coercePostNightSleepString,
  resolvePostNightPreferredStartForSleepPlan,
} from '@/lib/sleep/postNightSleepHabit'
import { buildForwardPostNightPreviewSession } from '@/lib/sleep/forwardPostNightPlanPreview'
import { resolveRotaContextForSleepPlan } from '@/lib/sleep/resolveRotaForSleepPlan'
import {
  pickDefaultShiftedDay,
  formatYmdInTimeZone,
  addCalendarDaysToYmd,
  rowCountsAsPrimarySleep,
  type SleepBarPoint,
} from '@/lib/sleep/utils'
import { toShiftType } from '@/lib/shifts/toShiftType'
import { authedFetch } from '@/lib/supabase/authedFetch'
import { notifySleepLogsUpdated } from '@/lib/circadian/circadianAgent'
import { isAndroidNativeHealthConnectShell } from '@/lib/native/healthConnectDeviceSyncEligibility'
import { autoSyncHealthConnectIfEligible } from '@/lib/native/autoSyncHealthConnectIfEligible'

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

/** Full session length from timestamps (7-day API clips `durationHours` per civil day). */
function fullSleepSessionMinutes(s: Pick<SleepSession, 'start_at' | 'end_at'>): number {
  const a = Date.parse(s.start_at)
  const b = Date.parse(s.end_at)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0
  return Math.round((b - a) / 60000)
}

/** True if rota marks a night shift on sleep start/end day or the civil day before each (post-night sleep). */
function rosterNightNearSleepSession(
  shiftByDate: Map<string, string>,
  startAt: string,
  endAt: string,
  timeZone: string,
): boolean {
  const startYmd = formatYmdInTimeZone(new Date(startAt), timeZone)
  const endYmd = formatYmdInTimeZone(new Date(endAt), timeZone)
  const ymds = new Set([
    startYmd,
    endYmd,
    addCalendarDaysToYmd(startYmd, -1),
    addCalendarDaysToYmd(endYmd, -1),
  ])
  for (const ymd of ymds) {
    if (toShiftType(shiftByDate.get(ymd), null) === 'night') return true
  }
  return false
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

const MS_MIN = 60_000

/** Wake-by time before tonight’s night shift (prep + commute), when that shift starts after logged sleep ended. */
function forcedLatestWakeBeforeTonightsNight(
  primarySleepEndMs: number,
  planYmd: string,
  rows: ShiftRowInput[],
  commuteMinutes: number | null,
  sleepPlanTimeZone: string,
): number | null {
  const row = rows.find((r) => String(r.date ?? '').slice(0, 10) === planYmd)
  if (!row) return null
  const lab = String(row.label ?? '').toUpperCase()
  const st = toShiftType(row.label ?? undefined, row.start_ts ?? null)
  if (st !== 'night' && !lab.includes('NIGHT')) return null
  const { start } = estimateShiftRowBounds(row, new Date(), sleepPlanTimeZone)
  const dutyStart = start.getTime()
  if (!Number.isFinite(dutyStart) || dutyStart <= primarySleepEndMs) return null
  const raw =
    typeof commuteMinutes === 'number' && Number.isFinite(commuteMinutes) && commuteMinutes > 0
      ? Math.round(commuteMinutes)
      : 25
  const c = Math.min(MAX_COMMUTE_MINUTES, Math.max(0, raw))
  return dutyStart - PREP_BEFORE_NEXT_SHIFT * MS_MIN - c * MS_MIN
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

/** After civil midnight, keep “Your plan” on yesterday until this long after yesterday’s suggested main sleep start. */
const SLEEP_PLAN_SCOPE_PIN_MS = 3 * 60 * 60 * 1000

/**
 * Sessions fed into the sleep plan for a given civil `ymd`. Same rules as the former “today-only”
 * picker: widen to prior days when the calendar row has no primary sleep (post–night shift).
 */
function pickPlanSessionsForCivilYmd(
  ymd: string,
  sevenDayCalendarDays: Array<{ date: string; totalMinutes: number; sessions?: SleepSession[] }>,
  shiftedDays: ShiftedDay[],
): SleepSession[] {
  const fromWeek = sevenDayCalendarDays.find((d) => d.date === ymd)

  const hasPrimary = (list: SleepSession[]) =>
    list.some(
      (s) =>
        !!s?.start_at &&
        !!s?.end_at &&
        rowCountsAsPrimarySleep({ type: s.type }),
    )

  const dedupeSessions = (lists: SleepSession[][]) => {
    const byKey = new Map<string, SleepSession>()
    for (const list of lists) {
      for (const s of list) {
        if (!s?.start_at || !s?.end_at) continue
        const key =
          s.id != null && String(s.id).trim() !== '' ? String(s.id) : `${s.start_at}|${s.end_at}`
        byKey.set(key, s)
      }
    }
    return [...byKey.values()]
  }

  if (sevenDayCalendarDays.length > 0) {
    const todaySess = fromWeek !== undefined ? (fromWeek.sessions ?? []) : []
    if (hasPrimary(todaySess)) return todaySess

    const y1 = addCalendarDaysToYmd(ymd, -1)
    const y2 = addCalendarDaysToYmd(ymd, -2)
    const row1 = sevenDayCalendarDays.find((d) => d.date === y1)
    const row2 = sevenDayCalendarDays.find((d) => d.date === y2)
    const mergedBack = dedupeSessions([row2?.sessions ?? [], row1?.sessions ?? [], todaySess])
    if (hasPrimary(mergedBack)) return mergedBack

    const allWeek = sevenDayCalendarDays.flatMap((d) => d.sessions ?? [])
    const allShifted = shiftedDays.flatMap((d) => d.sessions ?? [])
    const wide = dedupeSessions([allShifted, allWeek])
    if (hasPrimary(wide)) return wide

    return mergedBack.length > 0 ? mergedBack : todaySess
  }

  const shifted = shiftedDays.find((d) => d.date === ymd)
  return shifted?.sessions ?? []
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
  const [logModalStart, setLogModalStart] = useState<Date | null>(null)
  const [logModalEnd, setLogModalEnd] = useState<Date | null>(null)
  const [editingSession, setEditingSession] = useState<SleepSession | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [shiftByDate, setShiftByDate] = useState<Map<string, string>>(new Map())
  const [shiftPlanRows, setShiftPlanRows] = useState<ShiftRowInput[]>([])
  const [sleepTab, setSleepTab] = useState<'overview' | 'plan'>('overview')
  /** Collapsible sleep entries — default open so the list matches prior always-visible behaviour. */
  const [sleepEntriesOpen, setSleepEntriesOpen] = useState(true)
  const [planCommuteMinutes, setPlanCommuteMinutes] = useState<number | null>(null)
  const [planCaffeineSensitivity, setPlanCaffeineSensitivity] =
    useState<CaffeineSensitivity>('medium')
  const [sleepGoalHours, setSleepGoalHours] = useState<number | null>(null)
  const [hasWearableConnection, setHasWearableConnection] = useState(false)
  const [lastWearableSyncAt, setLastWearableSyncAt] = useState<number | null>(null)
  const [isWearableSyncing, setIsWearableSyncing] = useState(false)
  const [heroActionError, setHeroActionError] = useState<string | null>(null)
  const [profileFirstName, setProfileFirstName] = useState<string | null>(null)
  /** Onboarding post–night sleep clock (HH:mm) — drives suggested main sleep start. */
  const [postNightSleepRaw, setPostNightSleepRaw] = useState<string | null>(null)
  /** Profile `tz` when set — matches onboarding wall times better than browser default. */
  const [profileTimeZone, setProfileTimeZone] = useState<string | null>(null)
  const [hcSleepHint, setHcSleepHint] = useState<'perm' | 'no_records' | null>(null)
  /** Bumps every minute so the pinned “Your plan” scope can roll forward at sleepStart + 3h. */
  const [sleepPlanClockTick, setSleepPlanClockTick] = useState(0)

  const selectedDayRef = useRef<string | null>(null)
  useEffect(() => {
    selectedDayRef.current = selectedDay
  }, [selectedDay])

  const userTimeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  )

  const sleepPlanTimeZone = useMemo(() => profileTimeZone ?? userTimeZone, [profileTimeZone, userTimeZone])

  // Fetch shifted day sleep data
  const fetchShiftedDays = useCallback(async (isInitial = false) => {
    const controller = new AbortController()
    const slowTimer = window.setTimeout(() => controller.abort(), 22_000)
    try {
      if (isInitial) setLoading(true)
      const tz = encodeURIComponent(userTimeZone)
      /** 7 shifted buckets keeps the handler fast; 7-day chart still loads from `/api/sleep/7days`. */
      const res = await authedFetch(`/api/sleep/24h-grouped?days=7&tz=${tz}`, {
        cache: 'no-store',
        signal: controller.signal,
      })

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
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.warn('[ShiftWorkerSleepPage] 24h-grouped fetch aborted (timeout)')
      } else {
        console.error('[ShiftWorkerSleepPage] Error:', err)
      }
      setShiftedDays([])
    } finally {
      window.clearTimeout(slowTimer)
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
      const prefs = json?.profile?.preferences
      if (prefs && typeof prefs === 'object') {
        const p = prefs as SleepPlanPreferences & Record<string, unknown>
        const c = p.sleepPlanCommuteMinutes
        if (typeof c === 'number' && Number.isFinite(c) && c > 0 && c <= 180) {
          setPlanCommuteMinutes(Math.round(c))
        } else {
          setPlanCommuteMinutes(null)
        }
        const sens = p.caffeineSensitivity
        if (sens === 'low' || sens === 'medium' || sens === 'high') {
          setPlanCaffeineSensitivity(sens)
        } else {
          setPlanCaffeineSensitivity('medium')
        }
      } else {
        setPlanCommuteMinutes(null)
        setPlanCaffeineSensitivity('medium')
      }
      const rawName = json?.profile?.name
      if (typeof rawName === 'string' && rawName.trim()) {
        const first = rawName.trim().split(/\s+/)[0]
        setProfileFirstName(first || null)
      } else {
        setProfileFirstName(null)
      }
      const rawTz = json?.profile?.tz
      if (typeof rawTz === 'string' && rawTz.trim()) {
        setProfileTimeZone(rawTz.trim())
      } else {
        setProfileTimeZone(null)
      }
      const pns = coercePostNightSleepString(json?.profile?.post_night_sleep)
      setPostNightSleepRaw(pns)
    } catch (err) {
      console.error('[ShiftWorkerSleepPage] profile fetch error:', err)
    }
  }, [])

  useEffect(() => {
    void fetchProfileSleepAndName()
  }, [fetchProfileSleepAndName])

  const handleCaffeineSensitivityChange = useCallback(
    async (next: CaffeineSensitivity) => {
      setPlanCaffeineSensitivity(next)
      try {
        const res = await authedFetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferences: { caffeineSensitivity: next } }),
        })
        if (!res.ok) {
          void fetchProfileSleepAndName()
        }
      } catch {
        void fetchProfileSleepAndName()
      }
    },
    [fetchProfileSleepAndName],
  )

  const fetchShifts = useCallback(async () => {
    try {
      const res = await authedFetch('/api/shifts?days=45&futureDays=30', { cache: 'no-store' })
      if (!res.ok) return

      const json = await res.json()
      const rows: any[] = json?.shifts ?? json?.items ?? []
      const map = new Map<string, string>()
      const planRows: ShiftRowInput[] = []
      for (const row of rows) {
        if (row?.date) {
          map.set(row.date, row.label || row.shift_label || 'OFF')
          planRows.push({
            date: row.date,
            label: row.label || row.shift_label || 'OFF',
            start_ts: row.start_ts ?? null,
            end_ts: row.end_ts ?? null,
          })
        }
      }
      setShiftByDate(map)
      setShiftPlanRows(planRows)
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

  useEffect(() => {
    const tmr = window.setTimeout(() => {
      autoSyncHealthConnectIfEligible('sleep-page-open')
    }, 800)
    return () => window.clearTimeout(tmr)
  }, [])

  useEffect(() => {
    if (!isAndroidNativeHealthConnectShell()) return
    if (loading && shiftedDays.length === 0) return
    let cancelled = false
    void (async () => {
      try {
        const { ShiftCoachHealthConnect } = await import('@/lib/native/shiftCoachHealthConnect')
        const st = await ShiftCoachHealthConnect.getStatus()
        if (cancelled) return
        if (!st.available) {
          setHcSleepHint(null)
          return
        }
        if (st.sleepReadPermissionGranted === false) {
          setHcSleepHint('perm')
          return
        }
        const zeroAt = sessionStorage.getItem('shiftcoach_hc_sleep_read_zero_at')
        const recentZero =
          zeroAt != null &&
          !Number.isNaN(Number(zeroAt)) &&
          Date.now() - Number(zeroAt) < 25 * 60 * 1000
        const hasHcSleep = shiftedDays.some((d) =>
          (d.sessions ?? []).some((s) => String(s.source ?? '') === 'health_connect'),
        )
        if (st.hasPermissions && recentZero && !hasHcSleep) {
          setHcSleepHint('no_records')
          return
        }
        setHcSleepHint(null)
      } catch {
        if (!cancelled) setHcSleepHint(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [shiftedDays, loading])

  /** Civil “today” in sleep-plan TZ — overview chart highlight (pinned plan may stay on prior day). */
  const chartHighlightYmd = useMemo(
    () => formatYmdInTimeZone(new Date(), sleepPlanTimeZone),
    [sleepPlanTimeZone],
  )

  const yesterdayPlanAnchorYmd = useMemo(
    () => addCalendarDaysToYmd(chartHighlightYmd, -1),
    [chartHighlightYmd],
  )

  useEffect(() => {
    const id = window.setInterval(() => {
      setSleepPlanClockTick((n) => n + 1)
    }, 60_000)
    return () => window.clearInterval(id)
  }, [])

  /** Hero shows full latest primary sleep; calendar-day `durationHours` slices under-count overnight sleep. */
  const lastSleepHero = useMemo(() => {
    const byId = new Map<string, SleepSession>()
    for (const d of shiftedDays) {
      for (const s of d.sessions ?? []) {
        if (s?.id && s.start_at && s.end_at) byId.set(String(s.id), s)
      }
    }
    for (const d of sevenDayCalendarDays) {
      for (const s of d.sessions ?? []) {
        if (s?.id && s.start_at && s.end_at) byId.set(String(s.id), s)
      }
    }
    const list = [...byId.values()]
    const primaries = list.filter((s) => rowCountsAsPrimarySleep({ type: s.type }))
    const pool = primaries.length > 0 ? primaries : list
    if (pool.length === 0) return null
    const best = [...pool].sort((a, b) => Date.parse(b.end_at) - Date.parse(a.end_at))[0]
    const minutes = fullSleepSessionMinutes(best)
    if (minutes <= 0) return null
    return {
      minutes,
      dateKey: formatYmdInTimeZone(new Date(best.start_at), userTimeZone),
      postShiftAfterNight: rosterNightNearSleepSession(shiftByDate, best.start_at, best.end_at, userTimeZone),
    }
  }, [shiftedDays, sevenDayCalendarDays, userTimeZone, shiftByDate])

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

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null
    const bump = () => {
      if (debounce != null) clearTimeout(debounce)
      debounce = setTimeout(() => {
        debounce = null
        void refreshSleepPageData()
      }, 300)
    }
    window.addEventListener('sleep-refreshed', bump)
    window.addEventListener('wearables-synced', bump as EventListener)
    return () => {
      window.removeEventListener('sleep-refreshed', bump)
      window.removeEventListener('wearables-synced', bump as EventListener)
      if (debounce != null) clearTimeout(debounce)
    }
  }, [refreshSleepPageData])

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

  const computeSleepPlanForScope = useCallback(
    (scopeYmd: string, sessions: SleepSession[], targetSleepMinutes: number) => {
      const sessionLikesBase = sessions.map((s) => ({
        start_at: s.start_at,
        end_at: s.end_at,
        type: s.type,
      }))
      const rosterLab = String(shiftByDate.get(scopeYmd) ?? '').toUpperCase()
      const rosterNightOnScope =
        rosterLab.includes('NIGHT') || toShiftType(shiftByDate.get(scopeYmd), null) === 'night'
      const rawCommute =
        typeof planCommuteMinutes === 'number' && Number.isFinite(planCommuteMinutes) && planCommuteMinutes > 0
          ? Math.round(planCommuteMinutes)
          : 25
      const forwardPreview = buildForwardPostNightPreviewSession({
        scopeYmd,
        shifts: shiftPlanRows,
        timeZone: sleepPlanTimeZone,
        nowMs: Date.now(),
        commuteMinutes: rawCommute,
        targetSleepMinutes,
        rosterNightOnScope,
        existingSessionLikes: sessionLikesBase,
      })
      const sessionLikes = forwardPreview ? [forwardPreview, ...sessionLikesBase] : sessionLikesBase
      const rota = resolveRotaContextForSleepPlan(sessionLikes, shiftPlanRows, {
        commuteMinutes: planCommuteMinutes,
        timeZone: sleepPlanTimeZone,
        postNightSleepRaw,
      })
      if (rota.state !== 'ok') {
        return { rota, plan: null as ReturnType<typeof computeNightShiftSleepPlan> | null }
      }
      const forcedLatestWakeMs = forcedLatestWakeBeforeTonightsNight(
        rota.primarySleep.endMs,
        scopeYmd,
        shiftPlanRows,
        planCommuteMinutes,
        sleepPlanTimeZone,
      )
      const postNightPreferredStartUtcMs = resolvePostNightPreferredStartForSleepPlan({
        shiftJustEnded: rota.shiftJustEnded,
        restAnchorSynthetic: rota.restAnchorSynthetic,
        chartHighlightYmd: scopeYmd,
        postNightSleepRaw,
        timeZone: sleepPlanTimeZone,
      })
      const plan = computeNightShiftSleepPlan({
        shiftJustEnded: rota.shiftJustEnded,
        nextShift: rota.nextShift,
        commuteMinutes: rota.commuteMinutes,
        targetSleepMinutes,
        caffeineSensitivity: planCaffeineSensitivity,
        loggedMainSleep: rota.primarySleep,
        loggedNaps: rota.loggedNaps,
        timeZone: sleepPlanTimeZone,
        restAnchorSynthetic: rota.restAnchorSynthetic,
        sleepDebtMinutes: sleepDebtMinutes ?? undefined,
        forcedLatestWakeMs,
        postNightPreferredStartUtcMs,
        postNightSleepRaw: coercePostNightSleepString(postNightSleepRaw ?? null),
      })
      return { rota, plan }
    },
    [
      shiftPlanRows,
      planCommuteMinutes,
      planCaffeineSensitivity,
      sleepPlanTimeZone,
      sleepDebtMinutes,
      postNightSleepRaw,
      shiftByDate,
    ],
  )

  const planSessionsYesterday = useMemo(
    () => pickPlanSessionsForCivilYmd(yesterdayPlanAnchorYmd, sevenDayCalendarDays, shiftedDays),
    [yesterdayPlanAnchorYmd, sevenDayCalendarDays, shiftedDays],
  )

  const planTargetYesterdayMinutes = useMemo(() => {
    const base = sleepGoalHours
      ? Math.round(sleepGoalHours * 60)
      : Math.round(DEFAULT_TARGET_SLEEP_H * 60)
    return getShiftAdjustedTargetMinutes(base, shiftByDate.get(yesterdayPlanAnchorYmd) || 'OFF')
  }, [sleepGoalHours, shiftByDate, yesterdayPlanAnchorYmd])

  const yesterdaySleepPlanPayload = useMemo(
    () =>
      computeSleepPlanForScope(
        yesterdayPlanAnchorYmd,
        planSessionsYesterday,
        planTargetYesterdayMinutes,
      ),
    [
      computeSleepPlanForScope,
      yesterdayPlanAnchorYmd,
      planSessionsYesterday,
      planTargetYesterdayMinutes,
    ],
  )

  const sleepPlanScopeYmd = useMemo(() => {
    void sleepPlanClockTick
    const p = yesterdaySleepPlanPayload.plan
    if (
      p?.ok &&
      p.suggestedSleepStartMs != null &&
      Number.isFinite(p.suggestedSleepStartMs) &&
      Date.now() < p.suggestedSleepStartMs + SLEEP_PLAN_SCOPE_PIN_MS
    ) {
      return yesterdayPlanAnchorYmd
    }
    return chartHighlightYmd
  }, [
    chartHighlightYmd,
    yesterdayPlanAnchorYmd,
    yesterdaySleepPlanPayload,
    sleepPlanClockTick,
  ])

  const planSessionsForSleepPlan = useMemo(
    () => pickPlanSessionsForCivilYmd(sleepPlanScopeYmd, sevenDayCalendarDays, shiftedDays),
    [sleepPlanScopeYmd, sevenDayCalendarDays, shiftedDays],
  )

  const planTargetSleepMinutes = useMemo(() => {
    const base = sleepGoalHours
      ? Math.round(sleepGoalHours * 60)
      : Math.round(DEFAULT_TARGET_SLEEP_H * 60)
    return getShiftAdjustedTargetMinutes(base, shiftByDate.get(sleepPlanScopeYmd) || 'OFF')
  }, [sleepGoalHours, shiftByDate, sleepPlanScopeYmd])

  const sleepPlanPayload = useMemo(
    () =>
      computeSleepPlanForScope(
        sleepPlanScopeYmd,
        planSessionsForSleepPlan,
        planTargetSleepMinutes,
      ),
    [computeSleepPlanForScope, sleepPlanScopeYmd, planSessionsForSleepPlan, planTargetSleepMinutes],
  )

  const sleepListLoading = loading && shiftedDays.length === 0

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

      {sleepListLoading ? (
        <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-2 text-xs text-[var(--text-muted)]">
          {t('sleepSW.loading')}
        </p>
      ) : null}

      <div className="flex rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] p-0.5 text-xs font-medium">
        <button
          type="button"
          onClick={() => setSleepTab('overview')}
          className={`flex-1 rounded-full px-3 py-1.5 transition ${
            sleepTab === 'overview'
              ? 'bg-[var(--card)] text-[var(--text-main)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          {t('sleepPlan.tabOverview')}
        </button>
        <button
          type="button"
          onClick={() => setSleepTab('plan')}
          className={`flex-1 rounded-full px-3 py-1.5 transition ${
            sleepTab === 'plan'
              ? 'bg-[var(--card)] text-[var(--text-main)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          {t('sleepPlan.tabYourPlan')}
        </button>
      </div>

      {sleepTab === 'plan' ? (
        <div className="space-y-4">
          {sleepPlanPayload.rota.state !== 'ok' ? (
            <section className="rounded-xl border border-sky-200/60 bg-gradient-to-b from-sky-50 via-white to-slate-50/90 px-5 py-5 shadow-sm dark:border-slate-700/80 dark:from-slate-900/70 dark:via-[var(--card)] dark:to-slate-950/60">
              <h2 className="text-xl font-bold tracking-tight text-[var(--text-main)]">{t('sleepPlan.title')}</h2>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('sleepPlan.scopeLine', { ymd: sleepPlanScopeYmd })}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {sleepPlanPayload.rota.reason === 'no_main_sleep'
                  ? t('sleepPlan.insufficient.noMain')
                  : sleepPlanPayload.rota.reason === 'no_shift_anchor'
                    ? t('sleepPlan.insufficient.noShift')
                    : t('sleepPlan.insufficient.noSessions')}
              </p>
            </section>
          ) : sleepPlanPayload.plan ? (
            <SuggestedSleepPlanCard
              timeZone={sleepPlanTimeZone}
              todayYmd={sleepPlanScopeYmd}
              rota={sleepPlanPayload.rota}
              plan={sleepPlanPayload.plan}
              targetSleepMinutes={planTargetSleepMinutes}
              caffeineSensitivity={planCaffeineSensitivity}
              onCaffeineSensitivityChange={handleCaffeineSensitivityChange}
            />
          ) : null}
        </div>
      ) : null}

      {sleepTab === 'overview' ? (
        <>
      {hcSleepHint ? (
        <p className="text-xs text-amber-800/90 dark:text-amber-200/90" role="status">
          {hcSleepHint === 'perm' ? t('sleepCard.hcSleepPermissionHint') : t('sleepCard.hcNoSleepRecordsHint')}
        </p>
      ) : null}
      <ShiftSleepOverviewCard
        totalMinutes={totalMinutes}
        heroTotalMinutes={lastSleepHero?.minutes ?? null}
        heroDateKey={lastSleepHero?.dateKey ?? null}
        heroPostShiftAfterNight={lastSleepHero?.postShiftAfterNight ?? false}
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

      <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] px-4 py-3">
        <button
          type="button"
          id="sleep-entries-toggle"
          aria-expanded={sleepEntriesOpen}
          aria-controls="sleep-entries-panel"
          onClick={() => setSleepEntriesOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t('sleepSW.loggedSessionsDropdown.summary', { count: sessions.length })}
          </span>
          {sleepEntriesOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-[var(--text-soft)] opacity-80" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-soft)] opacity-80" aria-hidden />
          )}
        </button>
        {sleepEntriesOpen ? (
          <div
            id="sleep-entries-panel"
            role="region"
            aria-labelledby="sleep-entries-toggle"
            className="mt-3 border-t border-[var(--border-subtle)] pt-3"
          >
            <SleepSessionList
              sessions={sessions.map((s) => ({
                id: s.id,
                start_at: s.start_at,
                end_at: s.end_at,
                type: s.type,
                durationHours: s.durationHours,
                quality: s.quality,
              }))}
              onEdit={(s) => {
                const full = sessions.find((x) => x.id === s.id)
                if (full) setEditingSession(full)
              }}
              onDelete={(id) => handleDeleteClick(id)}
            />
          </div>
        ) : null}
      </section>

      <LastWorkBlockCard timeZone={userTimeZone} authedFetch={authedFetch} />

      <SleepMotivationCard profileFirstName={profileFirstName} band={motivationBand} />
        </>
      ) : null}

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

