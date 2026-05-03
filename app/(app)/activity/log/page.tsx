'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/providers/language-provider'
import { authedFetch } from '@/lib/supabase/authedFetch'
import { ManualActivityHistorySection } from '@/components/activity/ManualActivityHistorySection'
import { formatYmdInTimeZone } from '@/lib/sleep/utils'

const GOALS_STORAGE_KEY = 'shiftcoach-activity-goals'
const WEIGHT_STORAGE_KEY = 'shiftcoach-weight-cache'

const defaultGoals = {
  stepTarget: 9000,
  activeMinutesTarget: 45,
}

const DURATION_PRESETS = [10, 20, 30, 45, 60] as const
const QUICK_ADD_STEPS = [500, 1000, 2000] as const

type ActivityKind = 'walk' | 'run' | 'workout' | 'shift' | 'custom'
type Intensity = 'easy' | 'moderate' | 'hard'

type ActivityTodaySummary = {
  steps: number
  activeMinutes: number
  calories: number
}

type ProfileLite = {
  height_cm?: number | null
  weight_kg?: number | null
  sex?: 'male' | 'female' | null
}

const ACTIVITY_KINDS: ActivityKind[] = ['walk', 'run', 'workout', 'shift', 'custom']

/** Intensity multiplier for rough step estimates from distance (run). */
function intensityMul(intensity: Intensity): number {
  if (intensity === 'easy') return 0.92
  if (intensity === 'hard') return 1.08
  return 1
}

/**
 * Resolves integer steps for POST /api/activity/manual.
 * Walk requires explicit steps; other kinds can estimate from secondary fields.
 */
function resolveStepsForSave(
  kind: ActivityKind,
  stepsInput: number | '',
  durationMinutes: number,
  distanceKm: number | '',
  calories: number | '',
  intensity: Intensity,
): { ok: true; steps: number } | { ok: false; toastKey: string } {
  const s = stepsInput === '' ? NaN : Number(stepsInput)
  const m = intensityMul(intensity)

  if (kind === 'walk') {
    if (!Number.isFinite(s) || s < 0) return { ok: false, toastKey: 'activityLog.toast.stepsInvalid' }
    return { ok: true, steps: Math.round(s) }
  }

  if (Number.isFinite(s) && s >= 0) return { ok: true, steps: Math.round(s) }

  if (kind === 'run') {
    const d = distanceKm === '' ? NaN : Number(distanceKm)
    if (Number.isFinite(d) && d > 0) return { ok: true, steps: Math.round(d * 1250 * m) }
    if (durationMinutes > 0) return { ok: true, steps: Math.round(durationMinutes * 140 * m) }
    return { ok: false, toastKey: 'activityLog.toast.needRunDetails' }
  }

  if (kind === 'workout') {
    const c = calories === '' ? NaN : Number(calories)
    if (Number.isFinite(c) && c > 0) return { ok: true, steps: Math.round(c / 0.048) }
    if (durationMinutes > 0) {
      const perMin = intensity === 'easy' ? 52 : intensity === 'hard' ? 108 : 82
      return { ok: true, steps: Math.round(durationMinutes * perMin) }
    }
    return { ok: false, toastKey: 'activityLog.toast.needWorkoutDetails' }
  }

  if (kind === 'shift') {
    if (Number.isFinite(s) && s >= 0) return { ok: true, steps: Math.round(s) }
    if (durationMinutes > 0) return { ok: true, steps: Math.round(durationMinutes * 55) }
    return { ok: false, toastKey: 'activityLog.toast.stepsInvalid' }
  }

  // custom
  const d = distanceKm === '' ? NaN : Number(distanceKm)
  if (Number.isFinite(d) && d > 0) return { ok: true, steps: Math.round(d * 1200 * m) }
  const c = calories === '' ? NaN : Number(calories)
  if (Number.isFinite(c) && c > 0) return { ok: true, steps: Math.round(c / 0.05) }
  if (durationMinutes > 0) return { ok: true, steps: Math.round(durationMinutes * 75) }
  return { ok: false, toastKey: 'activityLog.toast.stepsInvalid' }
}

function readApiErrorMessage(json: unknown, fallback: string): string {
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

function formatSummaryLine(
  t: (key: string, vars?: Record<string, string | number>) => string,
  summary: ActivityTodaySummary,
): string {
  return t('activityLog.summaryLine', {
    steps: summary.steps.toLocaleString(),
    activeMin: summary.activeMinutes,
    kcal: summary.calories,
  })
}

export default function LogActivityPage() {
  const { t } = useTranslation()
  const router = useRouter()

  const [summary, setSummary] = useState<ActivityTodaySummary>({ steps: 0, activeMinutes: 0, calories: 0 })
  const [activityCivilDate, setActivityCivilDate] = useState<string | undefined>(undefined)
  const [kind, setKind] = useState<ActivityKind>('walk')
  const [durationMinutes, setDurationMinutes] = useState<number>(30)
  const [durationCustom, setDurationCustom] = useState(false)
  const [intensity, setIntensity] = useState<Intensity>('moderate')
  const [stepsInput, setStepsInput] = useState<number | ''>('')
  const [distanceKm, setDistanceKm] = useState<number | ''>('')
  const [calories, setCalories] = useState<number | ''>('')
  const [shiftActiveMinutes, setShiftActiveMinutes] = useState<number | ''>('')

  const [profile, setProfile] = useState<ProfileLite | null>(null)
  const [weightInput, setWeightInput] = useState<string>('')

  const [savingActivity, setSavingActivity] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  /** Stays on screen until dismissed or a new save — API/schema errors are often long. */
  const [saveError, setSaveError] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const weightKg = useMemo(() => {
    const w = profile?.weight_kg ?? (weightInput ? Number(weightInput) : NaN)
    return Number.isFinite(w) && w > 0 ? w : 75
  }, [profile?.weight_kg, weightInput])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#activity-log-steps') {
      queueMicrotask(() => {
        document.getElementById('activity-log-steps')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
        const res = await authedFetch(`/api/activity/today?tz=${encodeURIComponent(tz)}`, { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const j = await res.json()
        const a = j.activity
        if (!a || cancelled) return
        setSummary({
          steps: typeof a.steps === 'number' ? Math.max(0, Math.round(a.steps)) : 0,
          activeMinutes:
            typeof a.activeMinutes === 'number' && Number.isFinite(a.activeMinutes)
              ? Math.max(0, Math.round(a.activeMinutes))
              : 0,
          calories:
            typeof a.estimatedCaloriesBurned === 'number' && Number.isFinite(a.estimatedCaloriesBurned)
              ? Math.max(0, Math.round(a.estimatedCaloriesBurned))
              : 0,
        })
        setActivityCivilDate(formatYmdInTimeZone(new Date(), tz))
      } catch {
        // non-fatal
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(WEIGHT_STORAGE_KEY)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (parsed?.weight_kg) setWeightInput(String(parsed.weight_kg))
        } catch {
          // ignore
        }
      }
    }

    ;(async () => {
      try {
        const res = await authedFetch('/api/profile', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const lite: ProfileLite = {
          height_cm: data?.height_cm ?? data?.profile?.height_cm ?? null,
          weight_kg: data?.weight_kg ?? data?.profile?.weight_kg ?? null,
          sex: (data?.sex ?? data?.profile?.sex ?? null) as 'male' | 'female' | null,
        }
        setProfile(lite)
        if (lite.weight_kg && !weightInput) setWeightInput(String(lite.weight_kg))
      } catch {
        // non fatal
      }
    })()
  }, [weightInput])

  const resolvedStepsPreview = useMemo(() => {
    const r = resolveStepsForSave(kind, stepsInput, durationMinutes, distanceKm, calories, intensity)
    return r.ok ? r.steps : null
  }, [kind, stepsInput, durationMinutes, distanceKm, calories, intensity])

  const estimatedDistanceKm = useMemo(() => {
    if (resolvedStepsPreview == null || resolvedStepsPreview <= 0) return null
    const div = kind === 'run' ? 1250 : 1320
    return Math.round((resolvedStepsPreview / div) * 100) / 100
  }, [resolvedStepsPreview, kind])

  const estimatedKcal = useMemo(() => {
    if (resolvedStepsPreview == null || resolvedStepsPreview <= 0) return null
    const met =
      kind === 'run'
        ? intensity === 'easy'
          ? 6
          : intensity === 'hard'
            ? 9.5
            : 8
        : intensity === 'easy'
          ? 2.8
          : intensity === 'hard'
            ? 4.3
            : 3.5
    const hours = Math.max(durationMinutes, 1) / 60
    const kcal = met * weightKg * hours * (resolvedStepsPreview / Math.max(resolvedStepsPreview, 800))
    const blended = 0.045 * resolvedStepsPreview + kcal * 0.35
    return Math.max(0, Math.round(blended))
  }, [resolvedStepsPreview, kind, intensity, weightKg, durationMinutes])

  const showToast = (message: string, durationMs = 2600) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
    setToast(message)
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => (prev === message ? null : prev))
      toastTimerRef.current = null
    }, durationMs)
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const activeMinutesForApi = (): number | undefined => {
    if (kind === 'shift') {
      const a = shiftActiveMinutes === '' ? NaN : Number(shiftActiveMinutes)
      if (Number.isFinite(a) && a >= 0) return Math.round(a)
    }
    return durationMinutes > 0 ? Math.round(durationMinutes) : undefined
  }

  const handleSaveActivity = async () => {
    if (savingActivity) return
    setSaveError(null)
    const resolved = resolveStepsForSave(kind, stepsInput, durationMinutes, distanceKm, calories, intensity)
    if (!resolved.ok) {
      const msg = t(resolved.toastKey)
      setSaveError(msg)
      showToast(msg, 8000)
      return
    }

    setSavingActivity(true)
    try {
      const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
      const am = activeMinutesForApi()
      const end = new Date()
      const dur = durationMinutes > 0 ? durationMinutes : 60
      const start = new Date(end.getTime() - dur * 60_000)
      const dm =
        distanceKm !== '' && Number.isFinite(Number(distanceKm)) && Number(distanceKm) > 0
          ? Math.round(Number(distanceKm) * 1000)
          : undefined
      const kcal =
        calories !== '' && Number.isFinite(Number(calories)) && Number(calories) >= 0
          ? Math.round(Number(calories))
          : undefined

      const body: Record<string, unknown> = {
        steps: resolved.steps,
        activityType: kind,
        reason: 'wearable_sync_missing',
        timeZone: tz,
        durationMinutes: durationMinutes > 0 ? durationMinutes : undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      }
      body.activityDate = formatYmdInTimeZone(new Date(), tz)
      if (am != null) body.activeMinutes = am
      if (dm != null) body.distanceMeters = dm
      if (kcal != null) body.calories = kcal

      const res = await authedFetch(`/api/activity/manual?tz=${encodeURIComponent(tz)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => (null))
      if (!res.ok) {
        const msg = readApiErrorMessage(json, t('activityLog.toast.saveFailed'))
        setSaveError(msg)
        showToast(msg, 12000)
        return
      }

      window.dispatchEvent(new Event('activity-manual-logged'))
      window.dispatchEvent(new Event('wearables-synced'))

      const refresh = await authedFetch(`/api/activity/today?tz=${encodeURIComponent(tz)}`, { cache: 'no-store' })
      if (refresh.ok) {
        const j = await refresh.json()
        const a = j.activity
        if (a) {
          setSummary({
            steps: typeof a.steps === 'number' ? Math.max(0, Math.round(a.steps)) : resolved.steps,
            activeMinutes:
              typeof a.activeMinutes === 'number' && Number.isFinite(a.activeMinutes)
                ? Math.max(0, Math.round(a.activeMinutes))
                : am ?? 0,
            calories:
              typeof a.estimatedCaloriesBurned === 'number' && Number.isFinite(a.estimatedCaloriesBurned)
                ? Math.max(0, Math.round(a.estimatedCaloriesBurned))
                : 0,
          })
          setActivityCivilDate(formatYmdInTimeZone(new Date(), tz))
        }
      }

      setSaveError(null)
      showToast(t('activityLog.toast.manualSavedTrust'), 6500)
      // Let the trust line stay readable before leaving (was 400ms — felt like a broken flash).
      setTimeout(() => router.back(), 5600)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('activityLog.toast.saveFailed')
      setSaveError(msg)
      showToast(msg, 12000)
    } finally {
      setSavingActivity(false)
    }
  }

  const recommendedRange = useMemo(() => ({ min: 8000, max: 9500 }), [])

  const goBack = () => router.back()

  const kindLabel = (k: ActivityKind) => t(`activityLog.kind.${k}`)

  const setPresetDuration = (m: number) => {
    setDurationCustom(false)
    setDurationMinutes(m)
  }

  const showStepsPrimary = kind === 'walk'
  const showStepsOptional = kind === 'run' || kind === 'workout'
  const showStepsShift = kind === 'shift'
  const showStepsCustom = kind === 'custom'

  const sessionBeforePrimary = kind === 'run' || kind === 'workout' || kind === 'shift' || kind === 'custom'

  const chipActive =
    'border-[color-mix(in_oklab,var(--accent-blue)_55%,transparent)] bg-[color-mix(in_oklab,var(--accent-indigo)_28%,var(--card-subtle))] text-[var(--text-main)] shadow-none'
  const chipIdle =
    'border-[var(--border-subtle)] bg-[var(--card-subtle)] text-[var(--text-main)] hover:border-[color-mix(in_oklab,var(--accent-blue)_35%,var(--border-subtle))]'

  const inputClass =
    'w-full rounded-2xl border px-4 py-3 text-base outline-none transition-[box-shadow,border-color] focus:border-[color-mix(in_oklab,var(--accent-blue)_45%,var(--border-subtle))] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent-blue)_25%,transparent)]'
  const inputStyle: CSSProperties = { background: 'var(--card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }

  const summaryText = formatSummaryLine(t, summary)

  return (
    <main className="min-h-screen bg-slate-100 pb-8">
      <div className="mx-auto w-full max-w-md space-y-5 px-4 py-4">
        <header className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              className="shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: 'var(--text-soft)' }}
            >
              <span className="mr-1">←</span>
              {t('activityLog.back')}
            </button>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>
              {t('activityLog.title')}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {t('activityLog.subtitle')}
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {t('activityLog.helperSync')}
            </p>
          </div>
        </header>

        {/* Today summary — single calm card */}
        <section
          className="rounded-2xl border px-4 py-3.5"
          style={{ background: 'var(--card-subtle)', borderColor: 'var(--border-subtle)' }}
        >
          <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {t('activityLog.todaySoFar')}
          </p>
          <p className="mt-1.5 text-sm font-medium leading-snug" style={{ color: 'var(--text-main)' }}>
            {summaryText}
          </p>
        </section>

        <ManualActivityHistorySection activityDate={activityCivilDate} layout="dropdown" allowDelete />

        {/* Activity type */}
        <section className="space-y-2.5">
          <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
            {t('activityLog.whatLogging')}
          </p>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_KINDS.map((value) => {
              const active = kind === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setKind(value)}
                  className={`rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${active ? chipActive : chipIdle}`}
                >
                  {kindLabel(value)}
                </button>
              )
            })}
          </div>
        </section>

        {/* Duration / intensity first when not walk (walk keeps these under optional, after steps) */}
        {sessionBeforePrimary && (
          <section className="space-y-4">
            <DurationBlock
              label={t('activityLog.durationOptional')}
              customChipLabel={t('activityLog.durationCustom')}
              minuteSuffix={t('activityLog.minAbbr')}
              durationMinutes={durationMinutes}
              durationCustom={durationCustom}
              setPresetDuration={setPresetDuration}
              setDurationCustom={setDurationCustom}
              setDurationMinutes={setDurationMinutes}
              chipActive={chipActive}
              chipIdle={chipIdle}
              inputClass={inputClass}
              inputStyle={inputStyle}
            />
            {kind !== 'shift' && (
              <IntensityBlock
                t={t}
                intensity={intensity}
                setIntensity={setIntensity}
                chipActive={chipActive}
                chipIdle={chipIdle}
              />
            )}
          </section>
        )}

        {/* Primary blocks by kind */}
        {showStepsPrimary && (
          <section id="activity-log-steps" className="scroll-mt-24 space-y-3">
            <label className="block text-center text-sm font-medium" style={{ color: 'var(--text-main)' }}>
              {t('activityLog.metric.steps')}
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={120000}
              value={stepsInput}
              onChange={(e) => setStepsInput(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={t('activityLog.ph.steps')}
              className={`${inputClass} py-4 text-center text-3xl font-semibold tabular-nums`}
              style={inputStyle}
            />
            <div>
              <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {t('activityLog.quickAdd')}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_ADD_STEPS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      setStepsInput((prev) => {
                        const base = prev === '' ? 0 : Number(prev)
                        const next = (Number.isFinite(base) ? base : 0) + n
                        return Math.min(120_000, next)
                      })
                    }
                    className={`rounded-full px-4 py-2 text-sm font-semibold tabular-nums ${chipIdle}`}
                  >
                    +{n.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {(kind === 'run' || kind === 'workout') && (
          <section className="space-y-4">
            {kind === 'run' && (
              <>
                <FieldLabel>{t('activityLog.metric.distance')}</FieldLabel>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={t('activityLog.ph.distance')}
                    className={`${inputClass} flex-1 tabular-nums`}
                    style={inputStyle}
                  />
                  <span className="pr-1 text-sm tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    km
                  </span>
                </div>
              </>
            )}
            {kind === 'workout' && (
              <>
                <FieldLabel>{t('activityLog.metric.calories')}</FieldLabel>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={calories}
                    onChange={(e) => setCalories(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={t('activityLog.ph.calories')}
                    className={`${inputClass} flex-1 py-3.5 text-2xl font-semibold tabular-nums`}
                    style={inputStyle}
                  />
                  <span className="pr-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                    kcal
                  </span>
                </div>
              </>
            )}
          </section>
        )}

        {showStepsShift && (
          <section className="space-y-4">
            <div className="space-y-2">
              <FieldLabel subtle>{t('activityLog.activeMinutes')}</FieldLabel>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={shiftActiveMinutes}
                onChange={(e) => setShiftActiveMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={t('activityLog.ph.activeMinutes')}
                className={`${inputClass} max-w-full tabular-nums sm:max-w-[220px]`}
                style={inputStyle}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>{t('activityLog.metric.steps')}</FieldLabel>
              <input
                id="activity-log-steps"
                type="number"
                inputMode="numeric"
                min={0}
                value={stepsInput}
                onChange={(e) => setStepsInput(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={t('activityLog.ph.stepsShift')}
                className={`${inputClass} py-3 text-center text-2xl font-semibold tabular-nums`}
                style={inputStyle}
              />
              <p className="text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {t('activityLog.shiftStepsHint')}
              </p>
            </div>
          </section>
        )}

        {showStepsCustom && (
          <section id="activity-log-steps" className="scroll-mt-24 space-y-3">
            <FieldLabel>{t('activityLog.metric.steps')}</FieldLabel>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={stepsInput}
              onChange={(e) => setStepsInput(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={t('activityLog.ph.steps')}
              className={`${inputClass} py-3 text-center text-2xl font-semibold tabular-nums`}
              style={inputStyle}
            />
          </section>
        )}

        {/* Optional details */}
        <section className="space-y-4 rounded-2xl border border-dashed px-4 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {t('activityLog.optionalDetails')}
          </p>

          {kind === 'walk' && (
            <>
              <DurationBlock
                label={t('activityLog.durationOptional')}
                customChipLabel={t('activityLog.durationCustom')}
                minuteSuffix={t('activityLog.minAbbr')}
                durationMinutes={durationMinutes}
                durationCustom={durationCustom}
                setPresetDuration={setPresetDuration}
                setDurationCustom={setDurationCustom}
                setDurationMinutes={setDurationMinutes}
                chipActive={chipActive}
                chipIdle={chipIdle}
                inputClass={inputClass}
                inputStyle={inputStyle}
              />
              <IntensityBlock
                t={t}
                intensity={intensity}
                setIntensity={setIntensity}
                chipActive={chipActive}
                chipIdle={chipIdle}
              />
            </>
          )}

          {/* Secondary metrics: contextual */}
          {kind === 'walk' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricRow
                label={t('activityLog.metric.distance')}
                unit="km"
                value={distanceKm}
                onChange={setDistanceKm}
                placeholder={t('activityLog.ph.distance')}
                inputClass={inputClass}
                inputStyle={inputStyle}
                hint={
                  estimatedDistanceKm != null
                    ? t('activityLog.estimatedFromEntry', { value: `~${estimatedDistanceKm}` })
                    : undefined
                }
              />
              <MetricRow
                label={t('activityLog.metric.calories')}
                unit="kcal"
                value={calories}
                onChange={setCalories}
                placeholder={t('activityLog.ph.calories')}
                inputClass={inputClass}
                inputStyle={inputStyle}
                hint={estimatedKcal != null ? t('activityLog.estimatedFromEntry', { value: `~${estimatedKcal}` }) : undefined}
              />
            </div>
          )}

          {kind === 'run' && (
            <MetricRow
              label={t('activityLog.metric.calories')}
              unit="kcal"
              value={calories}
              onChange={setCalories}
              placeholder={t('activityLog.ph.calories')}
              inputClass={inputClass}
              inputStyle={inputStyle}
              hint={estimatedKcal != null ? t('activityLog.estimatedFromEntry', { value: `~${estimatedKcal}` }) : undefined}
            />
          )}

          {kind === 'workout' && (
            <MetricRow
              label={t('activityLog.metric.distance')}
              unit="km"
              value={distanceKm}
              onChange={setDistanceKm}
              placeholder={t('activityLog.ph.distance')}
              inputClass={inputClass}
              inputStyle={inputStyle}
              hint={
                estimatedDistanceKm != null
                  ? t('activityLog.estimatedFromEntry', { value: `~${estimatedDistanceKm}` })
                  : undefined
              }
            />
          )}

          {kind === 'shift' && (
            <MetricRow
              label={t('activityLog.metric.calories')}
              unit="kcal"
              value={calories}
              onChange={setCalories}
              placeholder={t('activityLog.ph.calories')}
              inputClass={inputClass}
              inputStyle={inputStyle}
              hint={estimatedKcal != null ? t('activityLog.estimatedFromEntry', { value: `~${estimatedKcal}` }) : undefined}
            />
          )}

          {kind === 'custom' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricRow
                label={t('activityLog.metric.distance')}
                unit="km"
                value={distanceKm}
                onChange={setDistanceKm}
                placeholder={t('activityLog.ph.distance')}
                inputClass={inputClass}
                inputStyle={inputStyle}
              />
              <MetricRow
                label={t('activityLog.metric.calories')}
                unit="kcal"
                value={calories}
                onChange={setCalories}
                placeholder={t('activityLog.ph.calories')}
                inputClass={inputClass}
                inputStyle={inputStyle}
              />
            </div>
          )}

          {showStepsOptional && (
            <div className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <FieldLabel subtle>{t('activityLog.stepsOptional')}</FieldLabel>
              <input
                id="activity-log-steps"
                type="number"
                inputMode="numeric"
                min={0}
                value={stepsInput}
                onChange={(e) => setStepsInput(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={t('activityLog.ph.steps')}
                className={`${inputClass} tabular-nums`}
                style={inputStyle}
              />
            </div>
          )}
        </section>

        {/* Goal card */}
        <section className="rounded-2xl border px-4 py-3.5" style={{ background: 'var(--card-subtle)', borderColor: 'var(--border-subtle)' }}>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {t('activityLog.recommendedGoalTitle')}
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
            {t('activityLog.recommendedGoalRange', {
              min: recommendedRange.min.toLocaleString(),
              max: recommendedRange.max.toLocaleString(),
            })}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {t('activityLog.recommendedGoalHint')}
          </p>
        </section>

        {/* In-flow actions (scrolls with the page; shell pb-24 clears global bottom nav) */}
        <section className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleSaveActivity}
            disabled={savingActivity}
            className="w-full rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-600 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {savingActivity ? t('activityLog.saving') : t('activityLog.saveManualLog')}
          </button>
          {saveError ? (
            <div
              role="alert"
              className="rounded-2xl border px-3.5 py-3 text-sm leading-relaxed"
              style={{
                borderColor: 'color-mix(in oklab, #dc2626 45%, var(--border-subtle))',
                background: 'color-mix(in oklab, #fef2f2 88%, var(--card-subtle))',
                color: 'var(--text-main)',
              }}
            >
              <p className="font-medium text-red-800 dark:text-red-200">{saveError}</p>
              <button
                type="button"
                className="mt-2 text-xs font-semibold underline-offset-2 hover:underline"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => setSaveError(null)}
              >
                {t('activityLog.saveErrorDismiss')}
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="w-full py-2 text-center text-xs font-medium transition hover:opacity-90"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('activityLog.updateWeightGoals')}
          </button>
        </section>

        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {t('detail.common.disclaimer')}
        </p>
      </div>

      {toast && (
        <div
          className="fixed left-1/2 z-[110] max-w-md min-w-[min(100%,18rem)] -translate-x-1/2 rounded-2xl px-4 py-3 text-sm font-medium leading-snug shadow-lg whitespace-normal text-center"
          style={{
            bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
            background: 'rgba(15,23,42,0.94)',
            color: '#f9fafb',
          }}
        >
          {toast}
        </div>
      )}
    </main>
  )
}

function DurationBlock({
  label,
  customChipLabel,
  minuteSuffix,
  durationMinutes,
  durationCustom,
  setPresetDuration,
  setDurationCustom,
  setDurationMinutes,
  chipActive,
  chipIdle,
  inputClass,
  inputStyle,
}: {
  label: string
  customChipLabel: string
  minuteSuffix: string
  durationMinutes: number
  durationCustom: boolean
  setPresetDuration: (m: number) => void
  setDurationCustom: (v: boolean) => void
  setDurationMinutes: (n: number) => void
  chipActive: string
  chipIdle: string
  inputClass: string
  inputStyle: CSSProperties
}) {
  return (
    <div className="space-y-2">
      <FieldLabel subtle>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {DURATION_PRESETS.map((m) => {
          const active = !durationCustom && durationMinutes === m
          return (
            <button
              key={m}
              type="button"
              onClick={() => setPresetDuration(m)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${active ? chipActive : chipIdle}`}
            >
              {m}m
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setDurationCustom(true)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${durationCustom ? chipActive : chipIdle}`}
        >
          {customChipLabel}
        </button>
      </div>
      {durationCustom && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={5}
            max={600}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value) || 0)}
            className={`${inputClass} max-w-[120px] tabular-nums`}
            style={inputStyle}
          />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {minuteSuffix}
          </span>
        </div>
      )}
    </div>
  )
}

function IntensityBlock({
  t,
  intensity,
  setIntensity,
  chipActive,
  chipIdle,
}: {
  t: (key: string, params?: Record<string, string | number | undefined>) => string
  intensity: Intensity
  setIntensity: (v: Intensity) => void
  chipActive: string
  chipIdle: string
}) {
  return (
    <div className="space-y-2">
      <FieldLabel subtle>{t('activityLog.intensityOptional')}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {(['easy', 'moderate', 'hard'] as const).map((value) => {
          const active = intensity === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setIntensity(value)}
              className={`min-w-[4.5rem] flex-1 rounded-full px-2 py-2 text-xs font-medium sm:flex-none ${active ? chipActive : chipIdle}`}
            >
              {t(`activityLog.intensity.${value}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FieldLabel({ children, subtle }: { children: ReactNode; subtle?: boolean }) {
  return (
    <span
      className={`block text-sm ${subtle ? 'font-normal' : 'font-medium'}`}
      style={{ color: subtle ? 'var(--text-muted)' : 'var(--text-main)' }}
    >
      {children}
    </span>
  )
}

function MetricRow({
  label,
  unit,
  value,
  onChange,
  placeholder,
  inputClass,
  inputStyle,
  hint,
}: {
  label: string
  unit: string
  value: number | ''
  onChange: (v: number | '') => void
  placeholder: string
  inputClass: string
  inputStyle: CSSProperties
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel subtle>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={placeholder}
          className={`${inputClass} flex-1 tabular-nums`}
          style={inputStyle}
        />
        <span className="w-10 shrink-0 text-sm" style={{ color: 'var(--text-muted)' }}>
          {unit}
        </span>
      </div>
      {hint && (
        <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}
