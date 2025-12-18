import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getPatternSlots } from '@/lib/rota/patternSlots'
import { inferShiftPattern } from '@/lib/rota/inferShiftPattern'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    
    const supabase = isDevFallback ? supabaseServer : authSupabase

    const body = await req.json().catch(() => null)

    if (!body) {
      return NextResponse.json({ error: 'Missing request body' }, { status: 400 })
    }

    const {
      patternId,
      startDate,
      startCycleIndex = 0,
      shiftTimes,
      commute,
      endDate,
    } = body

    if (!patternId || !startDate || startCycleIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: patternId, startDate, startCycleIndex' },
        { status: 400 }
      )
    }

    // Get pattern slots
    const patternSlots = getPatternSlots(patternId)
    if (!patternSlots || patternSlots.length === 0) {
      return NextResponse.json(
        { error: 'Invalid pattern ID or pattern has no slots' },
        { status: 400 }
      )
    }

    // Convert slots to shift types
    const slotToType: Record<string, string> = {
      'M': 'morning',
      'A': 'afternoon',
      'D': 'day',
      'N': 'night',
      'O': 'off',
    }

    const slotToLabel: Record<string, string> = {
      'M': 'MORNING',
      'A': 'AFTERNOON',
      'D': 'DAY',
      'N': 'NIGHT',
      'O': 'OFF',
    }

    // Generate shifts from pattern start date (or 30 days ago, whichever is later) through end date
    const patternStart = new Date(startDate)
    patternStart.setHours(0, 0, 0, 0)
    
    // Don't generate shifts too far in the past (max 30 days back from today)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    // Start generating from the later of: pattern start date or 30 days ago
    const generateStart = patternStart > thirtyDaysAgo ? patternStart : thirtyDaysAgo
    
    const end = endDate ? new Date(endDate) : new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000)
    end.setHours(23, 59, 59, 999)

    const shifts: Array<{
      user_id: string
      date: string
      label: string
      status: string
      start_ts: string | null
      end_ts: string | null
      notes: string | null
    }> = []

    // Calculate the cycle index for the generation start date
    const daysFromPatternStart = Math.floor((generateStart.getTime() - patternStart.getTime()) / (1000 * 60 * 60 * 24))
    const actualStartCycleIndex = (startCycleIndex + daysFromPatternStart + patternSlots.length) % patternSlots.length

    // Generate shifts from generateStart through end date
    const totalDays = Math.ceil((end.getTime() - generateStart.getTime()) / (1000 * 60 * 60 * 24))
    for (let i = 0; i <= totalDays; i++) {
      const currentDate = new Date(generateStart)
      currentDate.setDate(generateStart.getDate() + i)
      
      if (currentDate > end) break

      // Calculate cycle index based on today's position
      const cycleIndex = (actualStartCycleIndex + i + patternSlots.length) % patternSlots.length
      const slot = patternSlots[cycleIndex]
      const shiftType = slotToType[slot] || 'off'
      const label = slotToLabel[slot] || 'OFF'

      if (shiftType === 'off') {
        shifts.push({
          user_id: userId,
          date: currentDate.toISOString().slice(0, 10),
          label: 'OFF',
          status: 'PLANNED',
          start_ts: null,
          end_ts: null,
          notes: null,
        })
      } else {
        // Get shift times for this shift type
        const times = shiftTimes?.[shiftType]
        let start_ts: string | null = null
        let end_ts: string | null = null

        if (times?.start && times?.end) {
          const [startHour, startMin] = times.start.split(':').map(Number)
          const [endHour, endMin] = times.end.split(':').map(Number)
          
          const startDateTime = new Date(currentDate)
          startDateTime.setHours(startHour, startMin, 0, 0)
          
          let endDateTime = new Date(currentDate)
          endDateTime.setHours(endHour, endMin, 0, 0)
          
          // Handle overnight shifts (end time is next day)
          if (endHour < startHour || (endHour === startHour && endMin < startMin)) {
            endDateTime.setDate(endDateTime.getDate() + 1)
          }

          start_ts = startDateTime.toISOString()
          end_ts = endDateTime.toISOString()
        }

        shifts.push({
          user_id: userId,
          date: currentDate.toISOString().slice(0, 10),
          label: label as any,
          status: 'PLANNED',
          start_ts,
          end_ts,
          notes: commute ? JSON.stringify(commute) : null,
        })
      }
    }

    // Deduplicate shifts by date (keep the last one if duplicates exist)
    const shiftsMap = new Map<string, typeof shifts[0]>()
    shifts.forEach((shift) => {
      shiftsMap.set(shift.date, shift)
    })
    const uniqueShifts = Array.from(shiftsMap.values())

    console.log('[api/rota/apply] generated shifts', {
      total: shifts.length,
      unique: uniqueShifts.length,
      userId,
    })

    // Delete existing shifts from the generation start date onwards (preserve older historical shifts)
    const deleteStartIso = generateStart.toISOString().slice(0, 10)
    const { error: deleteError } = await supabase
      .from('shifts')
      .delete()
      .eq('user_id', userId)
      .gte('date', deleteStartIso)

    if (deleteError) {
      console.error('[api/rota/apply] delete error', deleteError)
      return NextResponse.json(
        { error: 'Failed to clear existing shifts', detail: deleteError.message },
        { status: 500 }
      )
    }

    // Insert new shifts (no need for upsert since we deleted first)
    if (uniqueShifts.length > 0) {
      // Insert in batches to avoid potential issues
      const batchSize = 100
      for (let i = 0; i < uniqueShifts.length; i += batchSize) {
        const batch = uniqueShifts.slice(i, i + batchSize)
        const { error: insertError } = await supabase
          .from('shifts')
          .insert(batch)

        if (insertError) {
          console.error('[api/rota/apply] insert error', insertError)
          return NextResponse.json(
            { error: 'Failed to save shifts', detail: insertError.message },
            { status: 500 }
          )
        }
      }
    }

    // Auto-update shift_pattern in profiles based on the pattern
    if (patternSlots && patternSlots.length > 0) {
      try {
        console.log('[api/rota/apply] patternSlots received:', patternSlots)
        const inferredPattern = inferShiftPattern(patternSlots as any)
        console.log('[api/rota/apply] inferred pattern:', inferredPattern)
        
        const { data: updateData, error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ shift_pattern: inferredPattern })
          .eq('user_id', userId)
          .select()

        if (profileUpdateError) {
          console.error('[api/rota/apply] failed to update shift_pattern in profile:', {
            error: profileUpdateError,
            userId,
            inferredPattern,
          })
          // Don't fail the request if profile update fails
        } else {
          console.log('[api/rota/apply] successfully auto-updated shift_pattern to:', inferredPattern, 'for user:', userId)
          // Note: The client-side code will dispatch 'rota-saved' event after this response
        }
      } catch (inferError) {
        console.error('[api/rota/apply] error inferring or updating shift_pattern:', inferError)
        // Don't fail the request
      }
    } else {
      console.warn('[api/rota/apply] patternSlots missing or invalid:', patternSlots)
    }

    return NextResponse.json({ 
      success: true, 
      shiftsCreated: shifts.length,
      shift_pattern_updated: patternSlots && patternSlots.length > 0
    }, { status: 200 })
  } catch (err: any) {
    console.error('[api/rota/apply] fatal error', err)
    return NextResponse.json(
      { error: 'Unexpected server error', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}

