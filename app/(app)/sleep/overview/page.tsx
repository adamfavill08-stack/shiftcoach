'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Brain, Lightbulb, AlertTriangle, TrendingUp } from 'lucide-react'

type SleepOverviewData = {
  analysis: string
  insights: string[]
  recommendations: string[]
  issues: string[]
  sleepData: {
    lastNight?: any
    last7?: any[]
    circadian?: any
    sleepDeficit?: any
  }
  statistics?: {
    totalSleepLast7Days: number
    averageSleepPerDay: number
    bestDay?: any
    worstDay?: any
    consistencyScore: number
    totalDaysWithSleep: number
  }
  metrics?: {
    bodyClockScore?: number | null
    recoveryScore?: number | null
    moodScore?: number | null
    focusScore?: number | null
    shiftType?: string | null
    sleepHoursLast24?: number | null
  }
}

export default function SleepOverviewPage() {
  const router = useRouter()
  const [data, setData] = useState<SleepOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        console.log('[SleepOverviewPage] Fetching overview...')
        setLoading(true)
        setError(null)
        const res = await fetch('/api/sleep/overview', { 
          cache: 'no-store',
          credentials: 'include',
        })
        
        console.log('[SleepOverviewPage] Response status:', res.status, res.statusText)
        
        if (!res.ok) {
          const errorText = await res.text()
          console.error('[SleepOverviewPage] Error response:', errorText)
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { error: errorText || `Failed to fetch overview: ${res.status}` }
          }
          throw new Error(errorData.error || errorData.details || `Failed to fetch overview: ${res.status}`)
        }
        
        const json = await res.json()
        console.log('[SleepOverviewPage] Received data:', {
          hasAnalysis: !!json.analysis,
          insightsCount: json.insights?.length || 0,
          recommendationsCount: json.recommendations?.length || 0,
        })
        setData(json)
      } catch (err: any) {
        console.error('[SleepOverviewPage] Failed to fetch overview:', err)
        setError(err.message || 'Failed to load sleep overview')
      } finally {
        setLoading(false)
      }
    }

    fetchOverview()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 backdrop-blur-sm border border-slate-200/80 text-slate-700 hover:bg-white hover:shadow-md transition-all active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-slate-900">
              Sleep Overview
            </h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Comprehensive analysis and AI-powered recommendations
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
              <p className="text-[14px] text-slate-600">Analyzing your sleep data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[24px] bg-white/90 backdrop-blur-xl border border-white shadow-lg px-6 py-8">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-5 w-5" strokeWidth={2.5} />
              <p className="text-[14px] font-semibold">{error}</p>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Overview Section */}
            {data.analysis && (
              <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_55px_rgba(15,23,42,0.08)] px-6 py-6">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 to-white/55" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-blue-500" strokeWidth={2.5} />
                    <h2 className="text-[17px] font-bold tracking-tight text-slate-900">
                      Overview
                    </h2>
                  </div>
                  <p className="text-[14px] text-slate-700 leading-relaxed">
                    {data.analysis}
                  </p>
                </div>
              </section>
            )}

            {/* Key Insights */}
            {data.insights && data.insights.length > 0 && (
              <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_55px_rgba(15,23,42,0.08)] px-6 py-6">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 to-white/55" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-5 w-5 text-indigo-500" strokeWidth={2.5} />
                    <h2 className="text-[17px] font-bold tracking-tight text-slate-900">
                      Key Insights
                    </h2>
                  </div>
                  <ul className="space-y-3">
                    {data.insights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2" />
                        <p className="text-[14px] text-slate-700 leading-relaxed flex-1">
                          {insight}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Recommendations */}
            {data.recommendations && data.recommendations.length > 0 && (
              <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_55px_rgba(15,23,42,0.08)] px-6 py-6">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 to-white/55" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="h-5 w-5 text-amber-500" strokeWidth={2.5} />
                    <h2 className="text-[17px] font-bold tracking-tight text-slate-900">
                      Shift Coach Recommendations
                    </h2>
                  </div>
                  <ul className="space-y-3">
                    {data.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-2" />
                        <p className="text-[14px] text-slate-700 leading-relaxed flex-1">
                          {rec}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Potential Issues */}
            {data.issues && data.issues.length > 0 && (
              <section className="relative overflow-hidden rounded-[24px] bg-amber-50/80 backdrop-blur-xl border border-amber-200/60 shadow-[0_20px_55px_rgba(15,23,42,0.08)] px-6 py-6">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-50/60 to-amber-50/40" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-amber-600" strokeWidth={2.5} />
                    <h2 className="text-[17px] font-bold tracking-tight text-amber-900">
                      Potential Issues
                    </h2>
                  </div>
                  <ul className="space-y-3">
                    {data.issues.map((issue, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-600 mt-2" />
                        <p className="text-[14px] text-amber-900 leading-relaxed flex-1">
                          {issue}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Detailed Statistics */}
            {data.statistics && (
              <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_55px_rgba(15,23,42,0.08)] px-6 py-6">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 to-white/55" />
                <div className="relative z-10">
                  <h2 className="text-[17px] font-bold tracking-tight text-slate-900 mb-5">
                    Sleep Statistics (Last 7 Days)
                  </h2>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        Total Sleep
                      </p>
                      <p className="text-[20px] font-bold text-slate-900">
                        {(data.statistics.totalSleepLast7Days / 60).toFixed(1)}h
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        Daily Average
                      </p>
                      <p className="text-[20px] font-bold text-slate-900">
                        {data.statistics.averageSleepPerDay.toFixed(1)}h
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        Days Logged
                      </p>
                      <p className="text-[20px] font-bold text-slate-900">
                        {data.statistics.totalDaysWithSleep}/7
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        Consistency
                      </p>
                      <p className="text-[20px] font-bold text-slate-900">
                        {data.statistics.consistencyScore}%
                      </p>
                    </div>
                  </div>
                  {data.statistics.bestDay && data.statistics.worstDay && (
                    <div className="pt-4 border-t border-slate-200/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-medium text-slate-600">Best Day</p>
                        <p className="text-[13px] font-semibold text-emerald-700">
                          {Math.floor(data.statistics.bestDay.total / 60)}h {data.statistics.bestDay.total % 60}m
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-medium text-slate-600">Worst Day</p>
                        <p className="text-[13px] font-semibold text-rose-700">
                          {Math.floor(data.statistics.worstDay.total / 60)}h {data.statistics.worstDay.total % 60}m
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 7-Day Sleep Breakdown */}
            {data.sleepData?.last7 && data.sleepData.last7.length > 0 && (
              <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_55px_rgba(15,23,42,0.08)] px-6 py-6">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 to-white/55" />
                <div className="relative z-10">
                  <h2 className="text-[17px] font-bold tracking-tight text-slate-900 mb-4">
                    Daily Sleep Breakdown
                  </h2>
                  <div className="space-y-3">
                    {data.sleepData.last7.map((day: any, index: number) => {
                      const date = new Date(day.dateISO)
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
                      const dayNum = date.getDate()
                      const hours = Math.floor(day.total / 60)
                      const minutes = day.total % 60
                      const isToday = index === 0
                      
                      return (
                        <div key={day.dateISO} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 text-center ${isToday ? 'text-blue-600 font-bold' : 'text-slate-600'}`}>
                              <p className="text-[11px] font-semibold">{dayName}</p>
                              <p className="text-[13px]">{dayNum}</p>
                            </div>
                            <div>
                              <p className="text-[14px] font-semibold text-slate-900">
                                {hours}h {minutes}m
                              </p>
                              {day.quality && day.quality !== '—' && (
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Quality: {day.quality}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                day.total >= 420 ? 'bg-emerald-500' :
                                day.total >= 360 ? 'bg-blue-500' :
                                day.total >= 300 ? 'bg-amber-500' :
                                'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, (day.total / 540) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Sleep Metrics */}
            {data.metrics && (
              <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_55px_rgba(15,23,42,0.08)] px-6 py-6">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 to-white/55" />
                <div className="relative z-10">
                  <h2 className="text-[17px] font-bold tracking-tight text-slate-900 mb-4">
                    Overall Metrics
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {data.metrics.bodyClockScore !== null && data.metrics.bodyClockScore !== undefined && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                          Body Clock Score
                        </p>
                        <p className="text-[20px] font-bold text-slate-900">
                          {Math.round(data.metrics.bodyClockScore)}/100
                        </p>
                      </div>
                    )}
                    {data.metrics.recoveryScore !== null && data.metrics.recoveryScore !== undefined && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                          Recovery Score
                        </p>
                        <p className="text-[20px] font-bold text-slate-900">
                          {Math.round(data.metrics.recoveryScore)}/100
                        </p>
                      </div>
                    )}
                    {data.metrics.moodScore !== null && data.metrics.moodScore !== undefined && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                          Mood
                        </p>
                        <p className="text-[20px] font-bold text-slate-900">
                          {data.metrics.moodScore}/5
                        </p>
                      </div>
                    )}
                    {data.metrics.focusScore !== null && data.metrics.focusScore !== undefined && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                          Focus
                        </p>
                        <p className="text-[20px] font-bold text-slate-900">
                          {data.metrics.focusScore}/5
                        </p>
                      </div>
                    )}
                    {data.metrics.shiftType && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                          Current Shift
                        </p>
                        <p className="text-[20px] font-bold text-slate-900 capitalize">
                          {data.metrics.shiftType}
                        </p>
                      </div>
                    )}
                    {data.metrics.sleepHoursLast24 !== null && data.metrics.sleepHoursLast24 !== undefined && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                          Sleep (24h)
                        </p>
                        <p className="text-[20px] font-bold text-slate-900">
                          {data.metrics.sleepHoursLast24.toFixed(1)}h
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Circadian & Sleep Deficit Details */}
            {(data.sleepData?.circadian || data.sleepData?.sleepDeficit) && (
              <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_55px_rgba(15,23,42,0.08)] px-6 py-6">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 to-white/55" />
                <div className="relative z-10">
                  <h2 className="text-[17px] font-bold tracking-tight text-slate-900 mb-4">
                    Circadian & Sleep Health
                  </h2>
                  <div className="space-y-4">
                    {data.sleepData.circadian && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[13px] font-semibold text-slate-700">Circadian Phase</p>
                          <p className="text-[18px] font-bold text-slate-900">
                            {Math.round(data.sleepData.circadian.circadianPhase * 100)}/100
                          </p>
                        </div>
                        {data.sleepData.circadian.factors && (
                          <div className="mt-3 space-y-2 text-[12px] text-slate-600">
                            {data.sleepData.circadian.factors.sleepDebt !== undefined && (
                              <div className="flex items-center justify-between">
                                <span>Sleep Debt Impact:</span>
                                <span className="font-semibold">
                                  {Math.round(data.sleepData.circadian.factors.sleepDebt * 100)}%
                                </span>
                              </div>
                            )}
                            {data.sleepData.circadian.factors.timing !== undefined && (
                              <div className="flex items-center justify-between">
                                <span>Timing Alignment:</span>
                                <span className="font-semibold">
                                  {Math.round(data.sleepData.circadian.factors.timing * 100)}%
                                </span>
                              </div>
                            )}
                            {data.sleepData.circadian.factors.consistency !== undefined && (
                              <div className="flex items-center justify-between">
                                <span>Consistency:</span>
                                <span className="font-semibold">
                                  {Math.round(data.sleepData.circadian.factors.consistency * 100)}%
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {data.sleepData.sleepDeficit && (
                      <div className="pt-4 border-t border-slate-200/60">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[13px] font-semibold text-slate-700">Weekly Sleep Deficit</p>
                          <p className={`text-[18px] font-bold ${
                            data.sleepData.sleepDeficit.weeklyDeficitHours > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}>
                            {data.sleepData.sleepDeficit.weeklyDeficitHours > 0 ? '+' : ''}
                            {data.sleepData.sleepDeficit.weeklyDeficitHours.toFixed(1)}h
                          </p>
                        </div>
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            data.sleepData.sleepDeficit.category === 'high' ? 'bg-rose-100 text-rose-700' :
                            data.sleepData.sleepDeficit.category === 'medium' ? 'bg-amber-100 text-amber-700' :
                            data.sleepData.sleepDeficit.category === 'low' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {data.sleepData.sleepDeficit.category.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Sleep Data Summary */}
            {data.sleepData && (
              <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_55px_rgba(15,23,42,0.08)] px-6 py-6">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 to-white/55" />
                <div className="relative z-10">
                  <h2 className="text-[17px] font-bold tracking-tight text-slate-900 mb-4">
                    Last Night's Sleep
                  </h2>
                  {data.sleepData.lastNight ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-medium text-slate-600">Duration</p>
                        <p className="text-[16px] font-bold text-slate-900">
                          {Math.floor(data.sleepData.lastNight.totalMinutes / 60)}h{' '}
                          {data.sleepData.lastNight.totalMinutes % 60}m
                        </p>
                      </div>
                      {data.sleepData.lastNight.quality && (
                        <div className="flex items-center justify-between">
                          <p className="text-[13px] font-medium text-slate-600">Quality</p>
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            data.sleepData.lastNight.quality === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
                            data.sleepData.lastNight.quality === 'Good' ? 'bg-blue-100 text-blue-700' :
                            data.sleepData.lastNight.quality === 'Fair' ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {data.sleepData.lastNight.quality}
                          </span>
                        </div>
                      )}
                      {data.sleepData.lastNight.deep !== undefined && (
                        <div className="pt-3 border-t border-slate-200/60">
                          <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-3">
                            Sleep Stages
                          </p>
                          <div className="grid grid-cols-4 gap-3">
                            <div className="text-center">
                              <p className="text-[11px] text-slate-500 mb-1">Deep</p>
                              <p className="text-[14px] font-bold text-slate-900">{data.sleepData.lastNight.deep}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[11px] text-slate-500 mb-1">REM</p>
                              <p className="text-[14px] font-bold text-slate-900">{data.sleepData.lastNight.rem}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[11px] text-slate-500 mb-1">Light</p>
                              <p className="text-[14px] font-bold text-slate-900">{data.sleepData.lastNight.light}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[11px] text-slate-500 mb-1">Awake</p>
                              <p className="text-[14px] font-bold text-slate-900">{data.sleepData.lastNight.awake}%</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[13px] text-slate-500">No sleep logged for last night</p>
                  )}
                </div>
              </section>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

