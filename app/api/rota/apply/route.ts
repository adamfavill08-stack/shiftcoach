import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getPatternSlots, type ShiftSlot } from '@/lib/rota/patternSlots'
import { inferShiftPattern } from '@/lib/rota/inferShiftPattern'
import {
  buildConcreteShiftsRows,
  countInclusiveCalendarDays,
  shiftDateKeyLocal,
} from '@/lib/rota/buildConcreteShifts'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

function parsePatternSlotsOverride(raw: unknown): ShiftSlot[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: ShiftSlot[] = []
  for (const el of raw) {
    const c = String(el).trim().toUpperCase()
    if (c === 'M' || c === 'A' || c === 'D' || c === 'N' || c === 'O') {
      out.push(c)
    } else {
      return null
    }
  }
  return out
}

const RotaApplySchema = z.object({
  patternId: z.string().min(1),
  startDate: z.string().min(1),
  startCycleIndex: z.preprocess((value) => {
    if (value === null || value === undefined || value === '') return 0
    const num = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(num) ? num : 0
  }, z.number().int().min(0)).optional(),
  /** When provided, overrides `getPatternSlots(patternId)` (e.g. onboarding custom cycle). */
  patternSlots: z.array(z.string()).optional(),
  shiftTimes: z.record(z.string(), z.object({ start: z.string().optional(), end: z.string().optional() })).optional(),
  commute: z.unknown().optional(),
  endDate: z.string().nullable().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const supabase = isDevFallback ? supabaseServer : authSupabase

    const parsed = await parseJsonBody(req, RotaApplySchema)
    if (!parsed.ok) return parsed.response
    const {
      patternId,
      startDate,
      startCycleIndex = 0,
      patternSlots: patternSlotsRaw,
      shiftTimes,
      commute,
      endDate,
    } = parsed.data

    const slotsOverride = parsePatternSlotsOverride(patternSlotsRaw)
    const patternSlots = slotsOverride ?? getPatternSlots(patternId)
    if (!patternSlots || patternSlots.length === 0) {
      return NextResponse.json(
        { error: 'Invalid pattern ID or pattern has no slots' },
        { status: 400 }
      )
    }

    // Generate shifts from today (or pattern start if in the future) forward for 100 years
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const patternStart = new Date(startDate)
    patternStart.setHours(0, 0, 0, 0)
    
    // Start generating from today (or pattern start if it's in the future)
    // This ensures shifts are always generated from the current date forward
    const generateStart = patternStart > today ? patternStart : today
    
    // Always generate shifts for 100 years from the generation start date
    // This ensures shifts continue indefinitely (effectively forever)
    const hundredYearsFromStart = new Date(generateStart)
    hundredYearsFromStart.setFullYear(generateStart.getFullYear() + 100)
    const end = endDate ? new Date(Math.max(new Date(endDate).getTime(), hundredYearsFromStart.getTime())) : hundredYearsFromStart
    end.setHours(23, 59, 59, 999)

    const dayCount = countInclusiveCalendarDays(generateStart, end)

    console.log('[api/rota/apply] starting shift generation', {
      dayCount,
      from: generateStart.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
    })
    const generationStartTime = Date.now()

    const uniqueShifts = buildConcreteShiftsRows({
      userId,
      patternId,
      patternSlotsOverride: slotsOverride,
      patternStart,
      startCycleIndex,
      rangeStart: generateStart,
      dayCount,
      shiftTimes,
      commute,
    })

    const generationTime = Date.now() - generationStartTime
    console.log('[api/rota/apply] shift generation completed', {
      timeMs: generationTime,
      shiftsGenerated: uniqueShifts.length,
    })

    console.log('[api/rota/apply] generated shifts', {
      unique: uniqueShifts.length,
      userId,
      dateRange: {
        from: generateStart.toISOString().slice(0, 10),
        to: end.toISOString().slice(0, 10),
        years: Math.round((end.getTime() - generateStart.getTime()) / (1000 * 60 * 60 * 24 * 365.25)),
      },
      sampleShifts: uniqueShifts.slice(0, 5).map(s => ({ date: s.date, label: s.label })),
    })

    // Delete existing shifts from the generation start date onwards (preserve older historical shifts)
    const deleteStartIso = shiftDateKeyLocal(generateStart)
    const { error: deleteError } = await supabase
      .from('shifts')
      .delete()
      .eq('user_id', userId)
      .gte('date', deleteStartIso)

    if (deleteError) {
      console.error('[api/rota/apply] delete error', deleteError)
      return apiServerError('clear_existing_shifts_failed', deleteError.message)
    }

    // Insert new shifts (no need for upsert since we deleted first)
    if (uniqueShifts.length > 0) {
      // Insert in larger batches for better performance (1000 shifts per batch)
      // Supabase can handle up to 1000 rows per insert, so we use that limit
      const batchSize = 1000
      const insertionStartTime = Date.now()
      let totalInserted = 0
      const totalBatches = Math.ceil(uniqueShifts.length / batchSize)
      console.log('[api/rota/apply] starting shift insertion', {
        totalShifts: uniqueShifts.length,
        batchSize,
        totalBatches,
      })
      
      for (let i = 0; i < uniqueShifts.length; i += batchSize) {
        const batch = uniqueShifts.slice(i, i + batchSize)
        const { error: insertError } = await supabase
          .from('shifts')
          .insert(batch)

        if (insertError) {
          console.error('[api/rota/apply] insert error', insertError)
          return apiServerError('save_shifts_failed', insertError.message)
        }
        totalInserted += batch.length
      }
      const insertionTime = Date.now() - insertionStartTime
      console.log('[api/rota/apply] successfully inserted shifts', {
        totalInserted,
        userId,
        firstShiftDate: uniqueShifts[0]?.date,
        lastShiftDate: uniqueShifts[uniqueShifts.length - 1]?.date,
        insertionTimeMs: insertionTime,
        avgTimePerBatch: Math.round(insertionTime / totalBatches),
      })
    } else {
      console.warn('[api/rota/apply] no shifts to insert', { userId, generateStart, end })
    }

    // Persist configured shift times from rota setup so downstream consumers
    // (meal timing badge, schedule UI) can read the same source of truth.
    if (shiftTimes && Object.keys(shiftTimes).length > 0) {
      const { error: shiftTimesUpdateError } = await supabase
        .from('profiles')
        .update({ shift_times: shiftTimes })
        .eq('user_id', userId)

      if (shiftTimesUpdateError) {
        console.error('[api/rota/apply] failed to update shift_times in profile:', {
          error: shiftTimesUpdateError,
          userId,
        })
        // Do not fail rota apply if profile mirror write fails.
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
      shiftsCreated: uniqueShifts.length,
      shift_pattern_updated: patternSlots && patternSlots.length > 0
    }, { status: 200 })
  } catch (err: any) {
    console.error('[api/rota/apply] fatal error', err)
    return apiServerError('unexpected_error', err?.message || 'Unexpected server error')
  }
}

