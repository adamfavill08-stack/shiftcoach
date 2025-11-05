'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useWeeklyProgress } from '@/lib/hooks/useWeeklyProgress'
import { WeeklySummaryCard } from '@/components/dashboard/WeeklySummaryCard'
import { WeeklyGoalsCard } from '@/components/dashboard/WeeklyGoalsCard'

function Sparkline({ values, color='currentColor' }:{ values: number[]; color?: string }){
  if (!values.length) return null
  const w = 320, h = 48
  const min = Math.min(...values)
  const max = Math.max(...values)
  const norm = (v:number) => max === min ? h/2 : h - ((v - min) / (max - min)) * h
  const step = w / (values.length - 1)
  const d = values.map((v,i)=>`${i===0?'M':'L'} ${i*step},${norm(v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12"> 
      <path d={d} stroke={color} strokeWidth={2} fill="none" />
    </svg>
  )
}

export default function ProgressPage(){
  const [weekOffset, setWeekOffset] = useState(0)
  const w = useWeeklyProgress(weekOffset)

  const weeklyBodyClockAvg = useMemo(()=> Math.round(w.bodyClockScores.reduce((a,b)=>a+b,0)/w.bodyClockScores.length), [w.bodyClockScores])
  const caloriesAdherence = useMemo(()=>{
    const days = w.days.length
    let on = 0
    for (let i=0;i<days;i++){
      const target = w.adjustedCalories[i] || 1
      const eaten = w.caloriesConsumed[i] || 0
      const diff = Math.abs(eaten - target) / target
      if (diff <= 0.10) on++
    }
    const deltaAvg = Math.round((w.caloriesConsumed.reduce((a,b)=>a+b,0) - w.adjustedCalories.reduce((a,b)=>a+b,0)) / days)
    return { daysOnTarget:on, daysTotal:days, percent: Math.round(on/days*100), deltaLabel: deltaAvg>0?`+${deltaAvg}`:`${deltaAvg}` }
  }, [w])

  const macroStats = useMemo(()=>{
    const avg = (arr:number[]) => Math.round(arr.reduce((a,b)=>a+b,0)/arr.length)
    // Simple adherence: within ±15% of average
    const mk = (arr:number[])=>{
      const average = avg(arr)
      const tol = average * 0.15
      const on = arr.filter(v => Math.abs(v-average) <= tol).length
      return { avg: average, adherencePercent: Math.round(on/arr.length*100) }
    }
    return {
      protein: mk(w.proteinG),
      carbs: mk(w.carbsG),
      fats: mk(w.fatsG),
    }
  }, [w]) as any

  const totalMealsLogged = useMemo(()=> w.mealsLoggedCount.reduce((a,b)=>a+b,0), [w])
  const avgMealsPerDay = useMemo(()=> totalMealsLogged / w.days.length, [totalMealsLogged, w.days.length])
  const photoMeals = useMemo(()=> w.aiMealsPhotoCount.reduce((a,b)=>a+b,0), [w])
  const barcodeMeals = useMemo(()=> w.aiMealsScanCount.reduce((a,b)=>a+b,0), [w])

  const avgSleepHours = useMemo(()=> w.sleepHours.reduce((a,b)=>a+b,0)/w.sleepHours.length, [w])
  const minSleepHours = useMemo(()=> Math.min(...w.sleepHours), [w])
  const maxSleepHours = useMemo(()=> Math.max(...w.sleepHours), [w])
  const avgSleepAlignment = useMemo(()=> Math.round(w.sleepTimingScore.reduce((a,b)=>a+b,0)/w.sleepTimingScore.length), [w])

  const avgMood = useMemo(()=> w.moodScores.reduce((a,b)=>a+b,0)/w.moodScores.length, [w])
  const avgFocus = useMemo(()=> w.focusScores.reduce((a,b)=>a+b,0)/w.focusScores.length, [w])

  const totalCoachChats = useMemo(()=> w.coachInteractions.reduce((a,b)=>a+b,0), [w])

  return (
    <main
      style={{
        backgroundImage: 'radial-gradient(circle at top, var(--bg-soft), var(--bg))',
      }}
    >
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center justify-between mb-1">
          <Link
            href="/dashboard"
            className="p-2 rounded-full backdrop-blur-xl border transition-all"
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
            aria-label="Back"
          >
            ←
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>Progress</h1>
            <p className="text-sm" style={{ color: 'var(--text-soft)' }}>Your last 7 days at a glance.</p>
          </div>
          <div
            className="inline-flex items-center rounded-full backdrop-blur-xl border px-3 py-1 text-xs gap-2"
            style={{
              backgroundColor: 'var(--card-subtle)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-soft)',
            }}
          >
            <button
              onClick={()=>setWeekOffset(weekOffset-1)}
              className="transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              ‹
            </button>
            <span>{weekOffset===0? 'This week' : weekOffset===-1? 'Next week' : `${Math.abs(weekOffset)}w ${weekOffset<0?'ahead':'ago'}`}</span>
            <button
              onClick={()=>setWeekOffset(weekOffset+1)}
              className="transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              ›
            </button>
          </div>
        </header>

        {/* Weekly Summary Card */}
        <WeeklySummaryCard />

        {/* Weekly Goals Card */}
        <WeeklyGoalsCard />

        {/* Hero – Body Clock weekly */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-soft)' }}>Body Clock</p>
              <p className="text-sm" style={{ color: 'var(--text-main)' }}>Weekly Shift Rhythm™ average</p>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-3xl font-semibold" style={{ color: 'var(--text-main)' }}>{weeklyBodyClockAvg}</p>
              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>out of 100</p>
            </div>
          </div>
          <Sparkline values={w.bodyClockScores} color="#0ea5e9" />
          <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Upward trend this week.</p>
        </section>

        {/* Nutrition block */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-4"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Nutrition</p>
            <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Last 7 days</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-soft)' }}>Calories</p>
              <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ring-bg)' }}>
                <div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" style={{ width: `${caloriesAdherence.percent}%` }} />
              </div>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-soft)' }}>{caloriesAdherence.daysOnTarget} of {caloriesAdherence.daysTotal} days within your adjusted target.</p>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Average</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{caloriesAdherence.deltaLabel} kcal</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(['Protein','Carbs','Fats'] as const).map((label) => {
              const key = label.toLowerCase() as 'protein'|'carbs'|'fats'
              const stat = macroStats[key]
              return (
                <div
                  key={label}
                  className="rounded-2xl border px-3 py-2.5 flex flex-col gap-1"
                  style={{
                    backgroundColor: 'var(--card-subtle)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-soft)' }}>{label}</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{stat.avg}g</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>{stat.adherencePercent}% of days on target</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Meals & logging */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Meals & logging</p>
            <p className="text-xs" style={{ color: 'var(--text-soft)' }}>This week</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="flex flex-col gap-1">
              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Meals logged</p>
              <p className="text-lg font-semibold" style={{ color: 'var(--text-main)' }}>{totalMealsLogged}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>{Math.round(avgMealsPerDay*10)/10}/day</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Photo</p>
              <p className="text-lg font-semibold" style={{ color: 'var(--text-main)' }}>{photoMeals}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>AI estimates</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Scan</p>
              <p className="text-lg font-semibold" style={{ color: 'var(--text-main)' }}>{barcodeMeals}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>from barcode</p>
            </div>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Entries marked "AI" or "Scan" are still editable — they're smart starting points, not fixed numbers.</p>
        </section>

        {/* Sleep & recovery */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Sleep & recovery</p>
            <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Last 7 days</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-soft)' }}>Sleep hours</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-main)' }}>{avgSleepHours.toFixed(1)}<span className="text-sm font-normal ml-1" style={{ color: 'var(--text-soft)' }}>h/night</span></p>
              <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>Range: {minSleepHours.toFixed(1)}–{maxSleepHours.toFixed(1)} h</p>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-soft)' }}>Alignment</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{avgSleepAlignment}%</p>
              <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>with your body clock</p>
            </div>
          </div>
          <Sparkline values={w.sleepHours} color="#64748b" />
        </section>

        {/* Mood & Focus */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Mood & Focus</p>
            <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Average this week</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">😊</span>
              <div className="flex flex-col">
                <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Mood</p>
                <p className="text-lg font-semibold" style={{ color: 'var(--text-main)' }}>{avgMood.toFixed(1)}/5</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <div className="flex flex-col items-end">
                <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Focus</p>
                <p className="text-lg font-semibold" style={{ color: 'var(--text-main)' }}>{avgFocus.toFixed(1)}/5</p>
              </div>
            </div>
          </div>
          <Sparkline values={w.moodScores} color="#0ea5e9" />
          <p className="mt-1 text-[11px]" style={{ color: 'var(--text-soft)' }}>Mood dipped on your last night shift – plan an easier day after nights.</p>
        </section>

        {/* AI Coach insight */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-4 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-xs text-white">💬</div>
            <div className="flex flex-col">
              <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>AI Coach</p>
              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>{totalCoachChats} conversations this week</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>Most chats happened after night shifts. Next week we'll keep nudging you to plan recovery days after runs of nights.</p>
        </section>
      </div>
    </main>
  )
}
