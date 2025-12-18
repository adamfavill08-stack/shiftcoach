'use client'

import { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
      <svg viewBox="0 0 100 100" className="h-full w-full transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="rgba(15,23,42,0.08)"
          strokeWidth="7"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={strokeColor}
          strokeWidth="7"
          fill="none"
          strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 2px 4px ${strokeColor}40)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-lg font-bold tracking-tight text-slate-900 leading-none">{value}</div>
        {subLabel && (
          <div className="text-[10px] text-slate-500 mt-1 leading-tight">({subLabel})</div>
        )}
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
    <div className="min-h-full w-full bg-slate-50">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 pb-24 pt-6">
        
        {/* INTENSITY BREAKDOWN Card */}
        <section
          className={[
            "relative overflow-hidden rounded-[28px]",
            "bg-white/90 backdrop-blur-2xl",
            "border border-white/90",
            "shadow-[0_24px_60px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.5)]",
            "px-7 py-6",
          ].join(" ")}
        >
          {/* Ultra-premium gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 via-white/85 to-white/70" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20" />
          <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/60" />
          <div className="pointer-events-none absolute inset-[1px] rounded-[27px] ring-1 ring-white/30" />
          <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-blue-100/30 via-purple-100/20 to-transparent blur-xl opacity-50" />

          <div className="relative z-10 space-y-5">
            <div className="space-y-0.5">
              <h2 className="sc-section-label">
                ACTIVITY
              </h2>
              <p className="sc-body">
                {activitySourceLabel}
              </p>
              <p className="sc-body">
                {wearableLastSyncLabel}
              </p>
            </div>
            
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 space-y-1">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  {activeMinutes} Active Minutes
                </h1>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {activeMinutes > 0
                    ? `${activePct}% of daily target`
                    : 'No activity logged yet today. A 10–15 minute walk is a great place to start.'}
                </p>
                
                <div className="mt-4 space-y-3">
                  {[
                    { 
                      label: 'Light', 
                      minutes: intensityBreakdown.light.minutes, 
                      target: intensityBreakdown.light.target,
                      color: 'from-blue-500 via-blue-400 to-cyan-400'
                    },
                    { 
                      label: 'Moderate', 
                      minutes: intensityBreakdown.moderate.minutes, 
                      target: intensityBreakdown.moderate.target,
                      color: 'from-indigo-500 via-indigo-400 to-purple-400'
                    },
                    { 
                      label: 'Vigorous', 
                      minutes: intensityBreakdown.vigorous.minutes, 
                      target: intensityBreakdown.vigorous.target,
                      color: 'from-purple-500 via-pink-500 to-rose-400'
                    },
                  ].map((item) => {
                    const pct = percentage(item.minutes, item.target)
                    // Color coding: green (good), amber (moderate), red (low)
                    const barColor = pct >= 80 
                      ? 'from-emerald-500 via-teal-500 to-cyan-500' 
                      : pct >= 50 
                        ? 'from-amber-500 via-orange-500 to-yellow-500'
                        : item.color
                    
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-slate-500">{item.label}</span>
                          <span className="text-[12px] font-semibold text-slate-700">
                            {item.minutes}/{item.target} min
                            {item.target > 0 && (
                              <span className="ml-1.5 text-[11px] text-slate-500">
                                ({Math.round(pct)}%)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="relative h-2 w-full rounded-full bg-slate-100/80 border border-slate-200/50 shadow-inner overflow-hidden">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-300`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <CircularGauge 
                  value={activePct} 
                  max={100} 
                  label="% of daily"
                  subLabel=""
                />
              </div>
            </div>
            {/* Link to detailed steps page */}
            <div className="pt-4 mt-2 border-t border-slate-100/70 flex items-center justify-center">
              <a
                href="/steps"
                className="inline-flex items-center justify-center rounded-full px-5 py-1.5 text-[11px] font-semibold bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.45)] hover:brightness-110 active:scale-95 transition-all"
              >
                Open detailed steps view
              </a>
            </div>
          </div>
        </section>

        {/* ACTIVITY LEVEL SELECTOR Card - Ultra Premium Compact */}
        <section
          className={[
            "relative overflow-hidden rounded-2xl",
            "bg-white/95 backdrop-blur-xl",
            "border border-white/80",
            "shadow-[0_8px_24px_rgba(15,23,42,0.08),0_0_0_1px_rgba(255,255,255,0.6)]",
            "px-5 py-4",
          ].join(" ")}
        >
          {/* Ultra-premium gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 via-white/90 to-white/85" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-purple-50/20" />
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/70" />
          <div className="pointer-events-none absolute -inset-0.5 bg-gradient-to-br from-indigo-100/20 via-purple-100/10 to-transparent blur-lg opacity-40" />

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
            "relative overflow-hidden rounded-[28px]",
            "bg-white/90 backdrop-blur-2xl",
            "border border-white/90",
            "shadow-[0_24px_60px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.5)]",
            "px-7 py-6",
          ].join(" ")}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 via-white/85 to-white/70" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20" />
          <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/60" />
          <div className="pointer-events-none absolute inset-[1px] rounded-[27px] ring-1 ring-white/30" />
          <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-blue-100/30 via-purple-100/20 to-transparent blur-xl opacity-50" />

          <div className="relative z-10 space-y-4">
            <div className="space-y-1">
              <h2 className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                MOVEMENT CONSISTENCY
              </h2>
            </div>
            <div className="space-y-1">
              <h1 className="text-[17px] font-bold tracking-[-0.01em] text-slate-900">
                {hasConsistencyData ? movementConsistency : '—'}
              </h1>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                {hasConsistencyData ? (
                  <>
                    This week
                    {consistencyData?.weeklyAverageSteps && (
                      <span className="ml-2 text-[11px] text-slate-400">
                        • Avg {consistencyData.weeklyAverageSteps.toLocaleString()} steps/day
                      </span>
                    )}
                  </>
                ) : (
                  'Log steps for a few days or connect a wearable to see how consistent your movement pattern is.'
                )}
              </p>
            </div>
            
            {/* Day-by-day visualization */}
            {hasConsistencyData && consistencyData && consistencyData.dailyData.length > 0 ? (
              <div className="space-y-2 pt-2">
                <div className="flex items-end justify-between gap-1.5">
                  {consistencyData.dailyData.map((day, idx) => {
                    const maxSteps = Math.max(...consistencyData.dailyData.map(d => d.steps), 1)
                    const height = maxSteps > 0 ? (day.steps / maxSteps) * 100 : 0
                    const hasData = day.hasData
                    const isWearable = day.source && day.source !== 'Manual entry' && day.source !== 'manual'
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                        {/* Bar visualization */}
                        <div className="relative w-full flex items-end justify-center" style={{ height: '40px' }}>
                          {hasData ? (
                            <div
                              className={`w-full rounded-t transition-all duration-200 ${
                                isWearable
                                  ? 'bg-gradient-to-t from-indigo-500 to-indigo-400'
                                  : 'bg-gradient-to-t from-slate-400 to-slate-300'
                              }`}
                              style={{ 
                                height: `${Math.max(height, 5)}%`,
                                minHeight: height > 0 ? '4px' : '0',
                              }}
                              title={`${day.steps.toLocaleString()} steps${day.source ? ` (${day.source})` : ''}`}
                            />
                          ) : (
                            <div className="w-full h-0.5 bg-slate-200 rounded-full" />
                          )}
                        </div>
                        
                        {/* Day label */}
                        <span className={`text-[11px] font-semibold tracking-tight ${
                          hasData ? 'text-slate-900' : 'text-slate-400'
                        }`}>
                          {day.dayLabel}
                        </span>
                        
                        {/* Steps count (small) */}
                        {hasData && day.steps > 0 && (
                          <span className="text-[9px] text-slate-500 leading-tight">
                            {day.steps > 999 ? `${(day.steps / 1000).toFixed(1)}k` : day.steps}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                
                {/* Source indicator */}
                {consistencyData.dailyData.some(d => d.source && d.source !== 'Manual entry' && d.source !== 'manual') && (
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="text-[10px] text-slate-500">Wearable</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="text-[10px] text-slate-500">Manual</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 pt-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <span key={idx} className="text-[13px] font-semibold tracking-tight text-slate-400 flex-1 text-center">
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
            "relative overflow-hidden rounded-[28px]",
            "bg-white/90 backdrop-blur-2xl",
            "border border-white/90",
            "shadow-[0_24px_60px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.5)]",
            "px-7 py-6",
          ].join(" ")}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 via-white/85 to-white/70" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20" />
          <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/60" />
          <div className="pointer-events-none absolute inset-[1px] rounded-[27px] ring-1 ring-white/30" />
          <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-blue-100/30 via-purple-100/20 to-transparent blur-xl opacity-50" />

          <div className="relative z-10 space-y-4">
            <div className="space-y-1">
              <h2 className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                TODAY'S SHIFT MOVEMENT PLAN
              </h2>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">
                    {movementPlan.title}
                  </h3>
                </div>
                <ul className="space-y-2">
                  {movementPlan.activities.map((activity, idx) => (
                    <li key={idx} className="space-y-0.5">
                      <div className="flex items-start gap-2">
                        <span className="text-[12px] font-semibold text-slate-700 mt-0.5">
                          •
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[12px] font-semibold text-slate-900">
                              {activity.duration} {activity.label}
                            </span>
                            {activity.suggestedTime && (
                              <span className="text-[11px] text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-md">
                                {activity.suggestedTime}
                              </span>
                            )}
                          </div>
                          {activity.description && (
                            <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                              {activity.description}
                            </p>
                          )}
                          <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                            {activity.timing}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-[13px] font-semibold tracking-tight text-slate-900">
                  {movementPlan.intensity}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                  Intensity
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Recovery & activity Card */}
        <section
          className={[
            "relative overflow-hidden rounded-[28px]",
            "bg-white/90 backdrop-blur-2xl",
            "border border-white/90",
            "shadow-[0_24px_60px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.5)]",
            "px-7 py-6",
          ].join(" ")}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 via-white/85 to-white/70" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20" />
          <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/60" />
          <div className="pointer-events-none absolute inset-[1px] rounded-[27px] ring-1 ring-white/30" />
          <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-blue-100/30 via-purple-100/20 to-transparent blur-xl opacity-50" />

          <div className="relative z-10 space-y-6">
            <div className="space-y-1">
              <h2 className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                RECOVERY & ACTIVITY
              </h2>
            </div>
            
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
                  <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">
                    Recovery
                  </h3>
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    {hasRecoveryData
                      ? recoveryDescription
                      : 'Once you have a few nights of sleep and some movement logged, we’ll calculate how well you’re recovering.'}
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
                  <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">
                    Activity
                  </h3>
                  <p className="text-[12px] text-slate-500 leading-relaxed">
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
            "relative overflow-hidden rounded-[28px]",
            "bg-white/90 backdrop-blur-2xl",
            "border border-white/90",
            "shadow-[0_24px_60px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.5)]",
            "px-7 py-6",
          ].join(" ")}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 via-white/85 to-white/70" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20" />
          <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/60" />
          <div className="pointer-events-none absolute inset-[1px] rounded-[27px] ring-1 ring-white/30" />
          <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-blue-100/30 via-purple-100/20 to-transparent blur-xl opacity-50" />

          <div className="relative z-10 space-y-3">
            <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">
              Today's Recommendation
            </h3>
            <p className="text-[12px] text-slate-500 leading-relaxed">
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
