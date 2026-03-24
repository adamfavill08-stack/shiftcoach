import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'

export async function GET() {
  const { supabase, userId } = await getServerSupabaseAndUserId()
  if (!userId) return buildUnauthorizedResponse()

  const end = new Date(); end.setUTCHours(0,0,0,0);  // today 00:00 UTC
  const start = new Date(end); start.setUTCDate(end.getUTCDate() - 6)

  let [w, c, s, m] = await Promise.all([
    supabase.from('water_logs').select('ml,ts').gte('ts', start.toISOString()).lt('ts', new Date(end.getTime()+7*86400000).toISOString()),
    supabase.from('caffeine_logs').select('mg,ts').gte('ts', start.toISOString()).lt('ts', new Date(end.getTime()+7*86400000).toISOString()),
    supabase.from('sleep_logs').select('start_ts,end_ts,sleep_hours').gte('start_ts', start.toISOString()).lt('start_ts', new Date(end.getTime()+7*86400000).toISOString()),
    supabase.from('mood_logs').select('mood,focus,ts').gte('ts', start.toISOString()).lt('ts', new Date(end.getTime()+7*86400000).toISOString()),
  ])

  let sleepRows: any[] = s.data ?? []
  if (s.error && (s.error.code === 'PGRST204' || s.error.message?.includes('start_ts'))) {
    const fallback = await supabase
      .from('sleep_logs')
      .select('start_at,end_at,sleep_hours')
      .gte('start_at', start.toISOString())
      .lt('start_at', new Date(end.getTime() + 7 * 86400000).toISOString())
    sleepRows = fallback.data ?? []
  }

  const days: Record<string, any> = {}
  for (let i=0;i<7;i++){ const d=new Date(start); d.setUTCDate(start.getUTCDate()+i); days[d.toISOString().slice(0,10)] = { date: d.toISOString().slice(0,10), water_ml:0, caffeine_mg:0, sleep_min:0, mood:null as number|null, focus:null as number|null } }

  for (const r of (w.data ?? [])) { const k = new Date(r.ts).toISOString().slice(0,10); if (days[k]) days[k].water_ml += r.ml }
  for (const r of (c.data ?? [])) { const k = new Date(r.ts).toISOString().slice(0,10); if (days[k]) days[k].caffeine_mg += r.mg }
  for (const r of sleepRows) {
    const start = (r as any).start_ts ?? (r as any).start_at
    const endTs = (r as any).end_ts ?? (r as any).end_at
    if (!start) continue
    const k = new Date(start).toISOString().slice(0,10)
    if (days[k]) {
      // Convert sleep_hours to minutes, or compute from timestamps
      const hours = (r as any).sleep_hours ?? (endTs ? ((new Date(endTs).getTime() - new Date(start).getTime()) / 3600000) : 0)
      days[k].sleep_min += hours * 60
    }
  }
  for (const r of (m.data ?? [])) { const k = new Date(r.ts).toISOString().slice(0,10); if (days[k] && days[k].mood==null) { days[k].mood = r.mood; days[k].focus = r.focus } }

  const out = Object.values(days)
  return Response.json(out)
}

