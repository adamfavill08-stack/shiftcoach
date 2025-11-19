import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function DELETE(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Always use service role client for deletes to bypass RLS
    const supabase = supabaseServer
    
    if (!userId) {
      console.error("[api/sleep/log/delete-by-date] No userId")
      return NextResponse.json({ error: "unauthorized", details: "No user ID found" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get('date')
    
    if (!dateStr) {
      return NextResponse.json({ 
        error: "Missing date parameter", 
        details: "Please provide a date in YYYY-MM-DD format"
      }, { status: 400 })
    }

    // Validate date format
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ 
        error: "Invalid date format", 
        details: "Date must be in YYYY-MM-DD format" 
      }, { status: 400 })
    }

    // Try old schema first (start_ts/date) since that's what the user has
    let deleteResult = await supabase
      .from('sleep_logs')
      .delete()
      .eq('user_id', userId)
      .eq('date', dateStr)
    
    let error = deleteResult.error
    
    // If date column doesn't exist, try with start_ts range (old schema alternative)
    if (error && error.message?.includes("date") && error.code === 'PGRST204') {
      console.log("[api/sleep/log/delete-by-date] Date column not found, trying start_ts range")
      deleteResult = await supabase
        .from('sleep_logs')
        .delete()
        .eq('user_id', userId)
        .gte('start_ts', `${dateStr}T00:00:00.000Z`)
        .lt('start_ts', `${dateStr}T23:59:59.999Z`)
      error = deleteResult.error
    }
    
    // If old schema fails, try new schema (start_at/end_at)
    if (error && (error.message?.includes("start_ts") || error.code === 'PGRST204')) {
      console.log("[api/sleep/log/delete-by-date] Trying new schema with start_at")
      deleteResult = await supabase
        .from('sleep_logs')
        .delete()
        .eq('user_id', userId)
        .gte('start_at', `${dateStr}T00:00:00.000Z`)
        .lt('start_at', `${dateStr}T23:59:59.999Z`)
      error = deleteResult.error
    }
    
    if (error) {
      console.error("[api/sleep/log/delete-by-date] delete error:", {
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
        deletedDate: dateStr
      })
      return NextResponse.json({ 
        error: "Database error", 
        details: error.message || "Unknown database error",
        code: error.code,
      }, { status: 500 })
    }

    // Verify deletion by checking if any logs remain for this date
    const verifyResult = await supabase
      .from('sleep_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .limit(1)
    
    const remainingCount = verifyResult.data?.length || 0
    console.log("[api/sleep/log/delete-by-date] Successfully deleted sleep logs for date:", dateStr, "Remaining logs:", remainingCount)
    
    return NextResponse.json({ 
      ok: true, 
      deletedDate: dateStr,
      remainingCount 
    })
  } catch (e: any) {
    console.error("[api/sleep/log/delete-by-date] fatal error", e)
    return NextResponse.json({ 
      error: "Failed to delete", 
      details: e?.message || "Unknown error",
      stack: process.env.NODE_ENV === 'development' ? e?.stack : undefined
    }, { status: 500 })
  }
}

