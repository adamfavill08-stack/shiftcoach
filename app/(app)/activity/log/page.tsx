'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/providers/language-provider'

const GOALS_STORAGE_KEY = 'shiftcoach-activity-goals'
const WEIGHT_STORAGE_KEY = 'shiftcoach-weight-cache'

const defaultGoals = {
  stepTarget: 9000,
  activeMinutesTarget: 45,
}

type ActivityKind = 'walk' | 'run' | 'workout' | 'shift' | 'custom'
type Intensity = 'easy' | 'moderate' | 'hard'

type ActivityTodaySummary = {
  steps: number
  activeMinutes: number
  calories: number
}

type GoalsState = typeof defaultGoals

type ProfileLite = {
  height_cm?: number | null
  weight_kg?: number | null
  sex?: 'male' | 'female' | null
}

function loadGoals(): GoalsState {
  if (typeof window === 'undefined') return defaultGoals
  try {
    const raw = localStorage.getItem(GOALS_STORAGE_KEY)
    if (!raw) return defaultGoals
    const parsed = JSON.parse(raw)
    return {
      stepTarget: typeof parsed.stepTarget === 'number' ? parsed.stepTarget : defaultGoals.stepTarget,
      activeMinutesTarget:
        typeof parsed.activeMinutesTarget === 'number'
          ? parsed.activeMinutesTarget
          : defaultGoals.activeMinutesTarget,
    }
  } catch {
    return defaultGoals
  }
}

function saveGoals(goals: GoalsState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals))
  } catch {
    // ignore storage errors
  }
}

function saveWeight(weightKg: number) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(WEIGHT_STORAGE_KEY, JSON.stringify({ weight_kg: weightKg, ts: Date.now() }))
  } catch {
    // ignore storage errors
  }
}

export default function LogActivityPage() {
  const { t } = useTranslation()
  const router = useRouter()

  const [summary] = useState<ActivityTodaySummary>({ steps: 7420, activeMinutes: 36, calories: 520 })
  const [kind, setKind] = useState<ActivityKind>('walk')
  const [durationMinutes, setDurationMinutes] = useState<number>(30)
  const [intensity, setIntensity] = useState<Intensity>('moderate')
  const [stepsInput, setStepsInput] = useState<number | ''>('')
  const [distanceKm, setDistanceKm] = useState<number | ''>('')
  const [calories, setCalories] = useState<number | ''>('')
  const [notes, setNotes] = useState('')

  const [goals, setGoals] = useState<GoalsState>(defaultGoals)
  const [profile, setProfile] = useState<ProfileLite | null>(null)
  const [weightInput, setWeightInput] = useState<string>('')

  const [savingActivity, setSavingActivity] = useState(false)
  const [savingGoals, setSavingGoals] = useState(false)
  const [savingWeight, setSavingWeight] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setGoals(loadGoals())

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
        const res = await fetch('/api/profile', { credentials: 'include' })
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

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast((prev) => (prev === message ? null : prev)), 2600)
  }

  const handleSaveActivity = async () => {
    if (savingActivity) return
    setSavingActivity(true)
    try {
      const payload = {
        kind,
        durationMinutes,
        intensity,
        steps: stepsInput || null,
        distanceKm: distanceKm || null,
        calories: calories || null,
        notes: notes.trim() || null,
        source: 'manual',
      }

      console.log('[LogActivity] payload', payload)

      try {
        await fetch('/api/activity/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
      } catch (err) {
        console.warn('[LogActivity] backend call optional failed:', err)
      }

      showToast(t('activityLog.toast.logged'))
      setTimeout(() => router.back(), 400)
    } finally {
      setSavingActivity(false)
    }
  }

  const handleSaveGoals = async () => {
    if (savingGoals) return
    setSavingGoals(true)
    try {
      saveGoals(goals)
      try {
        await fetch('/api/activity/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(goals),
        })
      } catch (err) {
        console.warn('[LogActivity] goal sync failed (non-fatal)', err)
      }
      showToast(t('activityLog.toast.goalsUpdated'))
    } finally {
      setSavingGoals(false)
    }
  }

  const handleWeightUpdate = async () => {
    const weight = Number(weightInput)
    if (!weight || Number.isNaN(weight) || weight <= 0) {
      showToast(t('activityLog.toast.validWeight'))
      return
    }

    setSavingWeight(true)
    try {
      saveWeight(weight)
      try {
        await fetch('/api/profile/update-weight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ weight_kg: weight }),
        })
      } catch (err) {
        console.warn('[LogActivity] weight sync failed (non-fatal)', err)
      }
      showToast(t('activityLog.toast.weightUpdated'))
    } finally {
      setSavingWeight(false)
    }
  }

  const handleApplyCoachGoals = () => {
    const weight = profile?.weight_kg ?? (weightInput ? Number(weightInput) : 80)
    const height = profile?.height_cm ?? 175
    const sex = profile?.sex ?? 'male'

    let stepTarget = 9000
    if (sex === 'female') stepTarget -= 500
    if (weight > 100) stepTarget -= 1000
    if (weight < 65) stepTarget += 500
    if (height > 185) stepTarget += 500
    stepTarget = Math.round(stepTarget / 500) * 500
    stepTarget = Math.max(5000, stepTarget)

    let activeMinutesTarget = 40
    if (weight < 70) activeMinutesTarget += 5
    if (weight > 100) activeMinutesTarget -= 5
    activeMinutesTarget = Math.min(75, Math.max(30, activeMinutesTarget))

    const coachGoals: GoalsState = { stepTarget, activeMinutesTarget }
    setGoals(coachGoals)
    saveGoals(coachGoals)
    showToast(t('activityLog.toast.coachApplied'))
  }

  const recommendedRange = useMemo(() => ({ min: 8000, max: 9500 }), [])

  const goBack = () => router.back()

  return (
    <main className="min-h-screen bg-slate-100 px-4 pt-6 pb-10">
      <div className="mx-auto w-full max-w-md space-y-5">
        <header className="flex items-center justify-between">
          <button
            onClick={goBack}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-black/5"
            style={{ color: 'var(--text-soft)' }}
          >
            <span className="text-lg">←</span>
            <span>{t('activityLog.back')}</span>
          </button>
          <h1 className="text-sm font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--text-muted)' }}>
            {t('activityLog.title')}
          </h1>
          <button
            onClick={goBack}
            className="rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-black/5"
            style={{ color: 'var(--text-soft)' }}
          >
            ×
          </button>
        </header>

        <section
          className="rounded-3xl border border-slate-200 bg-white/95 px-5 py-6 shadow-[0_20px_40px_rgba(15,23,42,0.12)] backdrop-blur space-y-6"
        >
          <div
            className="flex items-center justify-between rounded-2xl border px-4 py-3"
            style={{ background: 'var(--card-subtle)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-400">{t('activityLog.todaySoFar')}</span>
            <div className="flex flex-wrap gap-2">
              <SummaryChip icon="👣" label={t('activityLog.chipSteps', { count: summary.steps.toLocaleString() })} />
              <SummaryChip icon="⚡" label={t('activityLog.chipActiveMin', { count: summary.activeMinutes })} />
              <SummaryChip icon="🔥" label={t('activityLog.chipKcal', { count: summary.calories })} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ['walk', t('activityLog.kind.walk')],
                ['run', t('activityLog.kind.run')],
                ['workout', t('activityLog.kind.workout')],
                ['shift', t('activityLog.kind.shift')],
                ['custom', t('activityLog.kind.custom')],
              ] as [ActivityKind, string][]
            ).map(([value, label]) => {
              const active = kind === value
              return (
                <button
                  key={value}
                  onClick={() => setKind(value)}
                  className="rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    border: active ? '1px solid rgba(59,130,246,0.4)' : '1px solid var(--border-subtle)',
                    background: active ? 'linear-gradient(135deg,#3bb2ff,#5f7aff)' : 'var(--card)',
                    color: active ? '#fff' : 'var(--text-main)',
                    boxShadow: active ? '0 6px 16px rgba(59,130,246,0.35)' : 'none',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div
              className="rounded-2xl border px-4 py-3"
              style={{ background: 'var(--card-subtle)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-400">{t('activityLog.duration')}</span>
                <span className="text-xs text-slate-500">{t('activityLog.minAbbr')}</span>
              </div>
              <div className="mb-2 flex flex-wrap gap-2">
                {[10, 20, 30, 45, 60].map((option) => {
                  const active = durationMinutes === option
                  return (
                    <button
                      key={option}
                      onClick={() => setDurationMinutes(option)}
                      className="rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-all"
                      style={{
                        border: active ? '1px solid rgba(59,130,246,0.4)' : '1px solid var(--border-subtle)',
                        background: active ? 'linear-gradient(135deg,#3bb2ff,#5f7aff)' : 'var(--card)',
                        color: active ? '#fff' : 'var(--text-main)',
                      }}
                    >
                      {option}m
                    </button>
                  )
                })}
              </div>
              <input
                type="number"
                min={5}
                max={300}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(Number(event.target.value) || 0)}
                className="w-full rounded-2xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                style={{ background: 'var(--card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
              />
            </div>

            <div
              className="rounded-2xl border px-4 py-3"
              style={{ background: 'var(--card-subtle)', borderColor: 'var(--border-subtle)' }}
            >
              <span className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-400">{t('activityLog.intensity')}</span>
              <div className="mt-2 flex gap-2">
                {(
                  [
                    ['easy', t('activityLog.intensity.easy')],
                    ['moderate', t('activityLog.intensity.moderate')],
                    ['hard', t('activityLog.intensity.hard')],
                  ] as [Intensity, string][]
                ).map(([value, label]) => {
                  const active = intensity === value
                  return (
                    <button
                      key={value}
                      onClick={() => setIntensity(value)}
                      className="flex-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all border"
                      style={{
                        border: active ? '1px solid rgba(59,130,246,0.4)' : '1px solid var(--border-subtle)',
                        background: active ? 'linear-gradient(135deg,#3bb2ff,#5f7aff)' : 'var(--card)',
                        color: active ? '#fff' : 'var(--text-main)',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <MetricCircle
              label={t('activityLog.metric.steps')}
              value={stepsInput}
              onChange={setStepsInput}
              placeholder={t('activityLog.ph.steps')}
            />
            <MetricCircle
              label={t('activityLog.metric.distance')}
              suffix="km"
              value={distanceKm}
              onChange={setDistanceKm}
              placeholder={t('activityLog.ph.distance')}
            />
            <MetricCircle
              label={t('activityLog.metric.calories')}
              suffix="kcal"
              value={calories}
              onChange={setCalories}
              placeholder={t('activityLog.ph.calories')}
            />
          </div>

          <div
            className="flex items-center gap-3 rounded-2xl border px-4 py-3"
            style={{ background: 'var(--card-subtle)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
              style={{ background: 'linear-gradient(135deg,#3bb2ff,#5f7aff)', color: '#fff' }}
            >
              ✨
            </span>
            <div>
                <p className="text-sm font-semibold text-slate-900">
                  {t('activityLog.recommendedGoal', {
                    min: recommendedRange.min.toLocaleString(),
                    max: recommendedRange.max.toLocaleString(),
                  })}
                </p>
                <p className="text-[11px] text-slate-500">
                  {t('activityLog.recommendedGoalHint')}
                </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleSaveActivity}
              disabled={savingActivity}
              className="w-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {savingActivity ? t('activityLog.saving') : t('activityLog.saveActivity')}
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="mx-auto block text-xs font-medium text-slate-500 transition hover:text-slate-900"
            >
              {t('activityLog.updateWeightGoals')}
            </button>
          </div>
        </section>

        {toast && (
          <div
            className="fixed left-1/2 bottom-6 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg"
            style={{ background: 'rgba(15,23,42,0.92)', color: '#f9fafb' }}
          >
            {toast}
          </div>
        )}

        {/* Disclaimer */}
        <div className="pt-4">
          <p className="text-[11px] leading-relaxed text-slate-500 text-center">
            {t('detail.common.disclaimer')}
          </p>
        </div>
      </div>
    </main>
  )
}

function SummaryChip({ icon, label }: { icon: string; label: string }) {
  return (
    <span
      className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium"
      style={{ background: 'rgba(56,189,248,0.12)', color: 'var(--text-main)', border: '1px solid rgba(56,189,248,0.18)' }}
    >
      <span>{icon}</span>
      {label}
    </span>
  )
}

function MetricCircle({
  label,
  suffix,
  value,
  onChange,
  placeholder,
}: {
  label: string
  suffix?: string
  value: number | ''
  onChange: (next: number | '') => void
  placeholder?: string
}) {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-2xl border px-4 py-4"
      style={{ background: 'var(--card-subtle)', borderColor: 'var(--border-subtle)' }}
    >
      <span className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-400">{label}</span>
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3bb2ff" />
              <stop offset="100%" stopColor="#5f7aff" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="44" stroke="rgba(148,163,184,0.3)" strokeWidth="6" fill="none" />
          <circle cx="50" cy="50" r="44" stroke="url(#grad-${label})" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={`${Math.PI * 2 * 44 * 0.4} ${Math.PI * 2 * 44}`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <input
            type="number"
            value={value}
            onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value) || 0)}
            placeholder={placeholder}
            className="w-16 border-b text-center text-sm font-semibold focus:outline-none focus:border-sky-400"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)', background: 'transparent' }}
          />
          {suffix && <span className="text-[10px] text-slate-400">{suffix}</span>}
        </div>
      </div>
    </div>
  )
}
