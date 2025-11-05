import { computeToday } from '@/lib/engine'
import { supabase } from '@/lib/supabase'
import { getMyProfile } from '@/lib/profile'

export async function GET() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const profile = await getMyProfile()
  if (!profile) return new Response('Profile not found', { status: 404 })

  const out = await computeToday(profile)
  return Response.json(out)
}

