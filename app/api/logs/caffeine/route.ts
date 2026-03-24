import { NextRequest } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'

const CaffeineLogSchema = z.object({
  mg: z.number().positive().max(2000),
})

export async function POST(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()
  if (!userId) return buildUnauthorizedResponse()

  const parsed = await parseJsonBody(req, CaffeineLogSchema)
  if (!parsed.ok) return parsed.response
  const { mg } = parsed.data

  const { error: insErr } = await supabase
    .from('caffeine_logs')
    .insert({ user_id: userId, mg })

  if (insErr) {
    return apiServerError('db_insert_failed', insErr.message)
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

