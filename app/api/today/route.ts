import { supabaseServer } from '@/lib/supabase'
import { DEV_USER_ID } from '@/lib/dev-user'

export async function GET() {
  const userId = DEV_USER_ID
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
  const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
  const startISO = start.toISOString()
  const endISO   = end.toISOString()

  // Sum water & caffeine today (UTC-aware)
  const { data: water } = await supabaseServer
    .from('water_logs')
    .select('ml')
    .gte('ts', startISO).lt('ts', endISO)
    .eq('user_id', userId)
  const water_ml = (water || []).reduce((a, r:any) => a + r.ml, 0)

  const { data: caf } = await supabaseServer
    .from('caffeine_logs')
    .select('mg')
    .gte('ts', startISO).lt('ts', endISO)
    .eq('user_id', userId)
  const caffeine_mg = (caf || []).reduce((a, r:any) => a + r.mg, 0)

  const { data: mood } = await supabaseServer
    .from('mood_logs')
    .select('mood,focus,ts')
    .gte('ts', startISO).lt('ts', endISO)
    .eq('user_id', userId)
    .order('ts', { ascending: false })
    .limit(1)

  // Simple placeholder "engine" (swap with your real calc later)
  const adjusted_kcal = 2180
  const sleep_hours = 6.3
  const recovery_score = 74
  const binge_risk = 'Medium'
  const rhythm_score = 82
  const protein_g = 145, carbs_g = 210, fats_g = 70

  return Response.json({
    shift: { label: 'Night', start: '18:30', end: '06:30', sleep_goal_h: 7 },
    adjusted_kcal,
    sleep_hours,
    recovery_score,
    binge_risk,
    rhythm_score,
    macros: { protein_g, carbs_g, fats_g },
    water_ml,
    caffeine_mg,
    mood: mood?.[0]?.mood ?? 3,
    focus: mood?.[0]?.focus ?? 3,
    plan: [
      { time: '17:45', icon: '🍽️', label: 'Pre-shift meal' },
      { time: '22:30', icon: '🥪', label: 'Mid-shift snack' },
      { time: '06:45', icon: '🍲', label: 'Post-shift meal' },
      { time: '08:30', icon: '😴', label: 'Sleep window' },
    ]
  })
}

