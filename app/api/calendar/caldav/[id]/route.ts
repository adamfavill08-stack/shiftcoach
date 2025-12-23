import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

// PUT /api/calendar/caldav/[id] - update CalDAV account (enable/disable, rename, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const updateData: any = {}
    if (body.displayName !== undefined) updateData.display_name = body.displayName
    if (body.email !== undefined) updateData.email = body.email
    if (body.url !== undefined) updateData.url = body.url
    if (body.username !== undefined) updateData.username = body.username
    if (body.password !== undefined) updateData.password = body.password
    if (body.syncEnabled !== undefined) updateData.sync_enabled = body.syncEnabled
    if (body.lastSyncAt !== undefined) updateData.last_sync_at = body.lastSyncAt

    const { data, error } = await supabase
      .from('caldav_calendars')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating CalDAV account:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ account: data })
  } catch (error: any) {
    console.error('Error in PUT /api/calendar/caldav/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/calendar/caldav/[id] - delete CalDAV account
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('caldav_calendars')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting CalDAV account:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/calendar/caldav/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


