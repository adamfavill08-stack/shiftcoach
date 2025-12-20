'use client'

import React, { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Sparkles } from 'lucide-react'
import { useActivityToday } from '@/lib/hooks/useActivityToday'
import { ActivityLevelSelector } from '@/components/activity/ActivityLevelSelector'
import { generateActivityRecommendation } from '@/lib/activity/generateActivityRecommendation'
import { getMyProfile } from '@/lib/profile'

function formatMinutes(total?: number | null) {
  if (!total || total <= 0) return '—'
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (!hours) return `${minutes}m`
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

function percentage(value: number, target: number) {
  if (target <= 0) return 0
  const pct = (value / target) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

function CircularGauge({ value, max, label, subLabel, color = 'emerald' }: { 
  value: number; 
  max: number; 
  label: string; 
  subLabel?: string;
  color?: 'emerald' | 'blue' | 'amber';
}) {
  const pct = percentage(value, max)
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const strokeLength = (pct / 100) * circumference
  
  const strokeColor = color === 'emerald' 
    ? '#10b981' 
    : color === 'amber'
    ? '#f59e0b'
    : '#3b82f6'

  return (
    <div className="relative h-28 w-28 flex-shrink-0 mx-auto">
      {/* Ring container */}
      <div className="relative h-28 w-28 rounded-full bg-white/60 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_rgba(0,0,0,0.2)]">
        <div className="absolute inset-2 rounded-full border border-slate-200/40 dark:border-slate-700/30 bg-white/50 dark:bg-slate-900/40" />
        
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full transform -rotate-90">
          <defs>
            <linearGradient id={`trackGradient-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
            <linearGradient id={`activeGradient-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={strokeColor} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.8" />
            </linearGradient>
          </defs>
          
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={`url(#trackGradient-${label})`}
            strokeWidth="6"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={`url(#activeGradient-${label})`}
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <div className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums leading-none">{value}</div>
          {subLabel && (
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 leading-tight">({subLabel})</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ActivityAndStepsPage() {
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
        const deficitRes = await fetch('/api/sleep/deficit', { cache: 'no-store' })
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
  const hasAnyActivity =
    activeMinutes > 0 || hasConsistencyData
  
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

  return (
    <div className="min-h-full w-full bg-transparent">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 pb-24 pt-6">
        
        {/* INTENSITY BREAKDOWN Card */}
        <section
          className={[
            "relative overflow-hidden rounded-3xl",
            "bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl",
            "border border-slate-200/50 dark:border-slate-700/40",
            "text-slate-900 dark:text-slate-100",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)]",
            "dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]",
            "p-6",
          ].join(" ")}
        >
          {/* Highlight overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
          
          {/* Subtle colored glow hints - dark mode only */}
          <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
          
          {/* Inner ring for premium feel */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />

          <div className="relative z-10 space-y-5">
            {/* Quiet metadata row */}
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 dark:text-slate-400 uppercase">
                ACTIVITY
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/40 px-2.5 py-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {activitySourceLabel.startsWith('Source: ') ? activitySourceLabel : `Source: ${activitySourceLabel}`}
                </span>
                <span className="rounded-full bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/40 px-2.5 py-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {wearableLastSyncLabel}
                </span>
              </div>
            </div>
            
            {/* Instrument header + ring */}
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 space-y-2">
                <h3 className="text-[22px] font-semibold tracking-tight">
                  {activeMinutes} <span>Active minutes</span>
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 max-w-prose">
                  {activeMinutes > 0
                    ? `${activePct}% of daily target`
                    : 'No activity logged yet. A 10–15 minute walk is a great place to start.'}
                </p>
              </div>
              
              {/* Crafted ring */}
              <div className="relative grid place-items-center flex-shrink-0">
                <div className="relative h-32 w-32 rounded-full border-[10px] border-slate-200/60 dark:border-slate-700/40 bg-white/60 dark:bg-slate-800/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_rgba(0,0,0,0.2)] grid place-items-center">
                  <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums leading-none">{activePct}</p>
                </div>
              </div>
            </div>
            
            {/* Soft activity rows */}
            <div className="mt-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/40 bg-white/60 dark:bg-slate-800/50 p-2">
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
                    <div className="rounded-2xl px-4 py-3 bg-slate-50/35 dark:bg-slate-800/30">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</p>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {item.minutes}/{item.target} <span className="text-slate-500 dark:text-slate-400 font-medium">min</span>
                          {item.target > 0 && (
                            <span className="ml-2 text-slate-400 dark:text-slate-500 font-medium">({Math.round(pct)}%)</span>
                          )}
                        </p>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-200/60 dark:bg-slate-700/50 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-slate-400/60 dark:bg-slate-500/60 transition-all duration-300"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                    {index < 2 && (
                      <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 dark:via-slate-700/50 to-transparent my-2" />
                    )}
                  </React.Fragment>
                )
              })}
            </div>

            {/* Calm CTA */}
            <button
              onClick={() => router.push('/steps')}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-[0_10px_26px_-16px_rgba(0,0,0,0.20)] dark:shadow-[0_10px_26px_-16px_rgba(0,0,0,0.3)] hover:bg-white/90 dark:hover:bg-slate-800/70 transition"
            >
              Open detailed steps
              <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </button>

            {/* Coach micro-insight */}
            <div className="mt-5 rounded-2xl p-4 bg-gradient-to-br from-slate-50/70 dark:from-slate-800/50 to-white dark:to-slate-900/50 border border-slate-200/50 dark:border-slate-700/40">
              <p className="text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                Best next step
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                A short walk in the next hour can boost alertness without affecting sleep later.
              </p>
            </div>
          </div>
        </section>

        {/* ACTIVITY LEVEL SELECTOR Card */}
        <section
          className={[
            "relative overflow-hidden rounded-3xl",
            "bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl",
            "border border-slate-200/50 dark:border-slate-700/40",
            "text-slate-900 dark:text-slate-100",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)]",
            "dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]",
            "p-6",
          ].join(" ")}
        >
          {/* Highlight overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
          
          {/* Subtle colored glow hints - dark mode only */}
          <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
          
          {/* Inner ring for premium feel */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />

          <div className="relative z-10">
            <ActivityLevelSelector
              currentLevel={data.shiftActivityLevel ?? null}
              weightKg={profile?.weight_kg ?? 75}
              onSelect={(level) => {
                // Trigger refresh of activity data
                window.dispatchEvent(new CustomEvent('activity-level-updated', { detail: { level } }))
              }}
            />
          </div>
        </section>

        {/* MOVEMENT CONSISTENCY Card */}
        <section
          className={[
            "relative overflow-hidden rounded-3xl",
            "bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl",
            "border border-slate-200/50 dark:border-slate-700/40",
            "text-slate-900 dark:text-slate-100",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)]",
            "dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]",
            "p-6",
          ].join(" ")}
        >
          {/* Highlight overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
          
          {/* Subtle colored glow hints - dark mode only */}
          <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
          
          {/* Inner ring for premium feel */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />

          <div className="relative z-10 space-y-5">
            {/* Editorial Header */}
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 dark:text-slate-400 uppercase">
                MOVEMENT CONSISTENCY
              </p>
              <div className="mt-3">
                <h3 className="text-[22px] font-semibold tracking-tight tabular-nums">
                  {hasConsistencyData ? movementConsistency : '—'}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {hasConsistencyData ? (
                    <>
                      This week
                      {consistencyData?.weeklyAverageSteps && (
                        <span className="ml-2 text-slate-400">
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
              <div className="space-y-3 pt-2">
                <div className="flex items-end justify-between gap-1.5">
                  {consistencyData.dailyData.map((day, idx) => {
                    const maxSteps = Math.max(...consistencyData.dailyData.map(d => d.steps), 1)
                    const height = maxSteps > 0 ? (day.steps / maxSteps) * 100 : 0
                    const hasData = day.hasData
                    const isWearable = day.source && day.source !== 'Manual entry' && day.source !== 'manual'
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                        {/* Bar visualization */}
                        <div className="relative w-full flex items-end justify-center" style={{ height: '48px' }}>
                          {hasData ? (
                            <div
                              className={`w-full rounded-t transition-all duration-200 ${
                                isWearable
                                  ? 'bg-gradient-to-t from-indigo-500/80 to-indigo-400/80'
                                  : 'bg-gradient-to-t from-slate-400/70 to-slate-300/70'
                              }`}
                              style={{ 
                                height: `${Math.max(height, 5)}%`,
                                minHeight: height > 0 ? '4px' : '0',
                              }}
                              title={`${day.steps.toLocaleString()} steps${day.source ? ` (${day.source})` : ''}`}
                            />
                          ) : (
                            <div className="w-full h-0.5 bg-slate-200/60 rounded-full" />
                          )}
                        </div>
                        
                        {/* Day label */}
                        <span className={`text-xs font-medium tracking-tight ${
                          hasData ? 'text-slate-700' : 'text-slate-400'
                        }`}>
                          {day.dayLabel}
                        </span>
                        
                        {/* Steps count (small) */}
                        {hasData && day.steps > 0 && (
                          <span className="text-[10px] text-slate-500 leading-tight tabular-nums">
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
                      <div className="w-2 h-2 rounded-full bg-indigo-500/70" />
                      <span className="text-[10px] text-slate-500">Wearable</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-slate-400/70" />
                      <span className="text-[10px] text-slate-500">Manual</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 pt-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <span key={idx} className="text-xs font-medium text-slate-400 flex-1 text-center">
                    {day}
                  </span>
                ))}
              </div>
            )}
            
            {/* Insights */}
            {hasConsistencyData && consistencyData && consistencyData.insights.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {consistencyData.insights[0]}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* TODAY'S SHIFT MOVEMENT PLAN Card */}
        <section
          className={[
            "relative overflow-hidden rounded-3xl",
            "bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl",
            "border border-slate-200/50 dark:border-slate-700/40",
            "text-slate-900 dark:text-slate-100",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)]",
            "dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]",
            "p-6",
          ].join(" ")}
        >
          {/* Highlight overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
          
          {/* Subtle colored glow hints - dark mode only */}
          <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
          
          {/* Inner ring for premium feel */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />

          <div className="relative z-10 space-y-5">
            {/* Editorial Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 dark:text-slate-400 uppercase">
                  TODAY'S SHIFT MOVEMENT PLAN
                </p>
                <h3 className="mt-3 text-[17px] font-semibold tracking-tight">
                  {movementPlan.title}
                </h3>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-sm font-semibold tracking-tight">
                  {movementPlan.intensity}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.12em]">
                  Intensity
                </span>
              </div>
            </div>

            {/* Soft Activity Rows */}
            <div className="rounded-2xl border border-slate-200/50 dark:border-slate-700/40 bg-white/60 dark:bg-slate-800/50 p-2">
              {movementPlan.activities.map((activity, idx) => (
                <React.Fragment key={idx}>
                  <div className="rounded-2xl px-4 py-3 bg-slate-50/35 dark:bg-slate-800/30">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {activity.duration} {activity.label}
                          </span>
                          {activity.suggestedTime && (
                            <span className="rounded-full bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/40 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                              {activity.suggestedTime}
                            </span>
                          )}
                        </div>
                        {activity.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-1.5">
                            {activity.description}
                          </p>
                        )}
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.12em]">
                          {activity.timing}
                        </span>
                      </div>
                    </div>
                  </div>
                  {idx < movementPlan.activities.length - 1 && (
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 dark:via-slate-700/50 to-transparent my-2" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* Recovery & activity Card */}
        <section
          className={[
            "relative overflow-hidden rounded-3xl",
            "bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl",
            "border border-slate-200/50 dark:border-slate-700/40",
            "text-slate-900 dark:text-slate-100",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)]",
            "dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]",
            "p-6",
          ].join(" ")}
        >
          {/* Highlight overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
          
          {/* Subtle colored glow hints - dark mode only */}
          <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
          
          {/* Inner ring for premium feel */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />

          <div className="relative z-10 space-y-6">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 dark:text-slate-400 uppercase">
              RECOVERY & ACTIVITY
            </p>
            
            <div className="grid grid-cols-2 gap-8">
              {/* Recovery */}
              <div className="flex flex-col items-center text-center space-y-4">
                <CircularGauge 
                  value={recoveryScore} 
                  max={100} 
                  label="Recovery"
                  subLabel={recoveryLevel}
                  color={recoveryScore >= 75 ? 'emerald' : recoveryScore >= 50 ? 'blue' : 'amber'}
                />
                <div className="space-y-2 w-full">
                  <h3 className="text-sm font-semibold tracking-tight">
                    Recovery
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {hasRecoveryData
                      ? recoveryDescription
                      : 'Log a few nights of sleep to unlock your personalised recovery score.'}
                  </p>
                </div>
              </div>
              
              {/* Activity */}
              <div className="flex flex-col items-center text-center space-y-4">
                <CircularGauge 
                  value={activityScore} 
                  max={100} 
                  label="Activity"
                  subLabel={activityLevel}
                  color={activityScore >= 70 ? 'emerald' : activityScore >= 50 ? 'blue' : activityScore >= 30 ? 'amber' : 'blue'}
                />
                <div className="space-y-2 w-full">
                  <h3 className="text-sm font-semibold tracking-tight">
                    Activity
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {hasActivityData
                      ? activityDescription
                      : 'Log steps or connect a wearable to see how your daily movement compares to your target.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Today's Recommendation Card */}
        <section
          className={[
            "relative overflow-hidden rounded-3xl",
            "bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl",
            "border border-slate-200/50 dark:border-slate-700/40",
            "text-slate-900 dark:text-slate-100",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)]",
            "dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]",
            "p-6",
          ].join(" ")}
        >
          {/* Highlight overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
          
          {/* Subtle colored glow hints - dark mode only */}
          <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
          
          {/* Inner ring for premium feel */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />

          <div className="relative z-10 space-y-4">
            <h3 className="text-[17px] font-semibold tracking-tight">
              Today's Recommendation
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {activityRecommendation}
            </p>
          </div>
        </section>

        {/* Disclaimer */}
        <div className="pt-2">
          <p className="text-[11px] leading-relaxed text-slate-500 text-center">
            Shift Coach is a coaching tool and does not provide medical advice. For medical conditions, pregnancy or complex health issues, please check your plan with a registered professional.
          </p>
        </div>
      </div>
    </div>
  )
}
