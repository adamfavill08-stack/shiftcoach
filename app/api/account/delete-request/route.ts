import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : null

    if (!email || !email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Valid email is required' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !service) {
      return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 })
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
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unexpected error' }, { status: 500 })
  }
}

