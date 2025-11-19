'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useActivityToday } from '@/lib/hooks/useActivityToday'

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
  color?: 'emerald' | 'blue';
}) {
  const pct = percentage(value, max)
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const strokeLength = (pct / 100) * circumference
  
  const strokeColor = color === 'emerald' 
    ? '#10b981' 
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
        <div className="text-[17px] font-bold tracking-[-0.01em] text-slate-900 leading-none">{value}</div>
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

  const activeMinutes = loading ? 0 : Math.max(0, data.activeMinutes ?? 0)
  const targetMinutes = 30 // Daily target
  const activePct = percentage(activeMinutes, targetMinutes)
  
  // Intensity breakdown (mock data - replace with real data)
  const intensityBreakdown = {
    light: { minutes: 0, target: 10 },
    moderate: { minutes: 0, target: 15 },
    vigorous: { minutes: 0, target: 5 },
  }
  
  // Movement consistency (mock data - replace with real data)
  const movementConsistency = 76
  
  // Recovery and Activity scores (mock data - replace with real data)
  const recoveryScore = 82
  const activityScore = 36
  
  const coachMessage = useMemo(() => {
    if (data.nextCoachMessage) return data.nextCoachMessage
    if (activeMinutes < targetMinutes - 10) {
      return "You're below your activity target—add a short walk before your shift to balance today better."
    }
    return 'Nice pacing so far. Keep movement light in your wind-down window to support better sleep.'
  }, [data.nextCoachMessage, activeMinutes, targetMinutes])

  const shiftPlan = useMemo(() => {
    const shiftType = data.shiftType?.toLowerCase() || 'night'
    if (shiftType === 'night') {
      return {
        title: 'Night shift plan',
        activities: [
          '10 min pre-shift walk',
          'Mid-shift stretch break',
          'Post-shift wind-down walk'
        ],
        intensity: 'Moderate'
      }
    }
    return {
      title: 'Day shift plan',
      activities: [
        'Morning walk',
        'Lunch break movement',
        'Evening recovery walk'
      ],
      intensity: 'Moderate'
    }
  }, [data.shiftType])

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
            <div className="space-y-1">
              <h2 className="text-[13px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                INTENSITY BREAKDOWN
              </h2>
            </div>
            
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 space-y-1">
                <h1 className="text-[17px] font-bold tracking-[-0.01em] text-slate-900">
                  {activeMinutes} Active Minutes
                </h1>
                <p className="text-[12px] text-slate-500 leading-relaxed">
                  {activePct}% of daily target
                </p>
                
                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Light', minutes: intensityBreakdown.light.minutes, target: intensityBreakdown.light.target },
                    { label: 'Moderate', minutes: intensityBreakdown.moderate.minutes, target: intensityBreakdown.moderate.target },
                    { label: 'Vigorous', minutes: intensityBreakdown.vigorous.minutes, target: intensityBreakdown.vigorous.target },
                  ].map((item) => {
                    const pct = percentage(item.minutes, item.target)
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-slate-500">{item.label}</span>
                          <span className="text-[12px] text-slate-500">{item.minutes}/{item.target} min</span>
                        </div>
                        <div className="relative h-2 w-full rounded-full bg-slate-100/80 border border-slate-200/50 shadow-inner overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-200"
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
          </div>
        </section>

        {/* AI SHIFT COACH Recommendation Card */}
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-7 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 border border-white/30">
                <span className="text-[11px] font-bold text-white">AI</span>
              </div>
              <h2 className="text-[13px] font-bold tracking-[0.15em] text-white/90 uppercase">
                AI SHIFT COACH
              </h2>
            </div>
            <p className="text-[12px] text-white/90 leading-relaxed">
              {coachMessage}
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-coach-chat'))}
              className="text-[12px] text-white underline underline-offset-4 decoration-white/60 hover:decoration-white transition-colors"
            >
              View analysis
            </button>
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
                {movementConsistency}
              </h1>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                This week
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                <span key={idx} className="text-[13px] font-semibold tracking-tight text-slate-900 flex-1 text-center">
                  {day}
                </span>
              ))}
            </div>
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
                <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">
                  {shiftPlan.title}
                </h3>
                <ul className="space-y-1.5">
                  {shiftPlan.activities.map((activity, idx) => (
                    <li key={idx} className="text-[12px] text-slate-500 leading-relaxed">
                      • {activity}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-[13px] font-semibold tracking-tight text-slate-900 flex-shrink-0">
                {shiftPlan.intensity}
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
                  subLabel="High"
                  color="emerald"
                />
                <div className="space-y-2 w-full">
                  <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">
                    Recovery
                  </h3>
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    Your body is well-rested and restored. Strong deep/REM balance and consistent sleep boosted your readiness today.
                  </p>
                </div>
              </div>
              
              {/* Activity */}
              <div className="flex flex-col items-center text-center space-y-4">
                <CircularGauge 
                  value={activityScore} 
                  max={100} 
                  label="Activity"
                  subLabel="Low-Moderate"
                  color="blue"
                />
                <div className="space-y-2 w-full">
                  <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">
                    Activity
                  </h3>
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    You've accumulated a small amount of strain so far. Your body still has plenty of capacity left for movement or training.
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
              Because your recovery is high and your activity load is still low, you're in an ideal window for moderate training – such as a structured workout, long walk.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
