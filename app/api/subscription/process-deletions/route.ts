import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/subscription/process-deletions
 * 
 * This endpoint should be called by a cron job (e.g., Vercel Cron) daily
 * to delete accounts that have reached their scheduled_deletion_at date.
 * 
 * It finds all profiles where scheduled_deletion_at <= now() and deletes them.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify this is called from Vercel Cron (automatic header) or with a secret
    const vercelCronHeader = req.headers.get('x-vercel-cron')
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Allow if called by Vercel Cron (has x-vercel-cron header) OR if CRON_SECRET matches
    const isVercelCron = vercelCronHeader === '1'
    const isValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`
    
    if (!isVercelCron && !isValidSecret) {
      return NextResponse.json(
        { error: 'Unauthorized - must be called by Vercel Cron or with valid secret' },
        { status: 401 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Find all profiles scheduled for deletion (where scheduled_deletion_at <= now)
    const { data: profilesToDelete, error: fetchError } = await supabaseServer
      .from('profiles')
      .select('user_id, scheduled_deletion_at')
      .not('scheduled_deletion_at', 'is', null)
      .lte('scheduled_deletion_at', new Date().toISOString())

    if (fetchError) {
      console.error('[api/subscription/process-deletions] Error fetching profiles:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch profiles', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!profilesToDelete || profilesToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No accounts scheduled for deletion',
        deleted_count: 0
      })
    }

    console.log(`[api/subscription/process-deletions] Found ${profilesToDelete.length} accounts to delete`)

    // Delete each account
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    let deletedCount = 0
    const errors: string[] = []

    for (const profile of profilesToDelete) {
      try {
        // Delete the auth user (this will cascade delete the profile due to on delete cascade)
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(profile.user_id)
        
        if (deleteError) {
          console.error(`[api/subscription/process-deletions] Error deleting user ${profile.user_id}:`, deleteError)
          errors.push(`User ${profile.user_id}: ${deleteError.message}`)
        } else {
          deletedCount++
          console.log(`[api/subscription/process-deletions] Successfully deleted user ${profile.user_id}`)
        }
      } catch (err: any) {
        console.error(`[api/subscription/process-deletions] Exception deleting user ${profile.user_id}:`, err)
        errors.push(`User ${profile.user_id}: ${err.message || 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${profilesToDelete.length} accounts`,
      deleted_count: deletedCount,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error('[api/subscription/process-deletions] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

