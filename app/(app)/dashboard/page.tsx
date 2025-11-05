'use client'

import { useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

import { getMyProfile, isComplete, type Profile } from '@/lib/profile'

import { getTodayShift } from '@/lib/today'

import { getCoachTipV2 } from '@/lib/coach'

import { computeToday } from '@/lib/engine'

import { mlToFloz } from '@/lib/units'

import { MobileShell } from '@/components/MobileShell'


 

import { MoodFocus } from '@/components/dashboard/MoodFocus'

 

 
import { ShiftWeekStrip } from '@/components/dashboard/ShiftWeekStrip'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import Link from 'next/link'
import clsx from 'clsx'
import { AiCoachCard } from '@/components/dashboard/AiCoachCard'
import { NutrientRingStrip } from '@/components/dashboard/NutrientRingStrip'
// ShiftRhythmHero removed
import BodyClockCard from '@/components/dashboard/BodyClockCard'
import StepsCard from '@/components/StepsCard'
import { TodayMealsCard } from '@/components/dashboard/TodayMealsCard'
import HeroMealCard from '@/components/dashboard/HeroMealCard'
import { getTodayMealSchedule } from '@/lib/nutrition/getTodayMealSchedule'
import { useStepGoal } from '@/lib/hooks/useStepGoal'
import { getStepRecommendation } from '@/lib/steps/getStepRecommendation'
import { useShiftRhythm } from '@/lib/hooks/useShiftRhythm'
import { useTodayNutrition } from '@/lib/hooks/useTodayNutrition'
import { Fragment } from 'react'
import { Toast, useToast } from '@/components/ui/Toast'

type Today = {
  water_ml: number
  caffeine_mg: number
  mood: number
  focus: number
}

type EngineOut = {
  rhythm_score:number; adjusted_kcal:number; recovery_score:number; binge_risk:'Low'|'Medium'|'High';
  sleep_window:{start:string; end:string}; caffeine_cutoff:string;
  macros:{protein_g:number; carbs_g:number; fats_g:number};
  timeline:{time:string; icon:string; label:string}[];
}

function utcDayRange() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [today, setToday] = useState<Today | null>(null)
  const [todayShift, setTodayShift] = useState<any | null>(null)
  const [eng, setEng] = useState<EngineOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [kcalConsumed, setKcalConsumed] = useState<number>(0)
  const [macrosConsumed, setMacrosConsumed] = useState({ protein_g: 0, carbs_g: 0, fats_g: 0 })
  const [todayMeals, setTodayMeals] = useState<{ slot: string; title: string; eaten: boolean; thumbnail_url?: string }[]>([])
  const [loggingId, setLoggingId] = useState<string | null>(null)

  type LastSleep = {
    start_ts: string
    end_ts: string
    sleep_hours: number | null
    quality: number
  }
  const [lastSleep, setLastSleep] = useState<LastSleep | null>(null)
  const [avgHours7d, setAvgHours7d] = useState<number | null>(null)

  const { stepGoal } = useStepGoal()
  const { toast, showToast, dismissToast } = useToast()
  const { data: todayNutrition, refresh: refreshNutrition } = useTodayNutrition()
  
  const { total: shiftRhythmTotal, loading: shiftRhythmLoading, refetch: refetchShiftRhythm } = useShiftRhythm(
    (change, newScore) => {
      // Show toast when score changes by more than 10 points
      if (change > 10) {
        showToast("Your rhythm's improving — nice consistency!", 'success', 5000)
      } else if (change < -10) {
        showToast("Your rhythm slipped — focus on recovery tonight.", 'warning', 5000)
      }
    }
  )

  function minsToHhMm(min:number) {
    const h = Math.floor(min / 60)
    const m = Math.round(min % 60)
    return `${h}h ${m}m`
  }

  function utcIsoDaysAgo(n:number) {
    const now = new Date()
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - n, 0, 0, 0))
    return d.toISOString()
  }

  // Gate: require auth
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/sign-in'); return }

      const p = await getMyProfile()
      if (!p || !isComplete(p)) { router.replace('/onboarding'); return }

      setProfile(p)
      setLoading(false)
    })()
  }, [router])

  async function loadToday() {
    const { startISO, endISO } = utcDayRange()

    const [w, c, m] = await Promise.all([
      supabase.from('water_logs').select('ml').gte('ts', startISO).lt('ts', endISO),
      supabase.from('caffeine_logs').select('mg').gte('ts', startISO).lt('ts', endISO),
      supabase.from('mood_logs').select('mood,focus,ts').gte('ts', startISO).lt('ts', endISO).order('ts', { ascending: false }).limit(1),
    ])
    setToday({
      water_ml: (w.data ?? []).reduce((a, r: any) => a + r.ml, 0),
      caffeine_mg: (c.data ?? []).reduce((a, r: any) => a + r.mg, 0),
      mood: m.data?.[0]?.mood ?? 3,
      focus: m.data?.[0]?.focus ?? 3,
    })
  }

  async function loadTodayAll() {
    await loadToday()
    const s = await getTodayShift()
    setTodayShift(s)
  }

  async function loadNutritionToday() {
    const { startISO, endISO } = utcDayRange()
    const { data, error } = await supabase
      .from('nutrition_logs')
      .select('kcal,protein_g,carbs_g,fats_g,ts')
      .gte('ts', startISO).lt('ts', endISO)
    if (!error) {
      const t = (data ?? []).reduce((acc:any, r:any) => ({
        kcal: acc.kcal + (r.kcal || 0),
        P: acc.P + (r.protein_g || 0),
        C: acc.C + (r.carbs_g || 0),
        F: acc.F + (r.fats_g || 0),
      }), { kcal: 0, P: 0, C: 0, F: 0 })
      setKcalConsumed(t.kcal)
      setMacrosConsumed({ protein_g: t.P, carbs_g: t.C, fats_g: t.F })
    }
  }

  async function loadMealsToday() {
    const today = new Date().toISOString().slice(0,10)
    const { data, error } = await supabase
      .from('meal_plans')
      .select('slot,title,eaten,date,thumbnail_url')
      .eq('date', today)
      .order('slot', { ascending: true })
    if (!error && data) setTodayMeals(data as any)
  }

  async function loadLastSleep() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data, error } = await supabase
      .from('sleep_logs')
      .select('start_ts,end_ts,sleep_hours,quality')
      .eq('user_id', user.id)
      .eq('naps', 0) // Main sleep (naps = 0)
      .order('end_ts', { ascending: false })
      .limit(1)
    if (!error && data && data.length) {
      setLastSleep(data[0] as any)
    }
  }

  async function loadAvg7d() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data, error } = await supabase
      .from('sleep_logs')
      .select('sleep_hours,start_ts,end_ts')
      .eq('user_id', user.id)
      .gte('start_ts', utcIsoDaysAgo(6))
      .lt('start_ts', new Date(Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate() + 1, 0,0,0)).toISOString()
      )
    if (!error) {
      // Calculate average from sleep_hours if available, otherwise compute from start_ts/end_ts
      const totalHours = (data ?? []).reduce((a: number, r: any) => {
        if (r.sleep_hours != null) {
          return a + r.sleep_hours
        }
        // Fallback: compute from timestamps if sleep_hours is null
        if (r.start_ts && r.end_ts) {
          const durationMs = new Date(r.end_ts).getTime() - new Date(r.start_ts).getTime()
          return a + (durationMs / 3600000)
        }
        return a + 0
      }, 0)
      const count = data?.length ?? 1
      setAvgHours7d(Math.round((totalHours / count) * 10) / 10)
    }
  }

  useEffect(() => { if (profile) loadTodayAll() }, [profile])
  useEffect(() => { if (profile) loadNutritionToday() }, [profile])
  useEffect(() => { if (profile) loadMealsToday() }, [profile])
  useEffect(() => {
    if (!profile) return
    loadLastSleep()
    loadAvg7d()
  }, [profile])

  // Refetch shift rhythm when sleep/shift data changes
  useEffect(() => {
    if (profile && (lastSleep || todayShift)) {
      // Small delay to ensure data is saved
      const timer = setTimeout(() => {
        refetchShiftRhythm()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [profile, lastSleep, todayShift, refetchShiftRhythm])

  useEffect(() => {
    if (localStorage.getItem('refresh-dash') === '1') {
      localStorage.removeItem('refresh-dash')
      loadNutritionToday()
      loadMealsToday()
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!profile || !today) return
      const e = await computeToday(profile)
      setEng(e)
    })()
  }, [profile, today?.water_ml, today?.caffeine_mg])

  // Quick adds
  async function addWater(ml: number) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('water_logs').insert({ user_id: user.id, ml })
    loadToday()
  }

  async function addCaffeine(mg: number) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !profile) return
    await supabase.from('caffeine_logs').insert({ user_id: user.id, mg })
    loadToday()
    // Refresh engine after logging caffeine to update cutoff & scores
    const e = await computeToday(profile)
    setEng(e)
  }

  async function setMoodFocus(mood: number, focus: number) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('mood_logs').insert({ user_id: user.id, mood, focus })
    loadToday()
  }

  // Derived display (calculated even if data not loaded yet)
  const waterGoal = profile?.water_goal_ml ?? 2500
  const waterPct = today ? Math.min(100, Math.round((today.water_ml / waterGoal) * 100)) : 0
  const cafPct = today ? Math.min(100, Math.round((today.caffeine_mg / 300) * 100)) : 0 // 300mg soft cap
  
  // Water display with unit conversion
  const waterDisplay = profile?.units === 'imperial'
    ? `${mlToFloz(today?.water_ml ?? 0)} / ${mlToFloz(waterGoal)} fl oz`
    : `${((today?.water_ml ?? 0) / 1000).toFixed(1)} / ${(waterGoal / 1000).toFixed(1)} L`

  // Compute coach tip
  const coach = eng && profile && today ? getCoachTipV2({
    profile,
    rhythm_score: eng.rhythm_score,
    recovery_score: eng.recovery_score,
    binge_risk: eng.binge_risk,
    caffeine_cutoff: eng.caffeine_cutoff,
    water_ml: today.water_ml,
    water_goal_ml: profile.water_goal_ml ?? 2500,
    caffeine_mg: today.caffeine_mg,
    sleep_goal_h: profile.sleep_goal_h ?? 7.5,
  }) : null

  const bingeRisk: 'Low' | 'Medium' | 'High' | null = (eng?.binge_risk as any) ?? null
  const bingeTextColor = bingeRisk === 'Low'
    ? 'text-emerald-500'
    : bingeRisk === 'Medium'
    ? 'text-amber-500'
    : bingeRisk === 'High'
    ? 'text-rose-500'
    : 'text-slate-500'
  const bingeBgColor = bingeRisk === 'Low'
    ? 'bg-emerald-50'
    : bingeRisk === 'Medium'
    ? 'bg-amber-50'
    : bingeRisk === 'High'
    ? 'bg-rose-50'
    : 'bg-slate-50'

  const recoveryScoreValue: number | null = typeof eng?.recovery_score === 'number' ? (eng?.recovery_score as number) : null
  let recoveryTextColor = 'text-slate-500'
  let recoveryBgColor = 'bg-slate-50'
  if (typeof recoveryScoreValue === 'number') {
    if (recoveryScoreValue >= 75) {
      recoveryTextColor = 'text-emerald-600'
      recoveryBgColor = 'bg-emerald-50'
    } else if (recoveryScoreValue >= 50) {
      recoveryTextColor = 'text-amber-600'
      recoveryBgColor = 'bg-amber-50'
    } else {
      recoveryTextColor = 'text-rose-600'
      recoveryBgColor = 'bg-rose-50'
    }
  }

  // Debug (will remove later)
  if (profile && today) {
    console.log('eng?', !!eng, 'coach?', !!coach)
  }

  // Then conditionally render UI
  if (loading || !profile || !today) {
    return <MobileShell title="Today"><div className="p-6">Loading…</div></MobileShell>
  }

  return (
    <MobileShell title="Today">
      <div
        className="px-4 pt-0 pb-10 max-w-md mx-auto space-y-4"
        style={{
          backgroundImage: 'radial-gradient(circle at top, var(--bg-soft), var(--bg))',
        }}
      >
        <DashboardHeader user={null} />

        <div>
          <BodyClockCard score={shiftRhythmTotal ?? eng?.rhythm_score ?? null} loading={shiftRhythmLoading} />
        </div>

        {/* Toast notification */}
        <Toast toast={toast} onDismiss={dismissToast} />

        <div className="grid grid-cols-2 gap-4 w-full">
          <Link href="/adjusted-calories" className="block cursor-pointer transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99]">
            <div
              className="aspect-square flex flex-col justify-center items-center rounded-2xl backdrop-blur-2xl border"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border-subtle)',
                boxShadow: 'var(--shadow-soft)',
              }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--text-soft)' }}>Adjusted</p>
              <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--text-main)' }}>
                {(eng?.adjusted_kcal ?? 0).toLocaleString()}
                <span className="ml-1 text-sm" style={{ color: 'var(--text-soft)' }}>kcal</span>
              </p>
            </div>
          </Link>

          <Link href="/sleep" className="block cursor-pointer transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99]">
            <div
              className="aspect-square flex flex-col justify-center items-center rounded-2xl backdrop-blur-2xl border"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border-subtle)',
                boxShadow: 'var(--shadow-soft)',
              }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--text-soft)' }}>Sleep Hours</p>
              <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--text-main)' }}>
                {(avgHours7d ?? profile.sleep_goal_h ?? 7.5).toFixed(1)}
                <span className="ml-1 text-sm" style={{ color: 'var(--text-soft)' }}>h</span>
              </p>
            </div>
          </Link>

          <Link href="/recovery" className="block cursor-pointer transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99]">
            <div
              className="aspect-square flex flex-col justify-center items-center rounded-2xl backdrop-blur-2xl border"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border-subtle)',
                boxShadow: 'var(--shadow-soft)',
              }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--text-soft)' }}>Recovery</p>
              <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold mt-2 ${recoveryBgColor} ${recoveryTextColor}`}>
                {typeof recoveryScoreValue === 'number' ? recoveryScoreValue : '—'}
              </div>
            </div>
          </Link>

          <Link href="/binge-risk" className="block">
            <div
              className="aspect-square flex flex-col justify-center items-center rounded-2xl backdrop-blur-2xl border"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border-subtle)',
                boxShadow: 'var(--shadow-soft)',
              }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--text-soft)' }}>Binge Risk</p>
              <span className={clsx('mt-2 px-2.5 py-0.5 rounded-full text-lg font-semibold', bingeTextColor, bingeBgColor)}>
                {bingeRisk ?? '—'}
              </span>
            </div>
          </Link>
        </div>

        {(() => {
          const shiftType = todayShift ? classifyShift(todayShift.start_ts, todayShift.end_ts) : 'off'
          const lastMainSleepHours = lastSleep?.sleep_hours ?? (lastSleep ? ((new Date(lastSleep.end_ts).getTime() - new Date(lastSleep.start_ts).getTime()) / 3600000) : null)
          const rec = getStepRecommendation({
            shiftType,
            lastMainSleepHours,
            recoveryScore: eng?.recovery_score ?? null,
          })
          const todaySteps = 9845 // TODO: wire real steps data
          return (
            <Link href="/steps" className="block cursor-pointer transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99]">
              <StepsCard
                steps={todaySteps}
                goal={stepGoal}
                showEditLink
                onEditClick={() => router.push('/steps')}
                recommendation={rec}
              />
            </Link>
          )
        })()}

        <AiCoachCard
          headline={coach ? coach.title : "Tonight’s plan ready."}
          subtitle={coach ? coach.body : "Tap to get a personalised tip for your current shift and sleep."}
          href="/coach"
        />

        <NutrientRingStrip
          protein={todayNutrition?.macros?.protein_g ?? (eng?.macros?.protein_g ?? 0)}
          carbs={todayNutrition?.macros?.carbs_g ?? (eng?.macros?.carbs_g ?? 0)}
          fats={todayNutrition?.macros?.fat_g ?? (eng?.macros?.fats_g ?? 0)}
          satFat={todayNutrition?.macros?.sat_fat_g ?? 0}
          waterMl={todayNutrition?.hydrationIntake?.water_ml ?? today?.water_ml ?? 0}
          waterGoalMl={todayNutrition?.hydrationTargets?.water_ml ?? (profile?.water_goal_ml ?? 0)}
          caffeineMg={todayNutrition?.hydrationIntake?.caffeine_mg ?? today?.caffeine_mg ?? 0}
          caffeineLimitMg={todayNutrition?.hydrationTargets?.caffeine_mg ?? 300}
          consumedProteinG={todayNutrition?.consumedMacros?.protein_g}
          consumedCarbG={todayNutrition?.consumedMacros?.carbs_g}
          consumedFatG={todayNutrition?.consumedMacros?.fat_g}
          adjustedKcal={todayNutrition?.adjustedCalories ?? (eng?.adjusted_kcal ?? 0)}
          sleepHoursLast24={lastSleep?.sleep_hours ?? (lastSleep ? ((new Date(lastSleep.end_ts).getTime() - new Date(lastSleep.start_ts).getTime()) / 3600000) : null) ?? avgHours7d ?? 7.5}
          mainSleepStart={lastSleep?.start_ts}
          mainSleepEnd={lastSleep?.end_ts}
          shiftType={todayShift ? classifyShift(todayShift.start_ts, todayShift.end_ts) : 'off'}
          onRefreshNutrition={refreshNutrition}
        />

        {/* Today Meals summary */}
        {(() => {
          const adjustedCalories = todayNutrition?.adjustedCalories ?? (eng?.adjusted_kcal ?? 0)
          const shiftType = todayNutrition?.shiftType ?? (todayShift ? classifyShift(todayShift.start_ts, todayShift.end_ts) : 'off')
          const meals = todayNutrition?.meals
          if (!meals) return null
          // Simple next meal logic based on suggestedTime
          const now = new Date()
          const next = meals.find(m => {
            const [hh, mm] = m.suggestedTime.split(':').map(Number)
            const dt = new Date(now)
            dt.setHours(hh, mm, 0, 0)
            return dt.getTime() > now.getTime()
          })
          const nextLabel = next?.label
          const nextTime = next ? `${next.suggestedTime}` : undefined
          const totalSlots = meals.length
          const loggedSlots = 0
          const loggedCalories = 0
          return (
            <Fragment>
              <TodayMealsCard
                adjustedCalories={adjustedCalories}
                loggedCalories={loggedCalories}
                totalSlots={totalSlots}
                loggedSlots={loggedSlots}
                nextSlotLabel={nextLabel}
                nextSlotTimeLabel={nextTime}
              />
            </Fragment>
          )
        })()}

        {/* Hero Meal */}
        <HeroMealCard />

        

        <div>
          <MoodFocus mood={today.mood} focus={today.focus} onChange={setMoodFocus} />
        </div>

        

        {todayMeals.length > 0 && (
          <div
            className="mt-3 rounded-2xl border backdrop-blur-2xl p-4"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Today's Meals</div>
              <a href="/meals" className="text-sm underline" style={{ color: 'var(--text-soft)' }}>Open</a>
            </div>
            <ul className="mt-2 text-sm space-y-1">
              {todayMeals.map((m, i) => (
                <li key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={m.thumbnail_url || '/meals/snack.png'}
                      alt=""
                      width={28}
                      height={28}
                      className="rounded-md border"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    />
                    <span className="capitalize" style={{ color: 'var(--text-main)' }}>{m.slot}: {m.title}</span>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: m.eaten ? '#10b981' : 'var(--card-subtle)',
                      color: m.eaten ? '#ffffff' : 'var(--text-main)',
                    }}
                  >
                    {m.eaten ? 'Eaten' : 'Planned'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        

        

        
      </div>
    </MobileShell>
  )
}

function Quick({ children, onClick }:{ children: React.ReactNode; onClick: ()=>void }) {
  return (
    <button onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs border transition-colors"
      style={{
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--card-subtle)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

function fmtTime(iso?: string | null) {
  if (!iso) return '--:--'
  const d = new Date(iso); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function classifyShift(startIso?: string | null, endIso?: string | null): 'day' | 'late' | 'night' | 'off' {
  if (!startIso || !endIso) return 'off'
  const start = new Date(startIso)
  const end = new Date(endIso)
  const startH = start.getHours()
  const endH = end.getHours()
  if (startH >= 18 || endH <= 8) return 'night'
  if (startH >= 12 && startH < 18) return 'late'
  return 'day'
}

