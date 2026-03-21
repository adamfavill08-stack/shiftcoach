import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/profile'

type SleepRow = { start_ts: string; end_ts: string; duration_min: number; quality: number; type: 'main'|'nap' }
type ShiftRow = { date: string; kind: 'DAY'|'NIGHT'|'OFF'|'SICK'|'LEAVE'; start: string|null; end: string|null }

export type SleepInsight = {
  title: string
  summary: string
  bullets: string[]
  scoreHints: string[]
}

function hours(min: number) { return Math.round((min/60) * 10) / 10 }

export async function computeSleepInsight(profile: Profile) : Promise<SleepInsight | null> {
  const sleepGoal = profile.sleep_goal_h ?? 7.5
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()-6, 0,0,0))
  const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1, 0,0,0))

  const [sleep, shifts] = await Promise.all([
    supabase.from('sleep_logs')
      .select('start_ts,end_ts,duration_min,quality,type')
      .gte('start_ts', start.toISOString())
      .lt('start_ts', end.toISOString())
      .order('start_ts', { ascending: true }),
    supabase.from('shifts')
      .select('date,kind,start,end')
      .gte('date', start.toISOString().slice(0,10))
      .lte('date', now.toISOString().slice(0,10))
      .order('date', { ascending: true })
  ])

  if (sleep.error) return null
  const rows = (sleep.data ?? []) as SleepRow[]
  const days = 7

  const totalMin = rows.reduce((a,r)=>a+(r.duration_min||0),0)
  const mainOnlyMin = rows.filter(r=>r.type==='main').reduce((a,r)=>a+(r.duration_min||0),0)
  const avgAll = hours(totalMin/days)
  const avgMain = hours(mainOnlyMin/days)
  const avgQuality = rows.length ? Math.round(rows.reduce((a,r)=>a+(r.quality||3),0)/rows.length) : 3
  const sleepDebtH = Math.round(((sleepGoal*days) - (totalMin/60)) * 10) / 10

  const mainStarts = rows.filter(r=>r.type==='main').map(r=> new Date(r.start_ts))
  let regularityH: number | null = null
  if (mainStarts.length >= 3) {
    const ms = mainStarts.map(d=>d.getUTCHours() + d.getUTCMinutes()/60)
    const mean = ms.reduce((a,b)=>a+b,0)/ms.length
    const variance = ms.reduce((a,b)=>a+(b-mean)*(b-mean),0)/ms.length
    regularityH = Math.round(Math.sqrt(variance) * 10) / 10
  }

  const shiftRows = (shifts.data ?? []) as ShiftRow[]
  const nights = shiftRows.filter(s=>s.kind==='NIGHT').length
  const daySleeps = rows.filter(r=>{
    const endH = new Date(r.end_ts).getUTCHours()
    return r.type==='main' && endH >= 9 && endH <= 18
  }).length
  const daySleepPct = mainStarts.length ? Math.round((daySleeps/mainStarts.length)*100) : 0

  const bullets: string[] = []
  const scoreHints: string[] = []

  if (sleepDebtH > 0.5) {
    bullets.push(`You’re running a sleep debt of ~${sleepDebtH}h over the last 7 days.`)
    scoreHints.push('Plan one earlier night or a 20–30 min nap to reduce debt.')
  } else {
    bullets.push('Sleep debt is minimal this week — great job staying topped up.')
  }

  if (regularityH != null) {
    if (regularityH <= 1.0) bullets.push(`Bedtime is fairly regular (±${regularityH}h).`)
    else bullets.push(`Bedtime varies by ~±${regularityH}h. Anchoring a window can improve rhythm.`)
  }

  if (nights >= 2) {
    if (daySleepPct >= 40) {
      bullets.push(`You’ve adapted some day-sleeps after night shifts (${daySleepPct}% of main sleeps).`)
      scoreHints.push('Keep post-night main sleep consistent; avoid bright light pre-bed.')
    } else {
      bullets.push(`Night shifts detected but few day-sleeps after them (${daySleepPct}%).`)
      scoreHints.push('After night shifts, aim for a consolidated daytime sleep (6–8h).')
    }
  }

  if (avgQuality <= 3) {
    bullets.push(`Average sleep quality ${avgQuality}/5. Try a 20–30 min wind-down and cooler room.`)
    scoreHints.push('Reduce late caffeine and screen glare 2h before bed to lift recovery.')
  }

  const summary = `Avg sleep: ${avgAll} h/day (main ${avgMain} h). Goal ${sleepGoal} h. Quality ~${avgQuality}/5.`
  const title = sleepDebtH > 2
    ? 'Let’s chip away at your sleep debt'
    : regularityH && regularityH > 1.5
      ? 'Anchor your sleep window'
      : 'Solid base — keep it steady'

  return { title, summary, bullets, scoreHints }
}
