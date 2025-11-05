import { supabaseServer } from '@/lib/supabase'
import { DEV_USER_ID } from '@/lib/dev-user'

export async function POST(req: Request) {
  const { mood, focus } = await req.json().catch(() => ({}))
  if (!mood || !focus) {
    return new Response(JSON.stringify({ ok:false, error:'mood & focus required' }), { status: 400 })
  }

  const { error } = await supabaseServer
    .from('mood_logs')
    .insert({ user_id: DEV_USER_ID, mood, focus })

  if (error) {
    return new Response(JSON.stringify({ ok:false, error: error.message }), { status: 500 })
  }

  return Response.json({ ok: true })
}

