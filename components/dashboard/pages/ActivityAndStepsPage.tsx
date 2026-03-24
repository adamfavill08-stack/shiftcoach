'use client'

import React, { useMemo, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useActivityToday } from '@/lib/hooks/useActivityToday'
import { ActivityLevelSelector } from '@/components/activity/ActivityLevelSelector'
import { generateActivityRecommendation } from '@/lib/activity/generateActivityRecommendation'
import { getMyProfile } from '@/lib/profile'
import { useTranslation } from '@/components/providers/language-provider'

/** Match Steps / dashboard: theme tokens only (no extra blue wash) */
const premiumSectionClass =
  'rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-4 transition-all duration-200 w-full max-w-[430px] mx-auto'

const premiumSectionStyle: React.CSSProperties = {
  backgroundColor: 'var(--card)',
  borderColor: 'var(--border-subtle)',
  boxShadow: 'var(--shadow-soft)',
}

const insetPanelClass = 'rounded-2xl border px-3 py-2 backdrop-blur-xl'

const insetPanelStyle: React.CSSProperties = {
  backgroundColor: 'var(--card-subtle)',
  borderColor: 'var(--border-subtle)',
}

function percentage(value: number, target: number) {
  if (target <= 0) return 0
  const pct = (value / target) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

/** Ring gauge aligned with Steps page: neutral track, solid semantic progress */
function CircularGauge({
  value,
  max,
  label,
  subLabel,
  color = 'emerald',
  sizePx = 56,
}: {
  value: number
  max: number
  label: string
  subLabel?: string
  color?: 'emerald' | 'blue' | 'amber'
  sizePx?: number
}) {
  const pct = percentage(value, max)
  const stroke = Math.max(4, Math.round(sizePx * 0.078))
  const r = (sizePx - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = pct > 0 ? (pct / 100) * c : 0

  const progressStroke =
    color === 'emerald' ? '#10b981' : color === 'amber' ? '#f59e0b' : 'var(--text-main)'

  return (
    <div className="relative mx-auto flex-shrink-0" style={{ width: sizePx, height: sizePx }}>
      <svg
        width={sizePx}
        height={sizePx}
        viewBox={`0 0 ${sizePx} ${sizePx}`}
        className="block -rotate-90"
        aria-hidden
      >
        <circle
          cx={sizePx / 2}
          cy={sizePx / 2}
          r={r}
          fill="none"
          style={{ stroke: 'var(--ring-bg)' }}
          strokeWidth={stroke}
        />
        {pct > 0 && (
          <circle
            cx={sizePx / 2}
            cy={sizePx / 2}
            r={r}
            fill="none"
            stroke={progressStroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            style={{ transition: 'stroke-dasharray 0.65s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        )}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[15px] font-semibold tabular-nums leading-none" style={{ color: 'var(--text-main)' }}>
          {value}
        </span>
        {subLabel ? (
          <span className="mt-0.5 max-w-[4.5rem] truncate text-[9px] font-medium leading-tight" style={{ color: 'var(--text-soft)' }}>
            ({subLabel})
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default function ActivityAndStepsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { data, loading } = useActivityToday()
  const [profile, setProfile] = useState<{ weight_kg: number | null } | null>(null)
  const [lastSleepHours, setLastSleepHours] = useState<number | null>(null)
  const [sleepDebtHours, setSleepDebtHours] = useState<number>(0)
  const [lastWearableSync, setLastWearableSync] = useState<number | null>(null)

  // Fetch profile for weight
  useEffect(() => {
    getMyProfile().then(p => {
      if (p) setProfile(p)
    })
  }, [])

  // Load last wearable sync from localStorage and listen for updates
  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadFromStorage = () => {
      const ts = window.localStorage.getItem('wearables:lastSyncedAt')
      if (ts) {
        const n = Number(ts)
        if (!Number.isNaN(n)) setLastWearableSync(n)
      }
    }

    loadFromStorage()

    const handleSynced = (e: Event) => {
      const detailTs = (e as CustomEvent).detail?.ts as number | undefined
      if (detailTs && typeof detailTs === 'number') {
        setLastWearableSync(detailTs)
      } else {
        loadFromStorage()
      }
    }

    window.addEventListener('wearables-synced', handleSynced as EventListener)

    return () => {
      window.removeEventListener('wearables-synced', handleSynced as EventListener)
    }
  }, [])

  // Fetch sleep data
  useEffect(() => {
    const fetchSleepData = async () => {
      try {
        // Get last sleep hours (last 24h)
        const sleepRes = await fetch('/api/sleep/today', { credentials: 'include' })
        if (sleepRes.ok) {
          const sleepData = await sleepRes.json()
          if (sleepData.sleep?.totalHours) {
            setLastSleepHours(sleepData.sleep.totalHours)
          }
        }

        // Get sleep deficit
        const deficitRes = await fetch('/api/sleep/deficit', { next: { revalidate: 30 } })
        if (deficitRes.ok) {
          const deficitData = await deficitRes.json()
          if (deficitData.deficitHours !== undefined) {
            setSleepDebtHours(Math.max(0, deficitData.deficitHours))
          }
        }
      } catch (err) {
        console.error('[ActivityAndStepsPage] Error fetching sleep data:', err)
      }
    }
    fetchSleepData()
  }, [])

  // Use real intensity breakdown from API, with smart fallbacks
  const intensityBreakdown = data.intensityBreakdown ?? {
    light: { minutes: 0, target: 10 },
    moderate: { minutes: 0, target: 15 },
    vigorous: { minutes: 0, target: 5 },
    totalActiveMinutes: 0,
  }
  
  // Use total active minutes from breakdown (which includes smart estimation)
  const activeMinutes = loading 
    ? 0 
    : (intensityBreakdown.totalActiveMinutes > 0 
        ? intensityBreakdown.totalActiveMinutes 
        : Math.max(0, data.activeMinutes ?? 0))
  const targetMinutes = intensityBreakdown.light.target + intensityBreakdown.moderate.target + intensityBreakdown.vigorous.target
  const activePct = percentage(activeMinutes, targetMinutes)
  
  // Movement consistency (from API, ready for wearable data)
  const movementConsistency = data.movementConsistency ?? 0
  const consistencyData = data.movementConsistencyData

  const hasConsistencyData =
    !!(consistencyData && Array.isArray(consistencyData.dailyData) && consistencyData.dailyData.some((d: any) => d.hasData))

  // Recovery and Activity scores (from API)
  const recoveryScore = data.recoveryScore ?? 50
  const recoveryLevel = data.recoveryLevel ?? 'Moderate'
  const recoveryDescription = data.recoveryDescription ?? 'Recovery data not available.'
  const activityScore = data.activityScore ?? 0
  const activityLevel = data.activityLevel ?? 'Low'
  const activityDescription = data.activityDescription ?? 'Activity data not available.'

  const hasRecoveryData = data.recoveryScore != null && recoveryDescription !== 'Recovery data not available.'
  const hasActivityData = data.activityScore != null && activityDescription !== 'Activity data not available.'

  // Human-friendly source label for activity data
  const activitySourceLabel = useMemo(() => {
    const raw = (data as any).source as string | undefined
    if (!raw) return 'Source: Not connected – log steps manually or connect a wearable.'
    const lower = raw.toLowerCase()
    if (lower.includes('google')) return 'Source: Google Fit'
    if (lower.includes('fitbit')) return 'Source: Fitbit'
    if (lower.includes('apple')) return 'Source: Apple Health'
    if (lower.includes('manual') || lower === 'unknown') return 'Source: Not connected – log steps manually or connect a wearable.'
    return `Source: ${raw}`
  }, [data])

  // Human-friendly "last synced" label
  const wearableLastSyncLabel = useMemo(() => {
    if (!lastWearableSync) return 'Last sync: not yet'
    const diffMs = Date.now() - lastWearableSync
    const diffMin = Math.round(diffMs / 60000)
    if (diffMin < 2) return 'Last sync: just now'
    if (diffMin < 60) return `Last sync: ${diffMin} min ago`
    const diffH = Math.round(diffMin / 60)
    if (diffH < 24) return `Last sync: ${diffH} h ago`
    const diffD = Math.round(diffH / 24)
    return `Last sync: ${diffD} day${diffD > 1 ? 's' : ''} ago`
  }, [lastWearableSync])

  // Generate activity recommendation with real data
  const activityRecommendation = useMemo(() => {
    return generateActivityRecommendation({
      recoveryScore,
      activityScore,
      shiftType: data.shiftType === 'night' ? 'night' : data.shiftType === 'day' ? 'day' : data.shiftType === 'off' ? 'off' : 'other',
      shiftActivityLevel: data.shiftActivityLevel ?? null,
      lastSleepHours,
      sleepDebtHours,
    })
  }, [recoveryScore, activityScore, data.shiftType, data.shiftActivityLevel, lastSleepHours, sleepDebtHours])

  // Use real movement plan from API, with fallback
  const movementPlan = data.movementPlan ?? {
    title: 'Daily movement plan',
    activities: [
      { label: 'Morning walk', timing: 'Morning', duration: '10-15 min' },
      { label: 'Midday break', timing: 'Midday', duration: '10 min' },
      { label: 'Evening stretch', timing: 'Evening', duration: '10-15 min' },
    ],
    intensity: 'Moderate' as const,
    shiftType: 'other' as const,
  }

  const heroRing = useMemo(() => {
    const size = 72
    const stroke = 8
    const r = (size - stroke) / 2
    const c = 2 * Math.PI * r
    const dash = (activePct / 100) * c
    return { size, stroke, r, c, dash }
  }, [activePct])

  return (
    <main
      style={{
        backgroundImage: 'radial-gradient(circle at top, var(--bg-soft), var(--bg))',
      }}
    >
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-28 pt-4 flex flex-col gap-5">
        <header className="flex items-center gap-2 mb-2">
          <Link
            href="/dashboard"
            className="p-2 rounded-full backdrop-blur-xl border transition-all min-h-11 min-w-11 flex items-center justify-center"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card-subtle)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card)'
            }}
            aria-label={t('detail.common.backToDashboard')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xl font-semibold tracking-tight truncate" style={{ color: 'var(--text-main)' }}>
              {t('browse.activity.title')}
            </h1>
            <p className="text-sm truncate" style={{ color: 'var(--text-soft)' }}>
              {t('browse.activity.desc')}
            </p>
          </div>
        </header>
        
        {/* Activity summary */}
        <section className={premiumSectionClass} style={premiumSectionStyle}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Activity
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className="rounded-full border px-2.5 py-1 text-[11px]"
                  style={{
                    backgroundColor: 'var(--card-subtle)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-soft)',
                  }}
                >
                  {activitySourceLabel.startsWith('Source: ') ? activitySourceLabel : `Source: ${activitySourceLabel}`}
                </span>
                <span
                  className="rounded-full border px-2.5 py-1 text-[11px]"
                  style={{
                    backgroundColor: 'var(--card-subtle)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-soft)',
                  }}
                >
                  {wearableLastSyncLabel}
                </span>
              </div>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1 min-w-0">
                <h2 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>
                  {activeMinutes}{' '}
                  <span className="text-sm font-medium" style={{ color: 'var(--text-soft)' }}>
                    active min
                  </span>
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                  {activeMinutes > 0
                    ? `${activePct}% of daily movement target`
                    : 'No activity logged yet. A 10–15 minute walk is a great place to start.'}
                </p>
              </div>

              <div className="relative flex-shrink-0" style={{ width: heroRing.size, height: heroRing.size }} aria-hidden>
                <svg width={heroRing.size} height={heroRing.size} viewBox={`0 0 ${heroRing.size} ${heroRing.size}`} className="block -rotate-90">
                  <circle
                    cx={heroRing.size / 2}
                    cy={heroRing.size / 2}
                    r={heroRing.r}
                    style={{ stroke: 'var(--ring-bg)' }}
                    strokeWidth={heroRing.stroke}
                    fill="none"
                  />
                  <circle
                    cx={heroRing.size / 2}
                    cy={heroRing.size / 2}
                    r={heroRing.r}
                    style={{ stroke: 'var(--text-main)' }}
                    strokeWidth={heroRing.stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${heroRing.dash} ${heroRing.c - heroRing.dash}`}
                    fill="none"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-semibold tabular-nums leading-none" style={{ color: 'var(--text-main)' }}>
                    {activePct}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className={`${insetPanelClass} p-2 space-y-0`} style={insetPanelStyle}>
              {[
                {
                  label: 'Light',
                  minutes: intensityBreakdown.light.minutes,
                  target: intensityBreakdown.light.target,
                },
                {
                  label: 'Moderate',
                  minutes: intensityBreakdown.moderate.minutes,
                  target: intensityBreakdown.moderate.target,
                },
                {
                  label: 'Vigorous',
                  minutes: intensityBreakdown.vigorous.minutes,
                  target: intensityBreakdown.vigorous.target,
                },
              ].map((item, index) => {
                const pct = percentage(item.minutes, item.target)

                return (
                  <React.Fragment key={item.label}>
                    <div className="rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--card-subtle)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                          {item.label}
                        </p>
                        <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text-main)' }}>
                          {item.minutes}/{item.target}{' '}
                          <span className="font-medium" style={{ color: 'var(--text-soft)' }}>
                            min
                          </span>
                          {item.target > 0 && (
                            <span className="ml-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>
                              ({Math.round(pct)}%)
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ring-bg)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-300 bg-slate-600"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                    {index < 2 && (
                      <div className="h-px my-2" style={{ borderTop: '1px solid var(--border-subtle)' }} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => router.push('/steps')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 min-h-10 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-violet-500 hover:brightness-110 active:scale-[0.98] transition-all shadow-sm"
            >
              Open detailed steps
              <ChevronRight className="h-4 w-4 opacity-90" />
            </button>

            <div className={`${insetPanelClass} p-3`} style={insetPanelStyle}>
              <p className="text-xs font-semibold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <Sparkles className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                Best next step
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                A short walk in the next hour can boost alertness without affecting sleep later.
              </p>
            </div>
          </div>
        </section>

        {/* Shift demand */}
        <section className={premiumSectionClass} style={premiumSectionStyle}>
          <ActivityLevelSelector
            currentLevel={data.shiftActivityLevel ?? null}
            weightKg={profile?.weight_kg ?? 75}
            onSelect={(level) => {
              window.dispatchEvent(new CustomEvent('activity-level-updated', { detail: { level } }))
            }}
          />
        </section>

        {/* Movement consistency */}
        <section className={premiumSectionClass} style={premiumSectionStyle}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Movement consistency
              </p>
              <div className="mt-3">
                <h2 className="text-xl font-semibold tracking-tight tabular-nums" style={{ color: 'var(--text-main)' }}>
                  {hasConsistencyData ? movementConsistency : '—'}
                </h2>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                  {hasConsistencyData ? (
                    <>
                      This week
                      {consistencyData?.weeklyAverageSteps && (
                        <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
                          • Avg {consistencyData.weeklyAverageSteps.toLocaleString()} steps/day
                        </span>
                      )}
                    </>
                  ) : (
                    'Log steps for a few days or connect a wearable to see how consistent your movement pattern is.'
                  )}
                </p>
              </div>
            </div>
            
            {/* Day-by-day visualization */}
            {hasConsistencyData && consistencyData && consistencyData.dailyData.length > 0 ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-end justify-between gap-1">
                  {consistencyData.dailyData.map((day, idx) => {
                    const maxSteps = Math.max(...consistencyData.dailyData.map(d => d.steps), 1)
                    const height = maxSteps > 0 ? (day.steps / maxSteps) * 100 : 0
                    const hasData = day.hasData
                    const isWearable = day.source && day.source !== 'Manual entry' && day.source !== 'manual'
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        {/* Bar visualization */}
                        <div className="relative w-full flex items-end justify-center" style={{ height: '36px' }}>
                          {hasData ? (
                            <div
                              className={`w-full rounded-t transition-all duration-200 ${
                                isWearable
                                  ? 'bg-gradient-to-t from-slate-600 to-slate-500'
                                  : 'bg-gradient-to-t from-slate-400 to-slate-300'
                              }`}
                              style={{ 
                                height: `${Math.max(height, 5)}%`,
                                minHeight: height > 0 ? '4px' : '0',
                              }}
                              title={`${day.steps.toLocaleString()} steps${day.source ? ` (${day.source})` : ''}`}
                            />
                          ) : (
                            <div className="w-full h-0.5 rounded-full" style={{ backgroundColor: 'var(--ring-bg)' }} />
                          )}
                        </div>
                        
                        {/* Day label */}
                        <span
                          className="text-xs font-medium tracking-tight"
                          style={{ color: hasData ? 'var(--text-main)' : 'var(--text-muted)' }}
                        >
                          {day.dayLabel}
                        </span>
                        
                        {/* Steps count (small) */}
                        {hasData && day.steps > 0 && (
                          <span className="text-[10px] leading-tight tabular-nums" style={{ color: 'var(--text-soft)' }}>
                            {day.steps > 999 ? `${(day.steps / 1000).toFixed(1)}k` : day.steps}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                
                {/* Source indicator */}
                {consistencyData.dailyData.some(d => d.source && d.source !== 'Manual entry' && d.source !== 'manual') && (
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-slate-600" />
                      <span className="text-[10px]" style={{ color: 'var(--text-soft)' }}>
                        Wearable
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="text-[10px]" style={{ color: 'var(--text-soft)' }}>
                        Manual
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 pt-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <span key={idx} className="text-xs font-medium flex-1 text-center" style={{ color: 'var(--text-muted)' }}>
                    {day}
                  </span>
                ))}
              </div>
            )}
            
            {/* Insights */}
            {hasConsistencyData && consistencyData && consistencyData.insights.length > 0 && (
              <div className="pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                  {consistencyData.insights[0]}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Shift movement plan */}
        <section className={premiumSectionClass} style={premiumSectionStyle}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Today&apos;s shift movement plan
              </p>
              <h2 className="mt-2 text-base font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>
                {movementPlan.title}
              </h2>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
              <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>
                {movementPlan.intensity}
              </span>
              <span className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                Intensity
              </span>
            </div>
          </div>

          <div className={`${insetPanelClass} p-2 space-y-0`} style={insetPanelStyle}>
            {movementPlan.activities.map((activity, idx) => (
              <React.Fragment key={idx}>
                <div className="rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--card-subtle)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                          {activity.duration} {activity.label}
                        </span>
                        {activity.suggestedTime && (
                          <span
                            className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
                            style={{
                              backgroundColor: 'var(--card)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-soft)',
                            }}
                          >
                            {activity.suggestedTime}
                          </span>
                        )}
                      </div>
                      {activity.description && (
                        <p className="text-sm leading-relaxed mb-1.5" style={{ color: 'var(--text-soft)' }}>
                          {activity.description}
                        </p>
                      )}
                      <span className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                        {activity.timing}
                      </span>
                    </div>
                  </div>
                </div>
                {idx < movementPlan.activities.length - 1 && (
                  <div className="h-px my-2" style={{ borderTop: '1px solid var(--border-subtle)' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* Recovery & activity */}
        <section className={premiumSectionClass} style={premiumSectionStyle}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Recovery &amp; activity
          </p>

          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <CircularGauge
                value={recoveryScore}
                max={100}
                label="Recovery"
                subLabel={recoveryLevel}
                color={recoveryScore >= 75 ? 'emerald' : recoveryScore >= 50 ? 'blue' : 'amber'}
                sizePx={52}
              />
              <div className="w-full space-y-1">
                <h3 className="text-xs font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>
                  Recovery
                </h3>
                <p className="text-[11px] leading-snug" style={{ color: 'var(--text-soft)' }}>
                  {hasRecoveryData
                    ? recoveryDescription
                    : 'Log a few nights of sleep to unlock your personalised recovery score.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center space-y-3">
              <CircularGauge
                value={activityScore}
                max={100}
                label="Activity"
                subLabel={activityLevel}
                color={activityScore >= 70 ? 'emerald' : activityScore >= 50 ? 'blue' : activityScore >= 30 ? 'amber' : 'blue'}
                sizePx={52}
              />
              <div className="w-full space-y-1">
                <h3 className="text-xs font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>
                  Activity
                </h3>
                <p className="text-[11px] leading-snug" style={{ color: 'var(--text-soft)' }}>
                  {hasActivityData
                    ? activityDescription
                    : 'Log steps or connect a wearable to see how your daily movement compares to your target.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Recommendation */}
        <section className={premiumSectionClass} style={premiumSectionStyle}>
          <h2 className="text-[17px] font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>
            Today&apos;s recommendation
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>
            {activityRecommendation}
          </p>
        </section>

        <div className="pt-1 pb-2">
          <p className="text-[11px] leading-relaxed text-center" style={{ color: 'var(--text-muted)' }}>
            Shift Coach is a coaching tool and does not provide medical advice. For medical conditions, pregnancy or
            complex health issues, please check your plan with a registered professional.
          </p>
        </div>
      </div>
    </main>
  )
}
