'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Info, X } from 'lucide-react'
import { calculateSleepQuality, type SleepQualityResult } from '@/lib/sleep/calculateSleepQuality'

type SleepQualityChartProps = {
  className?: string
}

type SleepData = {
  duration: number // minutes in bed
  timeAsleep: number // minutes actually asleep
  efficiency: number // percentage
  quality: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  qualityScore: number // 0-100 composite score
  result: SleepQualityResult // Full calculation result
}

export function SleepQualityChart({ className = '' }: SleepQualityChartProps) {
  const [sleepData, setSleepData] = useState<SleepData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)

  // Fetch sleep quality data
  useEffect(() => {
    let cancelled = false
    const fetchQualityData = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/sleep/summary', { cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        
        if (!cancelled && json.lastNight) {
          const lastNight = json.lastNight
          const duration = lastNight.totalMinutes || 0
          
          // Validate duration
          if (duration <= 0) {
            setSleepData(null)
            return
          }
          
          // Calculate time asleep: total time minus awake time
          // awake is a percentage, so: timeAsleep = duration * (1 - awake/100)
          const awakePercent = Math.max(0, Math.min(100, lastNight.awake || 0))
          const timeAsleep = Math.round(duration * (1 - awakePercent / 100))
          
          // Get sleep stages (with validation)
          const deepPercent = Math.max(0, Math.min(100, lastNight.deep || 0))
          const remPercent = Math.max(0, Math.min(100, lastNight.rem || 0))
          
          // Determine if this is daytime sleep (for shift workers)
          // Check if sleep midpoint is during daytime hours (8 AM - 4 PM)
          let isDaySleep = false
          if (lastNight.startAt && lastNight.endAt) {
            try {
              const start = new Date(lastNight.startAt)
              const end = new Date(lastNight.endAt)
              const midpoint = new Date((start.getTime() + end.getTime()) / 2)
              const hour = midpoint.getHours()
              isDaySleep = hour >= 8 && hour <= 16
            } catch (e) {
              // Invalid date, default to false
            }
          }
          
          // Calculate composite sleep quality score
          const qualityResult = calculateSleepQuality({
            durationMinutes: duration,
            timeAsleepMinutes: timeAsleep,
            awakePercent,
            quality: lastNight.quality || 'Fair',
            deepPercent,
            remPercent,
            isDaySleep,
            sleepGoalHours: 8, // Could fetch from profile later
          })
          
          // Calculate efficiency
          const efficiency = duration > 0 ? Math.round((timeAsleep / duration) * 100) : 0
          
          setSleepData({
            duration,
            timeAsleep,
            efficiency,
            quality: qualityResult.qualityRating,
            qualityScore: qualityResult.score,
            result: qualityResult,
          })
        } else if (!cancelled) {
          // No sleep data
          setSleepData(null)
        }
      } catch (err) {
        console.error('[SleepQualityChart] Failed to fetch quality data:', err)
        if (!cancelled) {
          setError('Failed to load sleep quality data')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    
    fetchQualityData()
    
    // Listen for sleep refresh events
    const handleRefresh = () => {
      if (!cancelled) {
        fetchQualityData()
      }
    }
    window.addEventListener('sleep-refreshed', handleRefresh)
    
    return () => {
      cancelled = true
      window.removeEventListener('sleep-refreshed', handleRefresh)
    }
  }, [])

  // Format minutes to "X hr Y min"
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours} hr ${mins} min`
  }

  // Get quality label - now uses the qualityRating from the composite calculation
  const getQualityLabel = (score: number, qualityRating?: 'Excellent' | 'Good' | 'Fair' | 'Poor'): string => {
    // Use qualityRating if available (from composite calculation), otherwise fallback to score
    if (qualityRating) return qualityRating
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Poor'
  }

  // Calculate circular gauge progress (0-100)
  const gaugeProgress = sleepData?.qualityScore || 0

  // Colors for the gauge - red, amber, green based on score
  const getGaugeColors = (score: number) => {
    if (score >= 70) return { primary: '#10b981', secondary: '#34d399' } // green (emerald-500 and emerald-400)
    if (score >= 40) return { primary: '#f59e0b', secondary: '#fbbf24' } // amber (amber-500 and amber-400)
    return { primary: '#ef4444', secondary: '#f87171' } // red (red-500 and red-400)
  }

  const colors = sleepData ? getGaugeColors(sleepData.qualityScore) : { primary: '#10b981', secondary: '#34d399' }

  // SVG circular gauge - thinner and more premium
  const size = 120
  const radius = 50
  const strokeWidth = 8 // Thinner stroke for premium look
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (gaugeProgress / 100) * circumference

  return (
    <>
      <section 
        className={`relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_55px_rgba(15,23,42,0.08)] px-6 py-6 ${className}`}
      >
        {/* Premium gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 to-white/55" />
        
        {/* Subtle inner glow */}
        <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-white/50" />
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[17px] font-bold tracking-tight text-slate-900">Sleep Quality</h2>
            <button
              onClick={() => setIsInfoModalOpen(true)}
              className="p-1.5 rounded-full hover:bg-slate-100/80 transition-colors"
              aria-label="Info about sleep quality"
            >
              <Info className="h-4 w-4 text-slate-500" />
            </button>
          </div>

          {loading ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="animate-pulse space-y-3 w-full">
                <div className="h-32 w-32 rounded-full bg-slate-200 mx-auto" />
              </div>
            </div>
          ) : error ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-[13px] text-slate-500">{error}</p>
            </div>
          ) : !sleepData ? (
            <div className="h-[200px] flex flex-col items-center justify-center space-y-2">
              <p className="text-[13px] text-slate-500 text-center">
                No sleep data available
              </p>
              <p className="text-[11px] text-slate-400 text-center">
                Log sleep to see your quality metrics
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Circular Gauge - Upper Right - Ultra Premium */}
              <div className="absolute top-0 right-0">
                <div className="relative" style={{ width: size, height: size }}>
                  <svg width={size} height={size} className="transform -rotate-90">
                    <defs>
                      {/* Premium gradient for progress */}
                      <linearGradient id={`gauge-gradient-${sleepData.qualityScore}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
                        <stop offset="100%" stopColor={colors.secondary} stopOpacity="1" />
                      </linearGradient>
                      {/* Subtle glow filter */}
                      <filter id={`glow-${sleepData.qualityScore}`}>
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    {/* Background circle - ultra subtle */}
                    <circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth={strokeWidth}
                      strokeOpacity="0.6"
                    />
                    {/* Progress circle - with gradient and premium styling */}
                    <circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke={`url(#gauge-gradient-${sleepData.qualityScore})`}
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      filter={`url(#glow-${sleepData.qualityScore})`}
                      style={{
                        transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    />
                  </svg>
                  {/* Center text - premium styling */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[32px] font-bold text-slate-900 tabular-nums tracking-tight">
                      {sleepData.qualityScore}
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium tracking-wide">
                      {getQualityLabel(sleepData.qualityScore, sleepData.quality)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metrics - Below */}
              <div className="space-y-4 pr-32">
                {/* Sleep Duration */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    SLEEP DURATION
                  </p>
                  <p className="text-[15px] font-semibold text-slate-900">
                    {formatDuration(sleepData.duration)}
                  </p>
                </div>

                {/* Time Asleep */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    TIME ASLEEP
                  </p>
                  <p className="text-[15px] font-semibold text-slate-900">
                    {formatDuration(sleepData.timeAsleep)}
                  </p>
                </div>

                {/* Sleep Efficiency */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    SLEEP EFFICIENCY
                  </p>
                  <p className="text-[15px] font-semibold text-slate-900">
                    {sleepData.efficiency}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Info Modal */}
      {isInfoModalOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsInfoModalOpen(false)}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[28px] border border-white shadow-[0_24px_60px_rgba(15,23,42,0.25)] max-h-[90vh] overflow-hidden">
            {/* Premium gradient overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 via-white/90 to-white/85" />
            
            {/* Content */}
            <div className="relative z-10 overflow-y-auto max-h-[90vh]">
              {/* Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-slate-200/60 px-6 py-5 flex items-center justify-between">
                <div>
                  <h2 className="text-[20px] font-bold tracking-tight text-slate-900">
                    Sleep Quality
                  </h2>
                  <p className="text-[12px] text-slate-500 mt-1">
                    Understanding your sleep metrics
                  </p>
                </div>
                <button
                  onClick={() => setIsInfoModalOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 text-slate-600 hover:text-slate-900 transition-all hover:scale-105 active:scale-95"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-6 space-y-6">
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900 mb-3">
                    What is Sleep Quality?
                  </h3>
                  <p className="text-[13px] text-slate-700 leading-relaxed mb-3">
                    Your sleep quality score (0-100) reflects how well you slept based on your quality rating, 
                    sleep efficiency, and time asleep.
                  </p>
                </div>

                <div>
                  <h3 className="text-[15px] font-bold text-slate-900 mb-3">
                    Sleep Duration
                  </h3>
                  <p className="text-[13px] text-slate-700 leading-relaxed">
                    The total time you spent in bed, from when you went to sleep until you woke up.
                  </p>
                </div>

                <div>
                  <h3 className="text-[15px] font-bold text-slate-900 mb-3">
                    Time Asleep
                  </h3>
                  <p className="text-[13px] text-slate-700 leading-relaxed">
                    The actual time you were asleep, excluding any time spent awake during the night.
                  </p>
                </div>

                <div>
                  <h3 className="text-[15px] font-bold text-slate-900 mb-3">
                    Sleep Efficiency
                  </h3>
                  <p className="text-[13px] text-slate-700 leading-relaxed">
                    The percentage of time in bed that you were actually asleep. Higher is better - aim for 85% or more.
                  </p>
                </div>

                <div>
                  <h3 className="text-[15px] font-bold text-slate-900 mb-3">
                    How to Improve
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-[13px] text-slate-700 leading-relaxed">
                    <li>Maintain a consistent sleep schedule, even on days off</li>
                    <li>Create a dark, quiet, and cool sleep environment</li>
                    <li>Avoid screens and bright lights 1-2 hours before bed</li>
                    <li>Limit caffeine and heavy meals close to bedtime</li>
                    <li>Use blackout curtains and eye masks for daytime sleep</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.getElementById('phone-root') || document.body
      )}
    </>
  )
}
