import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/profile/update-ages
 * Updates all user ages based on their date of birth
 * This should be called daily (via cron job or scheduled task) to update ages on birthdays
 */
export async function POST(req: NextRequest) {
  try {
    // Check for authorization (optional: add API key check here)
    const authHeader = req.headers.get('authorization')
    const expectedKey = process.env.CRON_SECRET_KEY
    
    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role client to update all profiles
    const { data, error } = await supabaseServer.rpc('update_all_user_ages')

    if (error) {
      console.error('[api/profile/update-ages] Error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update ages' },
        { status: 500 }
      )
    }

    const updatedCount = data || 0
    console.log(`[api/profile/update-ages] Updated ${updatedCount} user ages`)

    return NextResponse.json({ 
      success: true,
      updated_count: updatedCount,
      message: `Updated ${updatedCount} user ages`
    }, { status: 200 })
  } catch (err: any) {
    console.error('[api/profile/update-ages] Unexpected error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to update ages' },
      { status: 500 }
    )
  }
}

