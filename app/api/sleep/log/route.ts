import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiBadRequest, apiServerError } from '@/lib/api/response'
import type { SleepLogInput, SleepSource, SleepType } from '@/lib/sleep/types'
import { minutesBetween } from '@/lib/sleep/utils'
import {
  normalizeIanaTimeZone,
  normalizeSleepQuality,
  normalizeSleepType,
} from '@/lib/sleep/normalizeSleepLogPayload'

const SleepLogSchema = z.object({
  type: z
    .enum(['main_sleep', 'post_shift_sleep', 'recovery_sleep', 'nap', 'sleep', 'main', 'post_shift', 'recovery', 'pre_shift_nap'])
    .optional(),
  startAt: z.string(),
  endAt: z.string(),
  quality: z.union([z.number(), z.string()]).nullable().optional(),
  notes: z.string().max(4000).nullish(),
  source: z
    .enum(['manual', 'apple_health', 'health_connect', 'fitbit', 'oura', 'garmin'])
    .optional(),
  timezone: z.string().max(120).nullish(),
})

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()

    if (!userId) return buildUnauthorizedResponse()

    const parsed = await parseJsonBody(req, SleepLogSchema)
    if (!parsed.ok) return parsed.response
    const input = parsed.data as SleepLogInput

    const startDate = new Date(input.startAt)
    const endDate = new Date(input.endAt)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return apiBadRequest('invalid_date_format', 'startAt and endAt must be valid ISO date strings')
    }
    if (endDate <= startDate) {
      return apiBadRequest('invalid_date_range', 'End time must be after start time')
    }
    const durationMinutes = minutesBetween(startDate, endDate)
    if (durationMinutes < 10) {
      return apiBadRequest('invalid_duration', 'Sleep session must be at least 10 minutes')
    }
    if (durationMinutes > 24 * 60) {
      return apiBadRequest('invalid_duration', 'Sleep session cannot be longer than 24 hours')
    }

    const canonicalType = normalizeSleepType(input.type as any)
    if (!canonicalType) {
      return apiBadRequest('invalid_sleep_type', 'Invalid sleep type')
    }

    const clientTimeZoneRaw = input.timezone ?? req.headers.get('x-time-zone')
    const clientTimeZone = normalizeIanaTimeZone(clientTimeZoneRaw)
    if (clientTimeZoneRaw && !clientTimeZone) {
      return apiBadRequest('invalid_timezone', 'timezone must be a valid IANA time zone')
    }
    const serverTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null

    const payload = {
      user_id: userId,
      start_at: input.startAt,
      end_at: input.endAt,
      type: canonicalType as SleepType,
      source: (input.source ?? 'manual') as SleepSource,
      quality: normalizeSleepQuality(input.quality as any),
      notes: input.notes ?? null,
      timezone: clientTimeZone ?? serverTimeZone,
      metadata: clientTimeZone
        ? { timezone_source: 'client' }
        : { timezone_source: 'server' },
    }

    const { data, error } = await supabase.from('sleep_logs').insert(payload).select('*')
    if (error) {
      console.error('[api/sleep/log] insert error:', {
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
        fullError: JSON.stringify(error, null, 2),
      })
      return apiServerError('sleep_log_insert_failed', error.message || 'Database error')
    }

    console.log('[api/sleep/log] Successfully inserted:', data)
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    console.error('[api/sleep/log] fatal error', e)
    return apiServerError('sleep_log_fatal', e?.message || 'Failed to save')
  }
}
