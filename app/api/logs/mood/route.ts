import { NextRequest } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'

const MoodLogSchema = z.object({
  mood: z.number().int().min(1).max(5),
  focus: z.number().int().min(1).max(5),
})

export async function POST(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()
  if (!userId) return buildUnauthorizedResponse()

  const parsed = await parseJsonBody(req, MoodLogSchema)
  if (!parsed.ok) return parsed.response
  const { mood, focus } = parsed.data

  const { error } = await supabase
    .from('mood_logs')
    .insert({ user_id: userId, mood, focus })

  if (error) {
    return apiServerError('db_insert_failed', error.message)
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

