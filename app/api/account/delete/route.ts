import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!service) return new Response(JSON.stringify({ ok:false, error:'Missing service role key' }), { status: 500 })

  // 1) Get access token from client
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return new Response(JSON.stringify({ ok:false, error:'Missing access token' }), { status: 401 })

  // 2) Validate token to get the user id
  const supaAnon = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: me, error: meErr } = await supaAnon.auth.getUser()
  if (meErr || !me.user) return new Response(JSON.stringify({ ok:false, error:'Invalid token' }), { status: 401 })

  // 3) Delete auth user with service role
  const admin = createClient(url, service)
  const { error: delErr } = await admin.auth.admin.deleteUser(me.user.id)
  if (delErr) return new Response(JSON.stringify({ ok:false, error: delErr.message }), { status: 500 })

  return new Response(JSON.stringify({ ok:true }), { status: 200 })
}

