'use client'

import { useState, useEffect } from 'react'
import { Info } from 'lucide-react'

type SocialJetlagData = {
  currentMisalignmentHours: number
  weeklyAverageMisalignmentHours?: number
  category: "low" | "moderate" | "high"
  explanation: string
  baselineMidpointClock?: number
  currentMidpointClock?: number
}

export function SocialJetlagCard() {
  const [data, setData] = useState<SocialJetlagData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const res = await fetch('/api/shift-rhythm', { cache: 'no-store' })
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`)
        }
        
        const json = await res.json()
        console.log('[SocialJetlagCard] Response:', json.socialJetlag)
        
        if (!cancelled) {
          if (json.socialJetlag) {
            const explanation = json.socialJetlag.explanation || ''
            const misalignment = json.socialJetlag.currentMisalignmentHours
            
            // Check if it's valid data (not just an error message)
            const hasError = explanation.includes('No sleep') || 
                           explanation.includes('Not enough') || 
                           explanation.includes('Failed to fetch') ||
                           explanation.includes('need at least') ||
                           explanation.includes('No main sleep') ||
                           explanation.includes('Not enough baseline')
            
            // Valid data: has category, misalignment is defined and >= 0, and no error in explanation
            // Note: misalignment can be 0 (low jetlag - still valid!)
            const isValid = !hasError && 
                           json.socialJetlag.category &&
                           misalignment !== undefined &&
                           misalignment >= 0
            
            console.log('[SocialJetlagCard] Validation:', {
              hasError,
              isValid,
              category: json.socialJetlag.category,
              misalignment,
              explanation: explanation.substring(0, 50),
            })
            
            if (isValid) {
              setData(json.socialJetlag)
            } else {
              setError(explanation || 'Log at least 2 days of main sleep to calculate social jetlag')
            }
          } else {
            console.log('[SocialJetlagCard] No socialJetlag in response')
            setError('Log at least 2 days of main sleep to calculate social jetlag')
          }
        }
      } catch (err: any) {
        console.error('[SocialJetlagCard] Error:', err)
        if (!cancelled) {
          setError('Unable to load social jetlag data')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    
    fetchData()
    
    // Listen for sleep refresh events
    const handleRefresh = () => {
      if (!cancelled) {
        fetchData()
      }
    }
    window.addEventListener('sleep-refreshed', handleRefresh)
    
    return () => {
      cancelled = true
      window.removeEventListener('sleep-refreshed', handleRefresh)
    }
  }, [])

  const getCategoryColor = () => {
    if (!data) return { bg: "bg-slate-50 dark:bg-slate-800/50", text: "text-slate-700 dark:text-slate-300", border: "border-slate-200 dark:border-slate-700/40", badge: "—" }
    
    switch (data.category) {
      case "low":
        return { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800/40", badge: "Low" }
      case "moderate":
        return { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800/40", badge: "Moderate" }
      case "high":
        return { bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800/40", badge: "High" }
      default:
        return { bg: "bg-slate-50 dark:bg-slate-800/50", text: "text-slate-700 dark:text-slate-300", border: "border-slate-200 dark:border-slate-700/40", badge: "—" }
    }
  }

  const colors = getCategoryColor()
  const displayValue = data ? `${data.currentMisalignmentHours.toFixed(1)} h` : '— h'

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-white/90 dark:bg-slate-900/45 backdrop-blur-xl border border-white dark:border-slate-700/40 shadow-[0_20px_55px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_55px_rgba(0,0,0,0.4)] px-6 py-6">
      {/* Premium gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 dark:from-slate-900/60 to-white/55 dark:to-slate-900/40" />
      
      {/* Subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-white/50 dark:ring-slate-700/30" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1">
            <p className="text-[13px] font-bold tracking-[0.15em] text-slate-400 dark:text-slate-500 uppercase mb-1">
              Social Jetlag
            </p>
            <h2 className="text-[17px] font-bold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
              Sleep Timing Alignment
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="h-[120px] flex items-center justify-center">
            <div className="animate-pulse space-y-3 w-full">
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700/50 rounded mx-auto" />
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-700/50 rounded" />
            </div>
          </div>
        ) : error ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <span className="text-amber-600 dark:text-amber-400 text-xs font-bold">ℹ</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-amber-900 dark:text-amber-200 mb-1">Social Jetlag</p>
                <p className="text-[12px] text-amber-700 dark:text-amber-300 leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        ) : data ? (
          <div className="flex items-start justify-between gap-6">
            {/* Left: Text content */}
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-[22px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {displayValue}
              </p>
              <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {data.explanation}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Current misalignment
              </p>
              {data.weeklyAverageMisalignmentHours !== undefined && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Weekly avg: {data.weeklyAverageMisalignmentHours.toFixed(1)} h
                </p>
              )}
              {/* Category badge */}
              <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full ${colors.bg} ${colors.border} border px-2.5 py-1 text-[10px] font-semibold ${colors.text}`}>
                <span>{colors.badge}</span>
              </div>
            </div>

            {/* Right: Simple visualization circle */}
            <div className="flex-shrink-0 relative" style={{ width: '120px', height: '120px' }}>
              <svg
                width="120"
                height="120"
                viewBox="0 0 120 120"
                className="transform -rotate-90"
              >
                {/* Background circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  className="stroke-slate-200 dark:stroke-slate-700/50"
                  strokeWidth="2"
                />

                {/* Misalignment arc */}
                {(() => {
                  const maxMisalignment = 6 // hours
                  const normalized = Math.min(data.currentMisalignmentHours / maxMisalignment, 1)
                  const circumference = 2 * Math.PI * 50
                  const offset = circumference - (normalized * circumference)

                  return (
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke={data.category === "high" ? "#ef4444" : data.category === "moderate" ? "#f59e0b" : "#10b981"}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      opacity="0.8"
                    />
                  )
                })()}

                {/* Center circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="38"
                  className="fill-white dark:fill-slate-900/50 stroke-slate-200 dark:stroke-slate-700/50"
                  strokeWidth="1"
                />
              </svg>
            </div>
          </div>
        ) : (
          <div className="h-[120px] flex items-center justify-center">
            <p className="text-[13px] text-slate-500 dark:text-slate-400">No data available</p>
          </div>
        )}
      </div>
    </section>
  )
}
