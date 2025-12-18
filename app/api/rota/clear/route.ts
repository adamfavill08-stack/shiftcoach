import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Use service role client (bypasses RLS) when in dev fallback mode
    const supabase = isDevFallback ? supabaseServer : authSupabase

    // Delete pattern from user_shift_patterns
    const { error: patternDeleteError } = await supabase
      .from('user_shift_patterns')
      .delete()
      .eq('user_id', userId)

    if (patternDeleteError && !patternDeleteError.message?.includes('relation')) {
      console.error('[api/rota/clear] pattern delete error', patternDeleteError)
      return NextResponse.json(
        { 
          error: 'Failed to clear rota pattern',
          detail: patternDeleteError.message ?? String(patternDeleteError),
        },
        { status: 500 }
      )
    }

    // Delete ALL shifts for this user (clear everything)
    // First, check how many shifts exist
    const { count: shiftsCountBefore, error: countError } = await supabase
      .from('shifts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (countError && !countError.message?.includes('relation')) {
      console.warn('[api/rota/clear] count error (non-fatal):', countError)
    }

    console.log('[api/rota/clear] deleting shifts for user', userId, 'count before:', shiftsCountBefore || 0)

    // Delete all shifts - use a more explicit query
    const { data: deletedShifts, error: shiftsDeleteError } = await supabase
      .from('shifts')
      .delete()
      .eq('user_id', userId)
      .select()

    if (shiftsDeleteError) {
      console.error('[api/rota/clear] shifts delete error', shiftsDeleteError)
      // If the table doesn't exist or has no rows, that's okay
      if (!shiftsDeleteError.message?.includes('relation') && !shiftsDeleteError.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Failed to clear shifts',
            detail: shiftsDeleteError.message ?? String(shiftsDeleteError),
          },
          { status: 500 }
        )
      }
    }

    // Verify deletion by checking count after
    const { count: shiftsCountAfter } = await supabase
      .from('shifts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const deletedCount = deletedShifts?.length || 0
    const remainingCount = shiftsCountAfter || 0

    console.log('[api/rota/clear] deleted shifts:', deletedCount, 'for user', userId)
    console.log('[api/rota/clear] count after deletion:', remainingCount)
    console.log('[api/rota/clear] cleared rota for user', userId)

    return NextResponse.json({ 
      success: true,
      deletedCount,
      remainingCount,
      message: remainingCount === 0 
        ? 'All shifts cleared successfully' 
        : `Warning: ${remainingCount} shifts may still exist`
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (err: any) {
    console.error('[api/rota/clear] fatal error', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
      fullError: err,
    })
    return NextResponse.json(
      { 
        error: 'Unexpected server error', 
        detail: err?.message || String(err),
        name: err?.name,
      },
      { status: 500 },
    )
  }
}

