import { NextRequest } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()
  const { mood, focus } = await req.json().catch(() => ({} as Record<string, unknown>))
  if (!mood || !focus) {
    return new Response(JSON.stringify({ ok: false, error: 'mood & focus required' }), { status: 400 })
  }

  const { error } = await supabase
    .from('mood_logs')
    .insert({ user_id: userId, mood, focus })

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 })
  }

  return Response.json({ ok: true })
}

