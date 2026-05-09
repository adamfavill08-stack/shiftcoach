import { NextRequest } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'
import { getHydrationDayWindow } from '@/lib/hydration/hydrationDayWindow'
import { resolveIanaTimeZoneParam } from '@/lib/hydration/resolveIanaTimeZoneParam'

const WaterLogSchema = z.object({
  /** Positive adds water; negative removes (correction) for the same hydration day. */
  ml: z.number().refine((n) => n !== 0 && Math.abs(n) <= 5000, 'ml must be non-zero and within ±5000'),
})

export async function POST(req: NextRequest) {
  const { supabase, userId } = await getServerSupabaseAndUserId()
  if (!userId) return buildUnauthorizedResponse()

  const parsed = await parseJsonBody(req, WaterLogSchema)
  if (!parsed.ok) return parsed.response
  const { ml } = parsed.data

  const tz = resolveIanaTimeZoneParam(req.nextUrl.searchParams.get('tz'))

  const { error: insErr } = await supabase.from('water_logs').insert({ user_id: userId, ml })

  if (insErr) {
    return apiServerError('db_insert_failed', insErr.message)
  }

  const now = new Date()
  const { start, end } = getHydrationDayWindow(now, tz)

  const { data, error } = await supabase
    .from('water_logs')
    .select('ml')
    .eq('user_id', userId)
    .gte('ts', start.toISOString())
    .lt('ts', end.toISOString())

  if (error) {
    return apiServerError('db_query_failed', error.message)
  }

  const total = (data || []).reduce((a: number, r: any) => a + (Number(r.ml) || 0), 0)
  return new Response(JSON.stringify({ ok: true, total }), { status: 200 })
}
