import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'

const DeleteRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  reason: z.string().trim().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseJsonBody(req, DeleteRequestSchema)
    if (!parsed.ok) return parsed.response
    const { email, reason } = parsed.data

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !service) {
      return apiServerError('server_not_configured', 'Server not configured')
    }

    const admin = createClient(url, service)
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

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return apiServerError('unexpected_error', err?.message ?? 'Unexpected error')
  }
}

