import { getSupabaseServer } from '@/lib/supabase-server-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/select-plan'

  if (code) {
    const supabase = getSupabaseServer()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to plan selection after email confirmation
  return NextResponse.redirect(new URL(next, request.url))
}

