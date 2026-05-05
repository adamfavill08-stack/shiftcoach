'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { Capacitor } from '@capacitor/core'
import { ChevronLeft, PenLine, RefreshCw, Sparkles, Timer } from 'lucide-react'
import { useActivityToday } from '@/lib/hooks/useActivityToday'
import { useAuth } from '@/components/AuthProvider'
import { useTranslation } from '@/components/providers/language-provider'
import { useProfile } from '@/hooks/useProfile'
import { authedFetch } from '@/lib/supabase/authedFetch'
import {
  isAndroidNativeHealthConnectShell,
  isAndroidWithoutNativeHealthConnect,
} from '@/lib/native/healthConnectDeviceSyncEligibility'
import { runHealthConnectNativeSync } from '@/lib/native/runHealthConnectNativeSync'
import { persistHealthConnectNativeLinked } from '@/lib/native/wearablesHealthConnectPersisted'
import type { ShiftStepsDuringShiftDay } from '@/lib/activity/computeShiftStepsDuringShifts'
import { isoLocalDate } from '@/lib/shifts'
import { formatYmdInTimeZone } from '@/lib/sleep/utils'
import { ManualActivityHistorySection } from '@/components/activity/ManualActivityHistorySection'
import {
  AdaptiveMovementCard,
  buildAdaptiveMovementData,
  buildEmptyShiftMovementData,
  type Shift,
  type StepSample,
} from '@/components/activity/AdaptiveMovementCard'
import { ActivityHistory30Days } from '@/components/activity/ActivityHistory30Days'

function parseYmdLocal(ymd: string): Date {
  return new Date(ymd + 'T12:00:00')
}

/**
 * Samsung Health–style week chart: dotted goal lines, pill bars, weekend date tint,
 * highlighted “today” column with date chip.
 */
function DailyStepsChart({
  days,
  goalSteps,
  todayYmd,
  loading,
}: {
  days: { date: string; steps: number; hasData: boolean }[]
  goalSteps: number
  todayYmd: string
  loading: boolean
}) {
  const g = goalSteps > 0 ? goalSteps : 10000
  const mid = Math.round(g / 2)
  const innerH = 108
  const maxBar = innerH - 8
  const labelRowH = 40
  /** Today’s white column extends this far above the goal (10k) line; keep small to avoid a tall empty cap. */
  const pillExtendAboveGoalPx = 10
  const columnTotalH = pillExtendAboveGoalPx + innerH + labelRowH
  /** Narrow column: bar + label share this width so centers align (bar is slightly narrower inside). */
  const trackClass = 'flex w-7 max-w-full flex-col items-stretch'
  const barClass = 'w-6 shrink-0 rounded-full transition-all duration-300'

  if (loading) {
    return (
      <div className="w-full rounded-2xl px-3 py-4 animate-pulse" style={{ backgroundColor: 'transparent' }}>
        <div className="h-36 rounded-xl" style={{ backgroundColor: 'var(--ring-bg)' }} />
      </div>
    )
  }

  return (
    <div className="w-full rounded-2xl px-2 py-3 sm:px-3" style={{ backgroundColor: 'transparent' }}>
      <div className="flex gap-0.5 sm:gap-1">
        {/* Y-axis: spacer + bar zone (innerH) so 10k/5k sit on the dotted lines */}
        <div className="flex shrink-0 flex-col w-9 sm:w-10">
          <div style={{ height: pillExtendAboveGoalPx }} aria-hidden className="shrink-0" />
          <div className="relative overflow-visible" style={{ height: innerH }}>
            <span
              className="absolute right-1 top-0 -translate-y-1/2 text-[10px] font-medium tabular-nums leading-none text-emerald-600 dark:text-emerald-400"
            >
              {g.toLocaleString()}
            </span>
            <span
              className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-medium tabular-nums leading-none"
              style={{ color: 'var(--text-muted)' }}
            >
              {mid.toLocaleString()}
            </span>
          </div>
          <div style={{ height: labelRowH }} aria-hidden className="shrink-0" />
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Dotted guides: below pill extension, same innerH as Y-axis bar band */}
          <div
            className="pointer-events-none absolute left-0 right-0 z-0"
            style={{ top: pillExtendAboveGoalPx, height: innerH }}
          >
            <div
              className="absolute left-0 right-0 top-0 border-t-2 border-dotted border-emerald-500/65 dark:border-emerald-400/55"
            />
            <div
              className="absolute left-0 right-0 top-1/2 border-t-2 border-dotted opacity-80"
              style={{ borderColor: 'var(--text-muted)' }}
            />
          </div>

          {/* Equal-width columns: grid keeps today aligned with the rest */}
          <div className="relative z-[1] grid grid-cols-7 gap-1 sm:gap-1.5">
            {days.map((day) => {
              const isToday = day.date === todayYmd
              const dt = parseYmdLocal(day.date)
              const dayOfMonth = dt.getDate()
              const ratio = Math.min(1.25, day.steps > 0 ? day.steps / g : 0)
              const barH = day.steps > 0 ? Math.max(8, Math.round(ratio * maxBar)) : 6

              const barEl = (
                <div
                  className={barClass}
                  style={{
                    height: barH,
                    backgroundColor: isToday ? '#22c55e' : 'var(--ring-bg)',
                    opacity: isToday ? 1 : day.steps > 0 ? 1 : 0.55,
                  }}
                />
              )

              /** Today: date chip — high contrast on light column; teal on dark column. */
              const labelRow = isToday ? (
                <span
                  className="inline-flex min-h-9 items-center justify-center rounded-full bg-neutral-900 px-3 py-1.5 text-sm font-semibold tabular-nums leading-none text-white dark:bg-[#05afc5] dark:text-neutral-950"
                  title={day.date}
                >
                  {dayOfMonth}
                </span>
              ) : (
                <span
                  className="inline-flex min-h-[1.125rem] items-center justify-center text-[11px] font-medium tabular-nums leading-none"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {dayOfMonth}
                </span>
              )

              const track = (
                <div className={trackClass}>
                  <div className="flex w-full shrink-0 items-end justify-center" style={{ height: innerH }}>
                    {barEl}
                  </div>
                  <div
                    className="flex w-full shrink-0 items-center justify-center"
                    style={{ height: labelRowH }}
                  >
                    {labelRow}
                  </div>
                </div>
              )

              return (
                <div
                  key={day.date}
                  className="flex min-h-0 min-w-0 flex-col"
                  style={{ height: columnTotalH }}
                >
                  {isToday ? (
                    <div
                      className="flex h-full w-full min-w-0 flex-col items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-zinc-900/75 dark:shadow-none dark:ring-1 dark:ring-[#05afc5]/35"
                    >
                      <div
                        className="w-full shrink-0 bg-white dark:bg-zinc-900/75"
                        style={{ height: pillExtendAboveGoalPx }}
                        aria-hidden
                      />
                      {track}
                    </div>
                  ) : (
                    <>
                      <div style={{ height: pillExtendAboveGoalPx }} aria-hidden className="shrink-0" />
                      {track}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatClockHourLabel(isoOrMs: number | string, timeZone: string): string {
  const d = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs)
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  }).format(d)
}

function hourInTimeZone(iso: string, timeZone: string): number {
  const d = new Date(iso)
  const hourPart = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  })
    .formatToParts(d)
    .find((p) => p.type === 'hour')?.value
  const h = hourPart != null ? parseInt(hourPart, 10) : NaN
  return Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 0
}

function bucketsFromStepSamples(
  samples: Array<{ timestamp: string; steps: number }> | undefined,
  shiftStartIso: string | null | undefined,
  timeZone: string,
): number[] | null {
  if (!samples || samples.length === 0) return null

  const out = Array.from({ length: 24 }, () => 0)
  const shiftAnchorMs = shiftStartIso ? Date.parse(shiftStartIso) : NaN
  const useShiftAxis = Number.isFinite(shiftAnchorMs)
  let used = 0

  for (const sample of samples) {
    if (!sample || typeof sample.timestamp !== 'string') continue
    const t = Date.parse(sample.timestamp)
    if (!Number.isFinite(t)) continue
    const steps = typeof sample.steps === 'number' && Number.isFinite(sample.steps) ? Math.max(0, sample.steps) : 0

    if (useShiftAxis) {
      const idx = Math.floor((t - shiftAnchorMs) / (60 * 60 * 1000))
      if (idx >= 0 && idx < 24) {
        out[idx] += steps
        used++
      }
    } else {
      const h = hourInTimeZone(sample.timestamp, timeZone)
      out[h] += steps
      used++
    }
  }

  return used > 0 ? out : null
}

function StepsByTimeOfDayCard({
  stepSamples,
  stepsByHour,
  displayTotalSteps,
  loading,
  title,
  shiftStartIso,
  timeZone,
}: {
  stepSamples?: Array<{ timestamp: string; steps: number }>
  stepsByHour: number[] | undefined
  displayTotalSteps: number
  loading: boolean
  title: string
  /** When set, x-axis ticks are clock hours from shift start (matches shift-relative buckets from API). */
  shiftStartIso?: string | null
  /** IANA zone (same as activity API `tz`); falls back to device zone. */
  timeZone?: string | null
}) {
  const tz =
    typeof timeZone === 'string' && timeZone.trim().length > 0
      ? timeZone.trim()
      : Intl.DateTimeFormat().resolvedOptions().timeZone

  const buckets = useMemo(() => {
    const fromSamples = bucketsFromStepSamples(stepSamples, shiftStartIso, tz)
    const base = fromSamples ?? (stepsByHour && stepsByHour.length === 24 ? [...stepsByHour] : Array.from({ length: 24 }, () => 0))
    const s = base.reduce((a, x) => a + x, 0)
    if (
      s > 0 &&
      displayTotalSteps > 0 &&
      Math.abs(s - displayTotalSteps) > Math.max(2, displayTotalSteps * 0.015)
    ) {
      const f = displayTotalSteps / s
      for (let i = 0; i < 24; i++) base[i] = Math.round(base[i] * f)
      const drift = displayTotalSteps - base.reduce((a, x) => a + x, 0)
      let mi = 0
      for (let i = 1; i < 24; i++) if (base[i] > base[mi]) mi = i
      base[mi] = Math.max(0, base[mi] + drift)
    }
    return base
  }, [stepSamples, shiftStartIso, tz, stepsByHour, displayTotalSteps])

  const maxVal = useMemo(() => Math.max(1, ...buckets), [buckets])

  const shiftAnchorMs = shiftStartIso ? Date.parse(shiftStartIso) : NaN
  const useShiftAxis = Number.isFinite(shiftAnchorMs)

  const axisTickLabels = useMemo(() => {
    const slots = [0, 6, 12, 18] as const
    const H = 60 * 60 * 1000
    if (useShiftAxis) {
      return slots.map((s) => formatClockHourLabel(shiftAnchorMs + s * H, tz))
    }
    return ['0', '6', '12', '18']
  }, [useShiftAxis, shiftAnchorMs, tz])

  if (loading) {
    return (
      <div className="w-full rounded-xl border border-transparent bg-white px-5 py-4 shadow-sm dark:border-[var(--border-subtle)]">
        <div className="mb-4 h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
        <div className="flex h-[120px] items-end gap-0.5">
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className="min-w-0 flex-1 animate-pulse rounded-t-sm bg-slate-100 dark:bg-slate-700"
              style={{ height: `${18 + (i % 7) * 10}%` }}
            />
          ))}
        </div>
        <div className="mt-2 h-px w-full bg-slate-200 dark:bg-slate-600" />
        <div className="mt-1.5 flex justify-between">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-2 w-4 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full rounded-xl border border-transparent bg-white px-5 py-4 shadow-sm dark:border-[var(--border-subtle)]">
      <h3 className="mb-3 text-left text-sm font-medium text-slate-900">{title}</h3>
      <div
        className="flex h-[120px] items-end gap-0.5 sm:gap-1"
        role="img"
        aria-label={title}
      >
        {buckets.map((v, h) => (
          <div key={h} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <div
              className="w-full rounded-t-[2px] bg-emerald-500 transition-[height] duration-500"
              style={{
                height: `${(v / maxVal) * 100}%`,
                minHeight: v > 0 ? 3 : 0,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 border-t border-slate-200 pt-1.5 dark:border-[var(--border-subtle)]">
        <div className="flex justify-between text-[10px] font-medium tabular-nums text-slate-400">
          {axisTickLabels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
          <span className="opacity-80">(h)</span>
        </div>
      </div>
    </div>
  )
}

function ShiftStepsDuringShiftsCard({
  days,
  todayYmd,
  loading,
  title,
}: {
  days: ShiftStepsDuringShiftDay[]
  todayYmd: string
  loading: boolean
  title: string
}) {
  const innerH = 88
  const maxSteps = useMemo(() => Math.max(1, ...days.map((d) => d.steps)), [days])

  if (loading) {
    return (
      <div className="w-full rounded-xl border border-transparent bg-white px-5 py-4 shadow-sm dark:border-[var(--border-subtle)]">
        <div className="mb-4 h-4 w-52 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
        <div className="flex h-[88px] items-end justify-center gap-1 sm:gap-1.5">
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className="mx-auto w-full max-w-[22px] flex-1 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700"
              style={{ height: `${24 + (i % 5) * 10}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between px-0.5">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-2 w-3 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full rounded-xl border border-transparent bg-white px-5 py-4 shadow-sm dark:border-[var(--border-subtle)]">
      <h3 className="mb-3 text-left text-sm font-medium text-slate-900">{title}</h3>
      <div className="flex items-end justify-center gap-1 sm:gap-1.5" role="img" aria-label={title}>
        {days.map((d) => {
          const isToday = d.date === todayYmd
          const isOff = d.shiftType === 'off' || !d.hasWorkShift
          const ratio = d.steps / maxSteps
          const barH = !isOff ? Math.max(4, Math.round(ratio * (innerH - 8))) : 4
          return (
            <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-col items-center justify-end" style={{ height: innerH }}>
                <div
                  className="w-full max-w-[22px] rounded-full transition-all duration-300"
                  style={{
                    height: barH,
                    backgroundColor: isOff
                      ? 'var(--ring-bg)'
                      : d.hasData
                        ? '#22c55e'
                        : 'var(--ring-bg)',
                    opacity: isOff ? 0.5 : d.hasData ? 1 : 0.45,
                  }}
                />
              </div>
              <span
                className={`text-[11px] font-medium tabular-nums ${
                  isToday ? 'font-semibold text-slate-900' : 'text-slate-400'
                }`}
              >
                {d.dayLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ActivityAndStepsPage() {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.id ?? null)
  const { data, loading } = useActivityToday()
  const [syncingSteps, setSyncingSteps] = useState(false)
  const [syncStepsError, setSyncStepsError] = useState<string | null>(null)

  const handleSyncStepsFromHealth = useCallback(async () => {
    setSyncingSteps(true)
    setSyncStepsError(null)
    try {
      if (isAndroidWithoutNativeHealthConnect()) {
        setSyncStepsError(t('browse.activity.syncStepsRequiresApp'))
        return
      }

      if (isAndroidNativeHealthConnectShell()) {
        const syncResult = await runHealthConnectNativeSync('ActivityAndStepsPage/hero')
        const nativeSyncSucceeded =
          syncResult?.ok === true ||
          (typeof syncResult?.lastSyncedAt === 'string' && syncResult.lastSyncedAt.length > 0)
        if (!nativeSyncSucceeded) {
          throw new Error('sync_not_ok')
        }
        const ts = syncResult.lastSyncedAt ? new Date(syncResult.lastSyncedAt).getTime() : Date.now()
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('wearables:lastSyncedAt', String(ts))
        }
        persistHealthConnectNativeLinked()
        window.dispatchEvent(new CustomEvent('wearables-synced', { detail: { ts } }))
        window.dispatchEvent(new CustomEvent('sleep-refreshed'))
      } else {
        const res = await authedFetch('/api/wearables/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(typeof body?.error === 'string' ? body.error : 'sync_failed')
        }
        if (body?.error === 'no_wearable_connection') {
          setSyncStepsError(t('browse.activity.syncStepsFailed'))
        } else {
          const ts = Date.now()
          window.dispatchEvent(new CustomEvent('wearables-synced', { detail: { ts } }))
          window.dispatchEvent(new CustomEvent('sleep-refreshed'))
        }
      }
    } catch (err: unknown) {
      console.warn('[ActivityAndStepsPage] Health sync', err)
      const code =
        err && typeof err === 'object' && 'code' in err ? String((err as { code?: unknown }).code) : ''
      if (code === 'health_connect_permissions') {
        setSyncStepsError(t('browse.activity.syncStepsNeedHcPermissions'))
      } else if (code === 'health_connect_auth_missing') {
        setSyncStepsError(t('browse.activity.syncStepsSignInAgain'))
      } else {
        setSyncStepsError(t('browse.activity.syncStepsFailed'))
      }
    } finally {
      setSyncingSteps(false)
    }
  }, [t])

  const manualHistoryCivilYmd = useMemo(() => {
    const tz =
      typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'UTC'
    return formatYmdInTimeZone(new Date(), tz)
  }, [])

  const firstName = profile?.name?.trim().split(/\s+/)[0] ?? ''
  const motivationReady = !authLoading && !profileLoading
  const motivationText = firstName
    ? t('browse.activity.motivationNamed', { name: firstName })
    : t('browse.activity.motivationAnonymous')

  const intel = data.activityIntelligence
  const activityDaySteps = intel?.activityDaySteps ?? (loading ? 0 : data.steps ?? 0)
  const dailyGoal = data.adaptedStepGoal ?? data.goal ?? data.stepTarget ?? 10000

  const stepsSourceLabel = useMemo(() => {
    if (loading) return ''
    const sot = data.activityTotalsBreakdown?.sourceOfTruth
    if (sot === 'wearable') return t('browse.activity.stepsSourceWearable')
    if (sot === 'manual') return t('browse.activity.stepsSourceManual')
    const src = String(data.source ?? '').toLowerCase()
    if (src === 'manual' || src.includes('manual')) return t('browse.activity.stepsSourceManual')
    if (activityDaySteps > 0 && src && src !== 'unknown' && src !== 'not connected') {
      return t('browse.activity.stepsSourceWearable')
    }
    return t('browse.activity.stepsSourceNone')
  }, [loading, data.activityTotalsBreakdown?.sourceOfTruth, data.source, activityDaySteps, t])

  const intensityBreakdown = data.intensityBreakdown ?? {
    light: { minutes: 0, target: 10 },
    moderate: { minutes: 0, target: 15 },
    vigorous: { minutes: 0, target: 5 },
    totalActiveMinutes: 0,
  }
  const activeMinutesDisplay = loading
    ? 0
    : intensityBreakdown.totalActiveMinutes > 0
      ? Math.round(intensityBreakdown.totalActiveMinutes)
      : Math.max(0, Math.round(data.activeMinutes ?? 0))

  const caloriesBurnedDisplay = loading
    ? 0
    : Math.max(0, Math.round(data.estimatedCaloriesBurned ?? 0))

  const activeTargetMins =
    intensityBreakdown.light.target +
    intensityBreakdown.moderate.target +
    intensityBreakdown.vigorous.target

  /** No distance in API yet — rough miles from steps (~2.1k steps/mi walking). */
  const distanceMilesDisplay = useMemo(() => {
    if (!activityDaySteps || activityDaySteps <= 0) return '0.00'
    return (activityDaySteps / 2112).toFixed(2)
  }, [activityDaySteps])

  /** Linear fill vs daily step goal (same pattern as `/steps` movement timing bars). */
  const stepsGoalBarPct = useMemo(() => {
    if (dailyGoal <= 0) return 0
    return Math.min(100, (activityDaySteps / dailyGoal) * 100)
  }, [activityDaySteps, dailyGoal])

  const todayYmd = isoLocalDate(new Date())

  const chartDays = useMemo(() => {
    const raw = data.movementConsistencyData?.dailyData
    if (raw && Array.isArray(raw) && raw.length > 0) {
      return raw.map((d: { date: string; steps: number; hasData: boolean }) => ({
        date: d.date,
        steps: d.steps ?? 0,
        hasData: !!d.hasData,
      }))
    }
    const out: { date: string; steps: number; hasData: boolean }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - (6 - i))
      out.push({ date: isoLocalDate(d), steps: 0, hasData: false })
    }
    return out
  }, [data.movementConsistencyData])

  const shiftStepsDuringWeek = useMemo((): ShiftStepsDuringShiftDay[] => {
    if (data.shiftStepsLast7Days?.length === 7) return data.shiftStepsLast7Days
    const daily = data.movementConsistencyData?.dailyData
    if (daily && daily.length === 7) {
      return daily.map((d) => ({
        date: d.date,
        dayLabel: d.dayLabel,
        steps: d.steps ?? 0,
        hasData: !!d.hasData,
        hasWorkShift: true,
        shiftType: null,
      }))
    }
    const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - (6 - i))
      return {
        date: isoLocalDate(d),
        dayLabel: labels[d.getDay()] ?? '?',
        steps: 0,
        hasData: false,
        hasWorkShift: false,
        shiftType: null,
      }
    })
  }, [data.shiftStepsLast7Days, data.movementConsistencyData])

  const adaptiveMovementData = useMemo(() => {
    if (loading) return null

    const samples: StepSample[] = Array.isArray(data.stepSamples)
      ? data.stepSamples.map((sample) => ({
          timestamp: sample.timestamp,
          steps: Math.max(0, Math.round(sample.steps || 0)),
        }))
      : []

    const shiftTypeValue = data.shiftType
    const isShiftDay = shiftTypeValue === 'day' || shiftTypeValue === 'night' || shiftTypeValue === 'late'
    const isRecoveryDay = !isShiftDay && (data.recoverySignal === 'RED' || data.recoverySignal === 'AMBER')
    const dayType = isShiftDay ? 'shift' : isRecoveryDay ? 'recovery' : 'day_off'

    const parsedShiftStart = data.shiftStart ? Date.parse(data.shiftStart) : NaN
    const parsedShiftEnd = data.shiftEnd ? Date.parse(data.shiftEnd) : NaN
    const shift: Shift | null =
      dayType === 'shift' && Number.isFinite(parsedShiftStart) && Number.isFinite(parsedShiftEnd)
        ? {
            start: data.shiftStart as string,
            end: data.shiftEnd as string,
            type:
              shiftTypeValue === 'day'
                ? 'day'
                : shiftTypeValue === 'night'
                  ? 'night'
                  : shiftTypeValue === 'late'
                    ? 'evening'
                    : 'unknown',
          }
        : null

    if (dayType === 'shift' && shift == null) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ActivityAndStepsPage] Shift day detected but shiftStart/shiftEnd invalid; rendering empty shift movement card')
      }
      return buildEmptyShiftMovementData()
    }

    try {
      return buildAdaptiveMovementData({
        samples,
        dayType,
        shift,
      })
    } catch (error) {
      console.warn('[ActivityAndStepsPage] AdaptiveMovementCard failed to build data', error)
      return dayType === 'shift' ? buildEmptyShiftMovementData() : buildAdaptiveMovementData({ samples, dayType })
    }
  }, [
    loading,
    data.stepSamples,
    data.shiftType,
    data.recoverySignal,
    data.shiftStart,
    data.shiftEnd,
  ])

  return (
    <main
      className="min-h-screen"
      style={{
        backgroundImage: 'radial-gradient(circle at top, var(--bg-soft), var(--bg))',
      }}
    >
      <div className="max-w-[430px] mx-auto min-h-screen px-5 pb-28 pt-5 flex flex-col gap-8">
        <header className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2.5 rounded-full backdrop-blur-xl border transition-all min-h-11 min-w-11 flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            aria-label={t('detail.common.backToDashboard')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold tracking-tight truncate" style={{ color: 'var(--text-main)' }}>
            {t('browse.activity.title')}
          </h1>
        </header>

        {/* SECTION 1 — Hero: steps bar + Active time row (kcal & est. mi) in one white card */}
        <section className="flex flex-col items-center text-center gap-5 pt-2">
          {loading ? (
            <div className="flex w-full flex-col gap-4 rounded-xl border border-[#05afc5]/45 bg-white px-5 py-6 shadow-sm dark:border-[#05afc5]/45">
              <div className="flex w-full justify-start">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-600" />
              </div>
              <div className="flex w-full flex-col items-center gap-3">
                <div
                  className="h-[3.25rem] w-36 animate-pulse rounded-xl"
                  style={{ backgroundColor: 'var(--ring-bg)' }}
                />
                <div className="h-2 w-full animate-pulse rounded-full bg-slate-200 dark:bg-slate-600" />
              </div>
              <div className="w-full space-y-3 text-left">
                <div className="flex items-center gap-2">
                  <div className="h-[18px] w-[18px] shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-600" />
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-600" />
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                    <div className="h-6 w-14 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-4 rounded-xl border border-[#05afc5]/45 bg-white px-5 pt-4 pb-5 shadow-sm dark:border-[#05afc5]/45 dark:bg-zinc-900/75">
              <div className="flex w-full flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSyncStepsFromHealth()}
                  disabled={syncingSteps}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-100 dark:hover:bg-zinc-700"
                  aria-label={t('browse.activity.syncStepsAria')}
                  title={t('browse.activity.syncStepsAria')}
                >
                  <RefreshCw
                    className={`h-[18px] w-[18px] shrink-0 ${syncingSteps ? 'animate-spin' : ''}`}
                    strokeWidth={2.25}
                    aria-hidden
                  />
                </button>
                {syncingSteps ? (
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {t('browse.activity.syncStepsBusy')}
                  </span>
                ) : null}
              </div>
              {syncStepsError ? (
                <p className="text-center text-[11px] font-medium text-red-600 dark:text-red-400" role="alert">
                  {syncStepsError}
                </p>
              ) : null}
              <div className="flex w-full flex-col items-center gap-3">
                <div className="text-center">
                  <p className="text-[3rem] sm:text-[3.25rem] font-semibold tabular-nums leading-none tracking-tight text-slate-900 dark:text-[var(--text-main)]">
                    {activityDaySteps.toLocaleString()}
                  </p>
                  <p className="mt-1.5 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Steps
                  </p>
                  {stepsSourceLabel ? (
                    <p className="mt-2 max-w-[280px] text-[11px] font-medium leading-snug text-slate-600 dark:text-slate-400">
                      {stepsSourceLabel}
                    </p>
                  ) : null}
                </div>
                <div
                  className="h-2 w-full max-w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/80"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(stepsGoalBarPct)}
                  aria-label={`${Math.round(stepsGoalBarPct)}% of ${dailyGoal.toLocaleString()} step goal`}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#05afc5] via-sky-500 to-emerald-500 transition-[width] duration-500 ease-out"
                    style={{ width: `${stepsGoalBarPct}%` }}
                  />
                </div>
              </div>

              <div className="w-full text-left">
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-emerald-500"
                    aria-hidden
                  >
                    <Timer className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
                  </span>
                  <span className="text-xs font-medium text-slate-500">Active time</span>
                </div>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                  <div className="flex min-w-0 items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tabular-nums leading-none text-slate-900">
                      {activeMinutesDisplay}
                    </span>
                    <span className="text-sm font-medium tabular-nums text-slate-400">
                      /{activeTargetMins} mins
                    </span>
                  </div>
                  <div className="ml-auto flex shrink-0 items-baseline gap-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-semibold tabular-nums text-slate-900">
                        {caloriesBurnedDisplay.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500">kcal</span>
                    </div>
                    <div
                      className="h-7 w-px shrink-0 self-center bg-slate-200 dark:bg-slate-600"
                      aria-hidden
                    />
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-semibold tabular-nums text-slate-900">
                        {distanceMilesDisplay}
                      </span>
                      <span className="text-xs text-slate-500">mi</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full space-y-2">
                <Link
                  href="/activity/log#activity-log-steps"
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.99] active:brightness-95"
                  style={{ backgroundColor: '#05afc5' }}
                >
                  <PenLine className="h-4 w-4 shrink-0 opacity-95" strokeWidth={2.25} aria-hidden />
                  {t('browse.activity.manualLogSteps')}
                </Link>
                <p className="px-0.5 text-center text-[11px] leading-snug text-slate-500">{t('browse.activity.manualLogStepsHint')}</p>
              </div>
            </div>
          )}

          <ManualActivityHistorySection activityDate={manualHistoryCivilYmd} />

          {adaptiveMovementData ? <AdaptiveMovementCard data={adaptiveMovementData} /> : null}

          <ActivityHistory30Days />

          <StepsByTimeOfDayCard
            loading={loading}
            stepSamples={data.stepSamples}
            stepsByHour={data.stepsByHour}
            displayTotalSteps={activityDaySteps}
            title={t('browse.activity.stepsByTimeOfDay')}
            shiftStartIso={data.stepsByHourAnchorStart ?? null}
            timeZone={intel?.activityTimeZone ?? null}
          />

          <div className="w-full rounded-xl border border-transparent bg-white px-5 py-4 shadow-sm dark:border-[var(--border-subtle)]">
            <div className="flex gap-3">
              <span
                className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: 'var(--ring-bg)', color: 'var(--text-main)' }}
                aria-hidden
              >
                <Sparkles className="h-4 w-4 opacity-80" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                {!motivationReady ? (
                  <div className="space-y-2" aria-hidden>
                    <div className="h-3.5 w-full max-w-[280px] animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                    <div className="h-3.5 w-full max-w-[220px] animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-slate-700">{motivationText}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <div
          className="px-2 pb-4 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]">
            {t('detail.common.disclaimerBrand')}
          </p>
          <p className="text-[11px] leading-relaxed">{t('detail.common.disclaimerLine1')}</p>
          <p className="mt-1 text-[11px] leading-relaxed">{t('detail.common.disclaimerLine2')}</p>
        </div>
      </div>
    </main>
  )
}
