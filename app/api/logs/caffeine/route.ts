import { supabaseServer } from '@/lib/supabase'
import { DEV_USER_ID } from '@/lib/dev-user'

export async function POST(req: Request) {
  const { mg } = await req.json().catch(() => ({}))
  if (!mg) return new Response(JSON.stringify({ ok:false, error:'mg required' }), { status: 400 })

  const { error: insErr } = await supabaseServer
    .from('caffeine_logs')
    .insert({ user_id: DEV_USER_ID, mg })

  if (insErr) {
    return new Response(JSON.stringify({ ok:false, error: insErr.message }), { status: 500 })
  }

  return Response.json({ ok: true })
}

