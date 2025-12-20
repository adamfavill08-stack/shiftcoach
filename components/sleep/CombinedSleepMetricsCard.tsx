'use client'

import { useEffect, useState } from 'react'
import { Info, Sparkles } from 'lucide-react'
import type { SleepDeficitResponse } from '@/lib/sleep/calculateSleepDeficit'
import { SleepMetricsInfoModal } from './SleepMetricsInfoModal'

type CombinedSleepMetricsCardProps = {
  tonightTarget?: {
    targetHours: number
    explanation: string
  } | null
  loadingTarget?: boolean
}

type ConsistencyData = {
  consistencyScore: number | null
  avgSleepHours: number | null
  bedtimeWakeData: Array<{ date: string; bedtimeHour: number | null; wakeHour: number | null }>
}

export function CombinedSleepMetricsCard({ 
  tonightTarget, 
  loadingTarget = false 
}: CombinedSleepMetricsCardProps) {
  const [sleepDeficit, setSleepDeficit] = useState<SleepDeficitResponse | null>(null)
  const [loadingDeficit, setLoadingDeficit] = useState(true)
  const [consistencyData, setConsistencyData] = useState<ConsistencyData | null>(null)
  const [loadingConsistency, setLoadingConsistency] = useState(true)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [shiftType, setShiftType] = useState<'day' | 'night' | 'off' | 'other' | null>(null)

  // Fetch today's shift type for shift-aware messaging
  useEffect(() => {
    const fetchShiftType = async () => {
      try {
        const res = await fetch('/api/nutrition/today', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          setShiftType(json.nutrition?.shiftType || null)
        }
      } catch (err) {
        // Silently fail - shift type is optional
      }
    }
    fetchShiftType()
  }, [])

  // Fetch sleep deficit
  useEffect(() => {
    let cancelled = false
    const fetchDeficit = async () => {
      try {
        setLoadingDeficit(true)
        const res = await fetch('/api/sleep/deficit', { cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        if (!cancelled) {
          setSleepDeficit(json)
        }
      } catch (err) {
        console.error('[CombinedSleepMetricsCard] Failed to fetch deficit:', err)
      } finally {
        if (!cancelled) {
          setLoadingDeficit(false)
        }
      }
    }
    
    fetchDeficit()
    
    // Listen for sleep refresh events
    let refreshTimeout: NodeJS.Timeout | null = null
    const handleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      refreshTimeout = setTimeout(() => {
        if (!cancelled) fetchDeficit()
      }, 300)
    }
    window.addEventListener('sleep-refreshed', handleRefresh)
    
    return () => {
      cancelled = true
      if (refreshTimeout) clearTimeout(refreshTimeout)
      window.removeEventListener('sleep-refreshed', handleRefresh)
    }
  }, [])

  // Fetch sleep consistency with enhanced data
  useEffect(() => {
    let cancelled = false
    const fetchConsistency = async () => {
      try {
        setLoadingConsistency(true)
        const res = await fetch('/api/sleep/consistency', { cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        if (!cancelled) {
          setConsistencyData({
            consistencyScore: json.consistencyScore ?? null,
            avgSleepHours: json.avgSleepHours ?? null,
            bedtimeWakeData: json.bedtimeWakeData ?? []
          })
        }
      } catch (err) {
        console.error('[CombinedSleepMetricsCard] Failed to fetch consistency:', err)
        if (!cancelled) {
          setConsistencyData(null)
        }
      } finally {
        if (!cancelled) {
          setLoadingConsistency(false)
        }
      }
    }
    
    fetchConsistency()
    
    // Listen for sleep refresh events
    let refreshTimeout: NodeJS.Timeout | null = null
    const handleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      refreshTimeout = setTimeout(() => {
        if (!cancelled) fetchConsistency()
      }, 300)
    }
    window.addEventListener('sleep-refreshed', handleRefresh)
    
    return () => {
      cancelled = true
      if (refreshTimeout) clearTimeout(refreshTimeout)
      window.removeEventListener('sleep-refreshed', handleRefresh)
    }
  }, [])

  const getDeficitStatus = () => {
    if (!sleepDeficit) return { text: 'No data', color: 'slate', bgColor: 'bg-slate-50/70', textColor: 'text-slate-700', borderColor: 'border-slate-200/50' }
    
    const { category } = sleepDeficit
    
    if (category === 'surplus' || category === 'low') {
      return { text: 'On track', color: 'emerald', bgColor: 'bg-emerald-50/70', textColor: 'text-emerald-700', borderColor: 'border-emerald-200/50' }
    } else if (category === 'medium') {
      return { text: 'Needs attention', color: 'amber', bgColor: 'bg-amber-50/70', textColor: 'text-amber-700', borderColor: 'border-amber-200/50' }
    } else {
      return { text: 'High deficit', color: 'rose', bgColor: 'bg-rose-50/70', textColor: 'text-rose-700', borderColor: 'border-rose-200/50' }
    }
  }

  const getConsistencyColor = (score: number | null) => {
    if (score === null) return { color: 'slate', textColor: 'text-slate-500', bgColor: 'bg-slate-50' }
    if (score >= 70) return { color: 'emerald', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50' }
    if (score >= 40) return { color: 'amber', textColor: 'text-amber-700', bgColor: 'bg-amber-50' }
    return { color: 'rose', textColor: 'text-rose-700', bgColor: 'bg-rose-50' }
  }

  const getConsistencyLabel = (score: number | null) => {
    if (score === null) return 'Not enough data'
    if (score >= 70) return 'Good consistency'
    if (score >= 40) return 'Moderate consistency'
    return 'Low consistency'
  }

  const getShiftAwareMessage = (score: number | null) => {
    if (score === null) return null
    if (shiftType === 'night' && score >= 50) {
      return 'Good for night shift'
    }
    if (shiftType === 'day' && score >= 70) {
      return 'Excellent for day shift'
    }
    if (shiftType === 'off' && score >= 60) {
      return 'Good recovery pattern'
    }
    return null
  }

  const getQuickTip = () => {
    const tips: string[] = []
    
    if (consistencyData && consistencyData.consistencyScore !== null && consistencyData.consistencyScore < 40) {
      tips.push('Try to keep bedtime within 1-2 hours of your usual time')
    }
    
    if (sleepDeficit && sleepDeficit.category === 'high') {
      tips.push('Focus on getting 7-8 hours of sleep tonight')
    }
    
    if (consistencyData && consistencyData.avgSleepHours !== null && consistencyData.avgSleepHours < 6.5) {
      tips.push('Aim for at least 7 hours of sleep per night')
    }
    
    if (shiftType === 'night' && consistencyData && consistencyData.consistencyScore !== null && consistencyData.consistencyScore < 50) {
      tips.push('Night shift workers benefit from consistent daytime sleep schedules')
    }
    
    return tips[0] || null
  }

  // Generate sparkline path from bedtime/wake time data
  const generateSparkline = () => {
    if (!consistencyData?.bedtimeWakeData || consistencyData.bedtimeWakeData.length === 0) {
      return null
    }

    const data = consistencyData.bedtimeWakeData.filter(d => d.bedtimeHour !== null)
    if (data.length < 2) return null

    const width = 100
    const height = 20
    const padding = 4
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    // Normalize bedtime hours to 0-24 range, then map to chart coordinates
    const bedtimes = data.map(d => d.bedtimeHour!).filter(h => h !== null)
    const minHour = Math.min(...bedtimes)
    const maxHour = Math.max(...bedtimes)
    const hourRange = maxHour - minHour || 1

    const points = data.map((d, idx) => {
      if (d.bedtimeHour === null) return null
      const x = padding + (idx / (data.length - 1)) * chartWidth
      const y = padding + ((d.bedtimeHour - minHour) / hourRange) * chartHeight
      return { x, y }
    }).filter((p): p is { x: number; y: number } => p !== null)

    if (points.length < 2) return null

    // Create smooth path using cubic bezier
    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const next = points[i + 1] || curr
      
      const cp1x = prev.x + (curr.x - prev.x) / 3
      const cp1y = prev.y
      const cp2x = curr.x - (next.x - curr.x) / 3
      const cp2y = curr.y
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`
    }

    return { path, points }
  }

  const sparkline = generateSparkline()
  const consistencyScore = consistencyData?.consistencyScore ?? null
  const consistencyColor = getConsistencyColor(consistencyScore)
  const shiftMessage = getShiftAwareMessage(consistencyScore)
  const quickTip = getQuickTip()

  const deficitStatus = getDeficitStatus()
  const weeklyDeficitHours = sleepDeficit?.weeklyDeficit ?? 0
  const displayDeficit = sleepDeficit ? `${Math.abs(weeklyDeficitHours).toFixed(1)} h` : '— h'
  const deficitLabel = sleepDeficit
    ? (weeklyDeficitHours > 0 
        ? 'Behind weekly target' 
        : 'Ahead of weekly target')
    : 'Not enough data'

  return (
    <section className="relative overflow-hidden rounded-3xl bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)] p-6">
      {/* Top highlight overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
      
      {/* Subtle colored glow hints - dark mode only */}
      <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
      
      {/* Inner ring for premium feel */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />
      
      <div className="relative z-10 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 dark:text-slate-400">
              SLEEP METRICS
            </p>
            <h3 className="mt-2 text-[18px] font-semibold tracking-tight">
              Tonight&apos;s Target & Weekly Overview
            </h3>
          </div>
          <button
            onClick={() => setIsInfoModalOpen(true)}
            className="flex-shrink-0 h-8 w-8 rounded-full bg-transparent text-slate-400 dark:text-slate-500 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-center"
            aria-label="Learn more about sleep metrics"
          >
            <Info className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Three-column grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Tonight's Target */}
          <div className="flex flex-col">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Tonight&apos;s Target
            </p>
            {loadingTarget ? (
              <div className="space-y-2">
                <div className="h-8 w-16 bg-slate-200 animate-pulse rounded" />
                <div className="h-3 w-full bg-slate-200 animate-pulse rounded" />
              </div>
            ) : (
              <>
                <p className="text-[22px] font-semibold text-slate-900 leading-tight tabular-nums">
                  {tonightTarget?.targetHours 
                    ? (tonightTarget.targetHours % 1 === 0 
                        ? tonightTarget.targetHours 
                        : tonightTarget.targetHours.toFixed(1))
                    : '8'}
                  <span className="ml-1 text-xs font-medium text-slate-500">h</span>
                </p>
                {tonightTarget?.explanation && (
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {tonightTarget.explanation}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Sleep Consistency */}
          <div className="flex flex-col">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Consistency
            </p>
            {loadingConsistency ? (
              <div className="space-y-2">
                <div className="h-8 w-12 bg-slate-200 animate-pulse rounded" />
                <div className="h-3 w-full bg-slate-200 animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <p className={`text-[22px] font-semibold leading-tight tabular-nums ${consistencyColor.textColor}`}>
                    {consistencyScore ?? '—'}
                  </p>
                  <span className="text-xs font-medium text-slate-500">score</span>
                </div>
                <div className="mt-2">
                  {sparkline ? (
                    <svg viewBox="0 0 100 20" className="h-5 w-full" preserveAspectRatio="none">
                      <path
                        d={sparkline.path}
                        fill="none"
                        stroke={consistencyScore !== null && consistencyScore >= 70 ? '#10b981' : consistencyScore !== null && consistencyScore >= 40 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.8"
                      />
                      {sparkline.points.map((point, idx) => (
                        <circle
                          key={idx}
                          cx={point.x}
                          cy={point.y}
                          r="1.5"
                          fill={consistencyScore !== null && consistencyScore >= 70 ? '#10b981' : consistencyScore !== null && consistencyScore >= 40 ? '#f59e0b' : '#ef4444'}
                          opacity="0.8"
                        />
                      ))}
                    </svg>
                  ) : (
                    <div className="h-5 w-full bg-slate-200/60 rounded" />
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <p className="text-xs text-slate-500">{getConsistencyLabel(consistencyScore)}</p>
                  {shiftMessage && (
                    <span className="text-[11px] text-slate-400">• {shiftMessage}</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sleep Deficit */}
          <div className="flex flex-col">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Sleep Deficit
            </p>
            {loadingDeficit ? (
              <div className="space-y-2">
                <div className="h-8 w-16 bg-slate-200 animate-pulse rounded" />
                <div className="h-3 w-full bg-slate-200 animate-pulse rounded" />
              </div>
            ) : (
              <>
                <p className="text-[22px] font-semibold text-slate-900 leading-tight tabular-nums">
                  {displayDeficit}
                </p>
                <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                  {deficitLabel}
                </p>
                {consistencyData && consistencyData.avgSleepHours !== null && (
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Avg: {consistencyData.avgSleepHours.toFixed(1)}h
                  </p>
                )}
                {sleepDeficit && (
                  <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full border ${deficitStatus.bgColor} ${deficitStatus.borderColor} px-2.5 py-1 text-[11px] font-medium ${deficitStatus.textColor}`}>
                    <span className={`inline-flex h-2.5 w-2.5 items-center justify-center rounded-full ${
                      deficitStatus.color === 'emerald' ? 'bg-emerald-500/80' : 
                      deficitStatus.color === 'amber' ? 'bg-amber-500/80' : 
                      'bg-rose-500/80'
                    } text-[8px] text-white`}>
                      {deficitStatus.color === 'emerald' ? '✓' : deficitStatus.color === 'amber' ? '!' : '⚠'}
                    </span>
                    <span>{deficitStatus.text}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick Tip / Insight Footer */}
        {quickTip && (
          <>
            <div className="my-5 h-px bg-gradient-to-r from-transparent via-slate-200/70 dark:via-slate-700/50 to-transparent" />
            <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-50/70 dark:from-slate-800/50 to-white dark:to-slate-900/50 border border-slate-200/50 dark:border-slate-700/40">
              <p className="text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-400 dark:text-slate-500" strokeWidth={2} />
                Quick tip
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {quickTip}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Info Modal */}
      <SleepMetricsInfoModal
        open={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        tonightTarget={tonightTarget?.targetHours ?? null}
        consistencyScore={consistencyScore}
        sleepDeficit={sleepDeficit ? {
          weeklyDeficit: sleepDeficit.weeklyDeficit,
          category: sleepDeficit.category,
        } : null}
      />
    </section>
  )
}
