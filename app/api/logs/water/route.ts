import { supabaseServer } from '@/lib/supabase'
import { DEV_USER_ID } from '@/lib/dev-user'

export async function POST(req: Request) {
  const { ml } = await req.json().catch(() => ({}))
  if (!ml) return new Response(JSON.stringify({ ok:false, error:'ml required' }), { status: 400 })

  const { error: insErr } = await supabaseServer
    .from('water_logs')
    .insert({ user_id: DEV_USER_ID, ml })

  if (insErr) {
    return new Response(JSON.stringify({ ok:false, error: insErr.message }), { status: 500 })
  }

  // Return today's total (UTC-safe)
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1))

  const { data, error } = await supabaseServer
    .from('water_logs').select('ml')
    .gte('ts', start.toISOString()).lt('ts', end.toISOString())
    .eq('user_id', DEV_USER_ID)

  if (error) {
    return new Response(JSON.stringify({ ok:false, error: error.message }), { status: 500 })
  }

  const total = (data || []).reduce((a: number, r: any) => a + r.ml, 0)
  return Response.json({ ok: true, total })
}

