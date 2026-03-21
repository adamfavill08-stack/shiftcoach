import { NextRequest } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()
  const { ml } = await req.json().catch(() => ({} as Record<string, unknown>))
  if (!ml) return new Response(JSON.stringify({ ok: false, error: 'ml required' }), { status: 400 })

  const { error: insErr } = await supabase
    .from('water_logs')
    .insert({ user_id: userId, ml })

  if (insErr) {
    return new Response(JSON.stringify({ ok:false, error: insErr.message }), { status: 500 })
  }

  // Return today's total (UTC-safe)
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1))

  const { data, error } = await supabase
    .from('water_logs').select('ml')
    .gte('ts', start.toISOString()).lt('ts', end.toISOString())
    .eq('user_id', userId)

  if (error) {
    return new Response(JSON.stringify({ ok:false, error: error.message }), { status: 500 })
  }

  const total = (data || []).reduce((a: number, r: any) => a + r.ml, 0)
  return Response.json({ ok: true, total })
}

