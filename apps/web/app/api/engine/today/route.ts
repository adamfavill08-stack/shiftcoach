import { computeToday } from '@/lib/engine'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

export async function GET() {
  const { supabase, userId } = await getServerSupabaseAndUserId()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[/api/engine/today] profile fetch error:', error)
  }

  if (!profile) return new Response('Profile not found', { status: 404 })

  const out = await computeToday(profile)
  return Response.json(out)
}

