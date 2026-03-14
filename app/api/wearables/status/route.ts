import { NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

/**
 * GET /api/wearables/status
 *
 * Returns whether the current user has Google Fit connected (tokens stored).
 */
export async function GET() {
  try {
    const { userId, isDevFallback } = await getServerSupabaseAndUserId()

    // When using fallback user (e.g. production serverless), don't show as connected
    // so the pill shows "Tap to connect" instead of a false positive.
    if (isDevFallback) {
      return NextResponse.json({ connected: false })
    }

    const { supabaseServer } = await import('@/lib/supabase-server')
    const supabase = supabaseServer

    const { data: tokenRow, error } = await supabase
      .from('google_fit_tokens')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('[wearables/status] Error loading tokens:', error)
      return NextResponse.json({ connected: false, error: 'token_error' })
    }

    return NextResponse.json({ connected: !!tokenRow })
  } catch (err) {
    console.error('[wearables/status] Unexpected error:', err)
    return NextResponse.json({ connected: false, error: 'unexpected' })
  }
}
