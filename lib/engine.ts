import { supabase } from './supabase'
import { isoLocalDate } from './shifts'
import type { Profile } from './profile'

export type EngineOutput = {
  rhythm_score: number
  adjusted_kcal: number
  recovery_score: number
  binge_risk: 'Low'|'Medium'|'High'
  sleep_window: { start: string; end: string }
  caffeine_cutoff: string
  macros: { protein_g: number; carbs_g: number; fats_g: number }
  timeline: { time: string; icon: string; label: string }[]
}

function clamp(n:number, lo:number, hi:number){ return Math.min(hi, Math.max(lo, n)) }
function hours(n:number){ return `${n.toFixed(1)}h` }
function toISO(date: Date){ return date.toISOString() }
function fmtLocal(iso: string){ const d=new Date(iso); return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }

export async function computeToday(profile: Profile) : Promise<EngineOutput> {
  // --- Gather inputs
  const todayISO = isoLocalDate(new Date())

  const [{ data: shift }, { data: waterToday }, { data: cafToday }, { data: sleeps7 }] = await Promise.all([
    supabase.from('shifts').select('*').eq('date', todayISO).maybeSingle(),
    supabase.from('water_logs').select('ml').gte('ts', dayStartISO()).lt('ts', dayEndISO()),
    supabase.from('caffeine_logs').select('mg,ts').gte('ts', dayStartISO()).lt('ts', dayEndISO()),
    supabase.from('sleep_logs').select('start_ts,end_ts,duration_min,quality').gte('start_ts', sevenDaysAgoISO()).order('start_ts', { ascending: false })
  ])

  const water_ml = (waterToday ?? []).reduce((a,r:any)=>a+r.ml,0)
  const caffeine_mg = (cafToday ?? []).reduce((a,r:any)=>a+r.mg,0)

  // Sleep stats
  const sleepGoalH = profile.sleep_goal_h ?? 7.5
  const last3 = (sleeps7 ?? []).slice(0,3)
  const avgSleepH = last3.length ? last3.reduce((a:any,r:any)=>a + r.duration_min,0) / last3.length / 60 : sleepGoalH
  const sleepDebtH = Math.max(0, sleepGoalH - avgSleepH) // >0 means under target

  // --- Determine today's shift window & sleep window
  const shiftLabel = shift?.label ?? 'OFF'
  const shiftStart = shift?.start_ts ? new Date(shift.start_ts) : null
  const shiftEnd   = shift?.end_ts ? new Date(shift.end_ts) : null

  // Heuristics for sleep window:
  // DAY => 23:00–07:00 (or anchored around midnight)
  // NIGHT => 08:30–14:30 main sleep (+ optional nap 17:00–17:30 not in window)
  // OFF => prefer profile default 23:00–07:00
  let sleepStart = new Date(); let sleepEnd = new Date()
  if (shiftLabel === 'NIGHT') {
    // post-shift daytime sleep
    sleepStart = todayAt('08:30'); sleepEnd = addHours(sleepStart, sleepGoalH)
  } else {
    // default nocturnal sleep
    sleepStart = todayAt('23:00'); sleepEnd = addHours(sleepStart, sleepGoalH)
  }

  // Caffeine cutoff: 8h before sleepStart
  const cutoff = addHours(sleepStart, -8)

  // --- Rhythm score components
  // 1) Sleep debt penalty (0..40)
  const debtPenalty = clamp((sleepDebtH / 2) * 20, 0, 40) // 0–2h -> up to -40

  // 2) Shift mismatch penalty (0..40)
  // DAY: ok (0), NIGHT: -30 base, OFF: -10 if previous night shift + little sleep
  let mismatchPenalty = 0
  if (shiftLabel === 'NIGHT') mismatchPenalty = 30
  if (shiftLabel === 'OFF' && avgSleepH < 6) mismatchPenalty = 10

  // 3) Late caffeine penalty (0..20) if caffeine after cutoff
  const lateCaffeine = (cafToday ?? []).some((r:any)=> new Date(r.ts) > cutoff)
  const caffeinePenalty = lateCaffeine ? 20 : 0

  const rhythm = clamp(100 - (debtPenalty + mismatchPenalty + caffeinePenalty), 0, 100)

  // --- Recovery score (simple proxy: sleep & caffeine)
  let recovery = clamp(70 + (avgSleepH - sleepGoalH) * 6 - (caffeine_mg > 250 ? 10 : 0), 20, 95)

  // --- Adjusted calories
  const wt = profile.weight_kg ?? 85
  const baseTDEE = wt * 22 * 1.4 // simple sedentary/active middle
  // goal factor
  const goal = profile.goal ?? 'maintain'
  const goalFactor = goal === 'lose' ? 0.85 : goal === 'gain' ? 1.10 : 1.0
  // sleep & recovery factor
  const sleepFactor = avgSleepH < 6 ? 0.94 : 1.0
  const recFactor = recovery < 60 ? 0.96 : 1.0
  const adjusted_kcal = Math.round(clamp(baseTDEE * goalFactor * sleepFactor * recFactor, 1400, 3800))

  // --- Macros (simple template; tweak later)
  const protein_g = Math.round(wt * (goal === 'gain' ? 2.0 : goal === 'lose' ? 1.8 : 1.6))
  const fats_g = Math.round((adjusted_kcal * 0.30) / 9)
  const carbs_g = Math.max(0, Math.round((adjusted_kcal - (protein_g*4 + fats_g*9)) / 4))

  // --- Binge risk (based on debt & caffeine timing)
  const binge_risk = (sleepDebtH >= 1.5 || lateCaffeine) ? (sleepDebtH >= 2 ? 'High' : 'Medium') : 'Low'

  // --- Timeline (based on shift)
  const timeline = buildTimeline(shiftLabel, shiftStart, shiftEnd, sleepStart, sleepEnd)

  return {
    rhythm_score: rhythm,
    adjusted_kcal,
    recovery_score: Math.round(recovery),
    binge_risk,
    sleep_window: { start: toISO(sleepStart), end: toISO(sleepEnd) },
    caffeine_cutoff: toISO(cutoff),
    macros: { protein_g, carbs_g, fats_g },
    timeline
  }
}

function buildTimeline(label: string, s: Date | null, e: Date | null, sleepS: Date, sleepE: Date){
  if (label === 'NIGHT' && s && e) {
    const pre = addMinutes(s, -45)
    const mid = addHours(s, 4)
    const post = addMinutes(e, 15)
    return [
      { time: fmtLocal(pre.toISOString()), icon:'🍽️', label:'Pre-shift meal' },
      { time: fmtLocal(mid.toISOString()), icon:'🥪', label:'Mid-shift snack' },
      { time: fmtLocal(post.toISOString()), icon:'🍲', label:'Post-shift meal' },
      { time: fmtLocal(sleepS.toISOString()), icon:'😴', label:`Sleep window start (${hours((sleepE.getTime()-sleepS.getTime())/3600000)})` },
    ]
  }
  // DAY or OFF
  const dinner = todayAt('18:30'), lunch = todayAt('12:30'), breakfast = todayAt('07:30')
  return [
    { time: fmtLocal(breakfast.toISOString()), icon:'🍳', label:'Breakfast' },
    { time: fmtLocal(lunch.toISOString()), icon:'🥗', label:'Lunch' },
    { time: fmtLocal(dinner.toISOString()), icon:'🍽️', label:'Dinner' },
    { time: fmtLocal(sleepS.toISOString()), icon:'😴', label:`Sleep window start (${hours((sleepE.getTime()-sleepS.getTime())/3600000)})` },
  ]
}

function todayAt(hhmm: string){ const [h,m]=hhmm.split(':').map(Number); const d=new Date(); d.setHours(h,m,0,0); return d }
function addHours(d: Date, h:number){ const x=new Date(d); x.setHours(x.getHours()+h); return x }
function addMinutes(d: Date, m:number){ const x=new Date(d); x.setMinutes(x.getMinutes()+m); return x }
function dayStartISO(){ const n=new Date(); const s=new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate(),0,0,0)); return s.toISOString() }
function dayEndISO(){ const n=new Date(); const e=new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate()+1,0,0,0)); return e.toISOString() }
function sevenDaysAgoISO(){ const n=new Date(); const s=new Date(n.getTime()-7*24*3600*1000); return s.toISOString() }

