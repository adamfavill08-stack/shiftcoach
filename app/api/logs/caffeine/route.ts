import { NextRequest } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()
  const { mg } = await req.json().catch(() => ({} as Record<string, unknown>))
  if (!mg) return new Response(JSON.stringify({ ok: false, error: 'mg required' }), { status: 400 })

  const { error: insErr } = await supabase
    .from('caffeine_logs')
    .insert({ user_id: userId, mg })

  if (insErr) {
    return new Response(JSON.stringify({ ok: false, error: insErr.message }), { status: 500 })
  }

  return Response.json({ ok: true })
}

