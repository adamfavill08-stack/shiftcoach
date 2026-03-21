'use client'

import { useState, useEffect, useCallback } from 'react'
import { Pencil } from 'lucide-react'

type SleepDay = {
  date: string
  totalMinutes: number
  totalSleepHours: number
  shift?: {
    label: string
    type?: string | null
  } | null
  stages?: {
    awake: number
    rem: number
    light: number
    deep: number
  }
}

type SleepStage = {
  label: string
  minutes: number
  color: string
}

type SleepLogCardProps = {
  onEdit?: () => void
  onDayClick?: (date: string) => void
}

export function SleepLogCard({ onEdit, onDayClick }: SleepLogCardProps) {
  const [days, setDays] = useState<SleepDay[]>([])
  const [lastNightHours, setLastNightHours] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastNightStages, setLastNightStages] = useState<SleepStage[]>([])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch 7-day sleep data
      const sleepRes = await fetch(`/api/sleep/7days?t=${Date.now()}`, {
        cache: 'no-store',
      })
      
      if (sleepRes.ok) {
        const sleepData = await sleepRes.json()
        const daysArray = sleepData.days || []
        
        // Use stages from API (already predicted by AI)
        // If stages are missing, they'll be null and we'll show empty bars
        const daysWithStages = daysArray.map((day: SleepDay) => {
          if (day.stages) return day
          
          // If no stages and no sleep, return empty
          if (day.totalMinutes === 0) {
            return { ...day, stages: { awake: 0, rem: 0, light: 0, deep: 0 } }
          }
          
          // If we have sleep but no stages, return null (will show as no data)
          // This shouldn't happen if the API is working correctly
          return { ...day, stages: null }
        })
        
        setDays(daysWithStages)
        
        // Get last night's sleep data for the breakdown
        if (daysWithStages.length > 0) {
          const lastNight = daysWithStages[0]
          
          // Set last night's total hours
          if (lastNight.totalSleepHours > 0) {
            setLastNightHours(lastNight.totalSleepHours)
          } else {
            setLastNightHours(null)
          }
          
          // Set last night's stages for the breakdown
          if (lastNight.stages) {
            setLastNightStages([
              { label: 'Awake', minutes: lastNight.stages.awake, color: 'bg-blue-100' },
              { label: 'REM', minutes: lastNight.stages.rem, color: 'bg-blue-300' },
              { label: 'Light', minutes: lastNight.stages.light, color: 'bg-blue-500' },
              { label: 'Deep', minutes: lastNight.stages.deep, color: 'bg-blue-700' },
            ])
          } else {
            setLastNightStages([])
          }
        } else {
          setLastNightHours(null)
          setLastNightStages([])
        }
      }
    } catch (err) {
      console.error('[SleepLogCard] Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    
    // Listen for sleep refresh events with debouncing
    let refreshTimeout: NodeJS.Timeout | null = null
    const handleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      refreshTimeout = setTimeout(() => {
        fetchData()
      }, 300)
    }
    window.addEventListener('sleep-refreshed', handleRefresh)
    
    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      window.removeEventListener('sleep-refreshed', handleRefresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatDayLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()
    
    if (isToday) return 'Today'
    
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
    return dayNames[date.getDay()]
  }

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return '—'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  // Get the last 7 days in order (most recent first, but display oldest to newest)
  const displayDays = [...days].reverse()

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.5)] px-7 py-6">
      {/* Gradient overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 via-white/60 to-white/85" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {/* Inner glow ring */}
      <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-white/50 ring-inset" />
      
      {/* Ambient blur */}
      <div className="pointer-events-none absolute -inset-4 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/20 blur-3xl" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase">
            SLEEP LOG
          </h2>
          {onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100/80 hover:bg-slate-200/80 text-[11px] font-semibold text-slate-700 transition-all duration-200 hover:scale-105 active:scale-95 border border-slate-200/60 shadow-sm"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )}
        </div>

        {/* Last 7 Days Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-semibold text-slate-600">Last 7 Days</p>
            {lastNightHours !== null && (
              <div className="flex flex-col items-end">
                <p className="text-[28px] font-bold text-slate-900 leading-none">
                  {lastNightHours.toFixed(1)}
                </p>
                <p className="text-[10px] font-medium text-slate-500 mt-0.5">Last night&apos;s sleep/nap</p>
              </div>
            )}
          </div>

          {/* 7-Day Stacked Bar Chart */}
          <div className="flex items-end justify-between gap-1.5 h-24">
            {displayDays.map((day) => {
              const isToday = formatDayLabel(day.date) === 'Today'
              const total = day.stages ? 
                day.stages.awake + day.stages.rem + day.stages.light + day.stages.deep : 
                day.totalMinutes
              
              if (total === 0) {
                return (
                  <button
                    key={day.date}
                    onClick={() => onDayClick?.(day.date)}
                    className="flex-1 flex flex-col items-center gap-1 transition-all hover:scale-105 active:scale-95"
                  >
                    <div className="w-full h-2 rounded-full bg-slate-100/60" />
                    <p className={`text-[9px] font-semibold ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                      {formatDayLabel(day.date)}
                    </p>
                    {/* Shift indicator */}
                    {day.shift && (
                      <p className={`text-[8px] font-medium mt-0.5 ${
                        day.shift.type === 'night' ? 'text-slate-700'
                        : day.shift.type === 'morning' ? 'text-blue-600'
                        : day.shift.type === 'afternoon' ? 'text-indigo-600'
                        : day.shift.type === 'day' ? 'text-sky-600'
                        : 'text-slate-500'
                      }`}>
                        {day.shift.label === 'OFF' ? 'OFF' : day.shift.type?.charAt(0).toUpperCase() || day.shift.label}
                      </p>
                    )}
                  </button>
                )
              }

              // Calculate percentages for stacked bars
              const maxHeight = 80 // max height in pixels
              const stages = day.stages || { awake: 0, rem: 0, light: 0, deep: 0 }
              const totalMinutes = stages.awake + stages.rem + stages.light + stages.deep || day.totalMinutes
              
              // Normalize to 8 hours max (480 minutes)
              const normalizedHeight = Math.min((totalMinutes / 480) * maxHeight, maxHeight)
              
              const stageHeights = totalMinutes > 0 ? {
                awake: (stages.awake / totalMinutes) * normalizedHeight,
                rem: (stages.rem / totalMinutes) * normalizedHeight,
                light: (stages.light / totalMinutes) * normalizedHeight,
                deep: (stages.deep / totalMinutes) * normalizedHeight,
              } : {
                awake: 0,
                rem: 0,
                light: 0,
                deep: 0,
              }

              return (
                <button
                  key={day.date}
                  onClick={() => onDayClick?.(day.date)}
                  className="flex-1 flex flex-col items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                >
                  {/* Stacked bar */}
                  <div className="relative w-full flex flex-col-reverse items-center justify-end" style={{ height: `${maxHeight}px` }}>
                    <div className="absolute bottom-0 w-full rounded-t-lg overflow-hidden" style={{ height: `${normalizedHeight}px` }}>
                      {/* Deep (darkest blue) */}
                      {stageHeights.deep > 0 && (
                        <div 
                          className="w-full bg-blue-700"
                          style={{ height: `${stageHeights.deep}px` }}
                        />
                      )}
                      {/* Light */}
                      {stageHeights.light > 0 && (
                        <div 
                          className="w-full bg-blue-500"
                          style={{ height: `${stageHeights.light}px` }}
                        />
                      )}
                      {/* REM */}
                      {stageHeights.rem > 0 && (
                        <div 
                          className="w-full bg-blue-300"
                          style={{ height: `${stageHeights.rem}px` }}
                        />
                      )}
                      {/* Awake (lightest blue) */}
                      {stageHeights.awake > 0 && (
                        <div 
                          className="w-full bg-blue-100"
                          style={{ height: `${stageHeights.awake}px` }}
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Day label */}
                  <p className={`text-[9px] font-semibold ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                    {formatDayLabel(day.date)}
                  </p>
                  
                  {/* Shift indicator */}
                  {day.shift && (
                    <p className={`text-[8px] font-medium mt-0.5 ${
                      day.shift.type === 'night' ? 'text-slate-700'
                      : day.shift.type === 'morning' ? 'text-blue-600'
                      : day.shift.type === 'afternoon' ? 'text-indigo-600'
                      : day.shift.type === 'day' ? 'text-sky-600'
                      : 'text-slate-500'
                    }`}>
                      {day.shift.label === 'OFF' ? 'OFF' : day.shift.type?.charAt(0).toUpperCase() || day.shift.label}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sleep Stages Breakdown */}
        <div className="mb-6">
          <p className="text-[12px] font-semibold text-slate-600 mb-3">Sleep Stages</p>
          <div className="space-y-2.5">
            {lastNightStages.length > 0 ? (
              lastNightStages.map((stage) => {
                const totalMinutes = lastNightStages.reduce((sum, s) => sum + s.minutes, 0)
                const percentage = totalMinutes > 0 ? (stage.minutes / totalMinutes) * 100 : 0
                
                return (
                  <div key={stage.label} className="flex items-center gap-3">
                    <div className="w-16">
                      <p className="text-[11px] font-semibold text-slate-700">{stage.label}</p>
                    </div>
                    <div className="flex-1 h-3 rounded-full bg-slate-100/60 overflow-hidden">
                      <div
                        className={`h-full ${stage.color} transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-20 text-right">
                      <p className="text-[11px] font-semibold text-slate-900">
                        {formatDuration(stage.minutes)}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-4 text-center">
                <p className="text-[11px] text-slate-400">No sleep data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Shift Coach Message */}
        {lastNightHours !== null && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/60 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              {/* Coach Icon */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <span className="text-white text-[12px] font-bold">SC</span>
              </div>
              
              {/* Message */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-700 mb-1.5">Shift Coach</p>
                <p className="text-[12px] text-slate-600 leading-relaxed">
                  {lastNightHours >= 7 ? (
                    <>
                      <span className="font-semibold text-emerald-700">Well done!</span> You got {lastNightHours.toFixed(1)} hours of sleep last night. Keep maintaining this consistent sleep schedule to support your body clock and recovery.
                    </>
                  ) : lastNightHours >= 5 ? (
                    <>
                      You slept {lastNightHours.toFixed(1)} hours last night, which is below the recommended 7-9 hours. Try to get to bed earlier tonight or take a short nap today if possible. Consistent sleep timing is key for shift workers.
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-amber-700">Sleep alert:</span> You only got {lastNightHours.toFixed(1)} hours of sleep last night. This is significantly below the recommended amount. Prioritize getting to bed earlier tonight, and consider a 20-30 minute nap if you feel fatigued. Your body needs adequate rest to function optimally.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

