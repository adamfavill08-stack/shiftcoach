import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/sleep/sessions/by-date?date=YYYY-MM-DD
 * Returns all sleep sessions for a specific date
 */
export async function GET(req: NextRequest) {
  console.log('[api/sleep/sessions/by-date] Route hit')
  
  try {
    // Lazy import to avoid module initialization errors
    let getServerSupabaseAndUserId: any
    let supabaseServer: any
    
    try {
      const serverModule = await import('@/lib/supabase/server')
      getServerSupabaseAndUserId = serverModule.getServerSupabaseAndUserId
    } catch (importErr: any) {
      console.error('[api/sleep/sessions/by-date] Failed to import server module:', importErr)
      return NextResponse.json({
        error: 'Server module import failed',
        details: importErr?.message || String(importErr),
        name: importErr?.name,
      }, { status: 500 })
    }
    
    try {
      const supabaseModule = await import('@/lib/supabase-server')
      supabaseServer = supabaseModule.supabaseServer
    } catch (importErr: any) {
      console.error('[api/sleep/sessions/by-date] Failed to import supabase-server:', importErr)
      return NextResponse.json({
        error: 'Supabase module import failed',
        details: importErr?.message || String(importErr),
        name: importErr?.name,
      }, { status: 500 })
    }
    
    // Get user ID
    let userId: string | null = null
    try {
      const authResult = await getServerSupabaseAndUserId()
      userId = authResult.userId
      console.log('[api/sleep/sessions/by-date] Got userId:', userId)
    } catch (authErr: any) {
      console.error('[api/sleep/sessions/by-date] Auth error:', authErr)
      return NextResponse.json({
        error: 'Authentication failed',
        details: authErr?.message || 'Failed to get user ID',
        name: authErr?.name,
      }, { status: 500 })
    }
    
    if (!userId) {
      console.error('[api/sleep/sessions/by-date] No userId found')
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: 'No user ID found' 
      }, { status: 401 })
    }
    
    // Always use service role client to bypass RLS (consistent with other sleep routes)
    if (!supabaseServer) {
      console.error('[api/sleep/sessions/by-date] supabaseServer is null')
      return NextResponse.json({
        error: 'Server configuration error',
        details: 'Supabase server client is null',
      }, { status: 500 })
    }
    
    const supabase = supabaseServer

    const searchParams = req.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    
    console.log('[api/sleep/sessions/by-date] Request params:', { dateParam, userId })
    
    if (!dateParam) {
      return NextResponse.json(
        { error: 'Missing date parameter', details: 'Provide ?date=YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { error: 'Invalid date format', details: 'Date must be YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Try new schema first (start_at, end_at, type)
    let sessions: any[] = []
    
    // Query sessions that end on this date (sleep ends on the date it's logged for)
    const dayStart = new Date(dateParam + 'T00:00:00')
    const dayEnd = new Date(dateParam + 'T23:59:59.999')
    
    console.log('[api/sleep/sessions/by-date] Querying for date range:', {
      dateParam,
      dayStart: dayStart.toISOString(),
      dayEnd: dayEnd.toISOString(),
    })
    
    let result = await supabase
      .from('sleep_logs')
      .select('id, type, start_at, end_at, quality, source, created_at')
      .eq('user_id', userId)
      .gte('end_at', dayStart.toISOString())
      .lte('end_at', dayEnd.toISOString())
      .order('start_at', { ascending: true })

    if (result.error) {
      console.log('[api/sleep/sessions/by-date] New schema query error:', result.error.message)
      // Try old schema (start_ts, end_ts, naps, date column)
      if (result.error.message?.includes('column') || result.error.message?.includes('does not exist')) {
        console.log('[api/sleep/sessions/by-date] Trying old schema')
        // Old schema has a date column, so we can query by date directly
        result = await supabase
          .from('sleep_logs')
          .select('id, start_ts, end_ts, naps, quality, created_at, date')
          .eq('user_id', userId)
          .eq('date', dateParam)
          .order('start_ts', { ascending: true })
      }
    }

    if (result.error) {
      console.error('[api/sleep/sessions/by-date] Query error:', {
        message: result.error.message,
        code: result.error.code,
        details: result.error.details,
        hint: result.error.hint,
      })
      return NextResponse.json(
        { 
          error: 'Failed to fetch sessions', 
          details: result.error.message || 'Database query failed',
          code: result.error.code,
        },
        { status: 500 }
      )
    }

    // Map to consistent format
    if (result.data) {
      sessions = result.data.map((row: any) => {
        // Determine session type
        const sessionType = row.type === 'nap' 
          ? 'nap' 
          : (row.naps === 0 || !row.naps ? 'main' : 'nap')
        
        // Get times (handle both schemas)
        const startTime = row.start_at || row.start_ts
        const endTime = row.end_at || row.end_ts
        
        if (!startTime || !endTime) {
          console.warn('[api/sleep/sessions/by-date] Skipping session with missing times:', row.id)
          return null
        }
        
        // Calculate duration
        const start = new Date(startTime)
        const end = new Date(endTime)
        const durationMs = end.getTime() - start.getTime()
        const durationHours = Math.max(0, durationMs / (1000 * 60 * 60))
        
        return {
          id: row.id,
          session_type: sessionType,
          start_time: startTime,
          end_time: endTime,
          durationHours,
          quality: row.quality,
          source: row.source || 'manual',
          created_at: row.created_at,
        }
      }).filter((s: any) => s !== null) // Remove null entries
    }

    console.log(`[api/sleep/sessions/by-date] Found ${sessions.length} sessions for ${dateParam}`)
    
    return NextResponse.json({ sessions }, { status: 200 })
  } catch (err: any) {
    console.error('[api/sleep/sessions/by-date] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
      cause: err?.cause,
      toString: String(err),
    })
    
    // Ensure we always return a proper error object, never {}
    const errorMessage = err?.message || err?.toString() || 'Unknown server error'
    const errorName = err?.name || 'Error'
    const errorCode = err?.code || null
    const errorDetails = err?.details || null
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        code: errorCode,
        name: errorName,
      },
      { status: 500 }
    )
  }
}
