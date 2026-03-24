import { NextRequest } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'

const WaterLogSchema = z.object({
  ml: z.number().positive().max(5000),
})

export async function POST(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()
  if (!userId) return buildUnauthorizedResponse()

  const parsed = await parseJsonBody(req, WaterLogSchema)
  if (!parsed.ok) return parsed.response
  const { ml } = parsed.data

  const { error: insErr } = await supabase
    .from('water_logs')
    .insert({ user_id: userId, ml })

  if (insErr) {
    return apiServerError('db_insert_failed', insErr.message)
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
    return apiServerError('db_query_failed', error.message)
  }

  const total = (data || []).reduce((a: number, r: any) => a + r.ml, 0)
  return new Response(JSON.stringify({ ok: true, total }), { status: 200 })
}

