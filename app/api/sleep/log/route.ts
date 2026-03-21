import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    // Always use service role client for inserts to bypass RLS
    // This ensures inserts work even if RLS policies are misconfigured
    const supabase = supabaseServer
    
    if (!userId) {
      console.error("[api/sleep/log] No userId")
      return NextResponse.json({ error: "unauthorized", details: "No user ID found" }, { status: 401 })
    }

    const body = await req.json()
    console.log("[api/sleep/log] Received body:", body)
    
    const { type, startAt, endAt, quality, notes } = body as {
      type: "sleep"|"nap"; startAt: string; endAt: string; quality: string; notes?: string
    }

    if (!type || !startAt || !endAt) {
      console.error("[api/sleep/log] Missing required fields:", { type, startAt, endAt })
      return NextResponse.json({ 
        error: "Missing required fields", 
        details: `Missing: ${!type ? 'type' : ''} ${!startAt ? 'startAt' : ''} ${!endAt ? 'endAt' : ''}`.trim()
      }, { status: 400 })
    }

    // Validate date strings
    const startDate = new Date(startAt)
    const endDate = new Date(endAt)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error("[api/sleep/log] Invalid date format:", { startAt, endAt })
      return NextResponse.json({ 
        error: "Invalid date format", 
        details: "startAt and endAt must be valid ISO date strings" 
      }, { status: 400 })
    }

    if (endDate <= startDate) {
      console.error("[api/sleep/log] End date must be after start date:", { startAt, endAt })
      return NextResponse.json({ 
        error: "Invalid date range", 
        details: "End time must be after start time" 
      }, { status: 400 })
    }

    // Extract date from start time (YYYY-MM-DD)
    const dateStr = new Date(startAt).toISOString().slice(0, 10)
    
    // Convert quality text to int (1-5) for old schema compatibility
    const qualityMap: Record<string, number> = {
      'Excellent': 5,
      'Good': 4,
      'Fair': 3,
      'Poor': 1,
    }
    const qualityInt = quality ? (qualityMap[quality] || 3) : null
    
    // Try new schema first (start_at, end_at, type, source)
    let insertData: any = {
      user_id: userId,
      type: type === 'nap' ? 'nap' : 'sleep', // Ensure type is 'sleep' or 'nap'
      start_at: startAt,
      end_at: endAt,
      quality: quality || null,
      notes: notes ?? null,
      source: "manual",
    }
    
    let data, error
    let insertResult = await supabase.from("sleep_logs").insert(insertData).select()
    data = insertResult.data
    error = insertResult.error
    
    // If that fails, try old schema (start_ts, end_ts, date, quality as int, naps field)
    if (error && (error.message?.includes("end_at") || error.message?.includes("start_at") || error.message?.includes("type"))) {
      console.log("[api/sleep/log] New schema failed, trying old schema with start_ts/end_ts")
      insertData = {
        user_id: userId,
        date: dateStr,
        start_ts: startAt,
        end_ts: endAt,
        quality: qualityInt,
        naps: type === 'nap' ? 1 : 0, // Old schema: 0 = main sleep, 1+ = nap
        notes: notes ?? null,
      }
      insertResult = await supabase.from("sleep_logs").insert(insertData).select()
      data = insertResult.data
      error = insertResult.error
    }
    
    console.log("[api/sleep/log] Inserting sleep log:", insertData)
    
    if (error) {
      console.error("[api/sleep/log] insert error:", {
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
        fullError: JSON.stringify(error, null, 2)
      })
      return NextResponse.json({ 
        error: "Database error", 
        details: error.message || "Unknown database error",
        code: error.code,
        hint: error.hint,
        fullDetails: error.details
      }, { status: 500 })
    }

    console.log("[api/sleep/log] Successfully inserted:", data)
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    console.error("[api/sleep/log] fatal error", e)
    return NextResponse.json({ 
      error: "Failed to save", 
      details: e?.message || "Unknown error",
      stack: process.env.NODE_ENV === 'development' ? e?.stack : undefined
    }, { status: 500 })
  }
}
