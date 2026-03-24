import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError, apiSuccess } from '@/lib/api/response'
import { rateLimitByIp, checkRateLimit, getClientIp } from '@/lib/api/security'

const DeleteRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  reason: z.string().trim().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const ipRateLimit = rateLimitByIp(req, 'api_account_delete_request_post', 10, 60_000)
    if (ipRateLimit) return ipRateLimit

    const parsed = await parseJsonBody(req, DeleteRequestSchema)
    if (!parsed.ok) return parsed.response
    const { email, reason } = parsed.data

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !service) {
      return apiServerError('server_not_configured', 'Server not configured')
    }

    const admin = createClient(url, service)

    // Secondary abuse guard: throttle repeated requests for same email regardless of source IP.
    const emailThrottle = checkRateLimit({
      key: `api_account_delete_request_email:${email}`,
      limit: 3,
      windowMs: 60 * 60 * 1000,
    })
    if (!emailThrottle.allowed) {
      return apiServerError('delete_request_rate_limited', 'Too many deletion requests for this email')
    }

    // Idempotent behavior: if there is already a recent pending request, return success without duplicating.
    const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: existingPending } = await admin
      .from('account_deletion_requests')
      .select('id, requested_at, status')
      .eq('email', email)
      .eq('status', 'pending')
      .gte('requested_at', oneHourAgoIso)
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingPending) {
      return apiSuccess({ accepted: true, duplicate: true }, 200)
    }

    const requestIp = getClientIp(req)
    console.log('[api/account/delete-request] accepted request', { email, requestIp })
    const { error } = await admin.from('account_deletion_requests').insert({
      email,
      reason,
      source: 'web',
      status: 'pending',
      requested_at: new Date().toISOString(),
    })

    if (error) {
      return apiServerError('db_insert_failed', error.message)
    }

    return apiSuccess({ accepted: true }, 200)
  } catch (err: any) {
    return apiServerError('unexpected_error', err?.message ?? 'Unexpected error')
  }
}

