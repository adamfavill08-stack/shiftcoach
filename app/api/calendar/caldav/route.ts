import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

// GET /api/calendar/caldav - list CalDAV accounts for current user
export async function GET(request: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('caldav_calendars')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching CalDAV accounts:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ accounts: data ?? [] })
  } catch (error: any) {
    console.error('Error in GET /api/calendar/caldav:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/calendar/caldav - create new CalDAV account
export async function POST(request: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const accountData = {
      user_id: userId,
      calendar_id: body.calendarId ?? Date.now(),
      display_name: body.displayName || body.email || 'CalDAV account',
      email: body.email || '',
      url: body.url || '',
      username: body.username || '',
      password: body.password || '',
      sync_enabled: body.syncEnabled ?? true,
      last_sync_at: null as string | null,
    }

    const { data, error } = await supabase
      .from('caldav_calendars')
      .insert(accountData)
      .select()
      .single()

    if (error) {
      console.error('Error creating CalDAV account:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ account: data }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/calendar/caldav:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


