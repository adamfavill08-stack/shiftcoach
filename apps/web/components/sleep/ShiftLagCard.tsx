'use client'

import { useState, useEffect } from 'react'
import { Info, Moon, Clock, RefreshCw } from 'lucide-react'
import type { ShiftLagMetrics } from '@/lib/circadian/calculateShiftLag'

export function ShiftLagCard() {
  const [data, setData] = useState<ShiftLagMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch from shift-rhythm API (which includes ShiftLag)
      const res = await fetch('/api/shift-rhythm', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`)
      }
      
      const json = await res.json()
      
      if (json.error) {
        setError(json.error)
        return
      }
      
      // Extract ShiftLag from shift-rhythm response
      if (json.shiftLag) {
        setData(json.shiftLag)
      } else {
        setError('ShiftLag data not available')
      }
    } catch (err: any) {
      console.error('[ShiftLagCard] Error:', err)
      setError('Unable to load ShiftLag data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Listen for sleep and rota refresh events
    // ShiftLag depends on both sleep logs and shift/rota data
    const handleRefresh = () => {
      fetchData()
    }
    
    window.addEventListener('sleep-refreshed', handleRefresh)
    window.addEventListener('rota-saved', handleRefresh)
    window.addEventListener('rota-cleared', handleRefresh)
    
    return () => {
      window.removeEventListener('sleep-refreshed', handleRefresh)
      window.removeEventListener('rota-saved', handleRefresh)
      window.removeEventListener('rota-cleared', handleRefresh)
    }
  }, [])

  const getCategoryColor = () => {
    if (!data) return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", badge: "—" }
    
    switch (data.category) {
      case "low":
        return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", badge: "Low" }
      case "moderate":
        return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", badge: "Moderate" }
      case "high":
        return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", badge: "High" }
      default:
        return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", badge: "—" }
    }
  }

  const colors = getCategoryColor()

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_55px_rgba(15,23,42,0.08)] px-6 py-6">
      {/* Premium gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 to-white/55" />
      
      {/* Subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-white/50" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1">
            <p className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-1">
              ShiftLag
            </p>
            <h2 className="text-[17px] font-bold tracking-[-0.01em] text-slate-900">
              Jet lag from your shifts
            </h2>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 text-slate-600 hover:text-slate-900 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            aria-label="Refresh ShiftLag"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
          </button>
        </div>

        {loading ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-pulse space-y-3 w-full">
              <div className="h-8 w-24 bg-slate-200 rounded mx-auto" />
              <div className="h-4 w-full bg-slate-200 rounded" />
              <div className="h-4 w-3/4 bg-slate-200 rounded mx-auto" />
            </div>
          </div>
        ) : error ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50/80 border border-amber-200/60">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <Info className="h-4 w-4 text-amber-600" strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-amber-900 mb-1">ShiftLag</p>
                <p className="text-[12px] text-amber-700 leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-5">
            {/* Main Score Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-3">
                <span className="text-[32px] font-bold text-slate-900">
                  {data.score}
                </span>
                <span className="text-[14px] font-medium text-slate-500">/100</span>
              </div>
              <div className={`inline-flex items-center gap-1.5 rounded-full ${colors.bg} ${colors.border} border px-3 py-1.5 text-[11px] font-semibold ${colors.text}`}>
                <span>{colors.badge}</span>
              </div>
            </div>

            {/* Explanation */}
            <p className="text-[12px] text-slate-600 leading-relaxed">
              {data.explanation}
            </p>

            {/* Drivers */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Contributing Factors
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-[11px] text-slate-700">
                  <Moon className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" strokeWidth={2} />
                  <span>{data.drivers.sleepDebt}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[11px] text-slate-700">
                  <Clock className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" strokeWidth={2} />
                  <span>{data.drivers.misalignment}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[11px] text-slate-700">
                  <RefreshCw className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" strokeWidth={2} />
                  <span>{data.drivers.instability}</span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Recommendations
                </p>
                <ul className="space-y-1.5">
                  {data.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-600 leading-relaxed">
                      <span className="text-slate-400 mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Score Breakdown (Visual) */}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Score Breakdown
              </p>
              <div className="space-y-2.5">
                {/* Sleep Debt */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-slate-600">Sleep Debt</span>
                    <span className="text-[10px] font-semibold text-slate-900">{data.sleepDebtScore}/40</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${(data.sleepDebtScore / 40) * 100}%` }}
                    />
                  </div>
                </div>
                
                {/* Misalignment */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-slate-600">Circadian Misalignment</span>
                    <span className="text-[10px] font-semibold text-slate-900">{data.misalignmentScore}/40</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${(data.misalignmentScore / 40) * 100}%` }}
                    />
                  </div>
                </div>
                
                {/* Instability */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-slate-600">Schedule Instability</span>
                    <span className="text-[10px] font-semibold text-slate-900">{data.instabilityScore}/20</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                      style={{ width: `${(data.instabilityScore / 20) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-[13px] text-slate-500">No data available</p>
          </div>
        )}
      </div>
    </section>
  )
}

