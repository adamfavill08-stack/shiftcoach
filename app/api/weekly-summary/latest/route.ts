import { NextRequest, NextResponse } from 'next/server'
import {
  buildWeeklySummarySeries,
  emptyWeeklySummarySeries,
} from '@/lib/data/buildWeeklySummarySeries'
import { getRollingWeekStartThroughToday } from '@/lib/data/getWeeklyMetrics'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'

function needsDailySeriesEnrichment(summary: Record<string, unknown> | null): boolean {
  if (!summary) return false
  const bc = summary.body_clock_scores
  const sh = summary.sleep_hours
  const ok =
    Array.isArray(bc) && bc.length === 7 && Array.isArray(sh) && sh.length === 7
  return !ok
}

function logErr(context: string, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  console.error(`[weekly-summary/latest] ${context}:`, msg, e)
}

/** PostgREST / Supabase errors often include these fields */
function logPostgrestSelectError(branch: string, error: unknown) {
  const e = error as {
    message?: string
    code?: string
    details?: string
    hint?: string
  }
  console.error(`[weekly-summary/latest] BRANCH: ${branch}`, {
    message: e?.message,
    code: e?.code,
    details: e?.details,
    hint: e?.hint,
    fullError: error,
  })
}

async function syntheticSummaryPayload(
  supabase: Parameters<typeof buildWeeklySummarySeries>[0],
  userId: string,
) {
  const rollingStart = getRollingWeekStartThroughToday()
  try {
    const series = await buildWeeklySummarySeries(supabase, userId, rollingStart)
    return {
      summary: {
        week_start: rollingStart,
        user_id: userId,
        summary_text: ' ',
        body_clock_scores: series.body_clock_scores,
        sleep_hours: series.sleep_hours,
        sleep_timing_scores: series.sleep_timing_scores,
      },
    }
  } catch (e) {
    logErr('syntheticSummaryPayload buildWeeklySummarySeries failed', e)
    const z = emptyWeeklySummarySeries()
    return {
      summary: {
        week_start: rollingStart,
        user_id: userId,
        summary_text: ' ',
        body_clock_scores: z.body_clock_scores,
        sleep_hours: z.sleep_hours,
        sleep_timing_scores: z.sleep_timing_scores,
      },
    }
  }
}

/**
 * GET /api/weekly-summary/latest
 *
 * Returns the latest weekly summary for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    if (!userId) {
      console.log('[weekly-summary/latest] no userId — returning 401 Unauthorized')
      return buildUnauthorizedResponse()
    }

    const { data, error } = await supabase
      .from('weekly_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      logPostgrestSelectError(
        'weekly_summaries SELECT failed (PostgREST — e.g. missing table, RLS, bad schema, network). Recovering with synthetic summary; response should not be summary:null.',
        error,
      )
      const payload = await syntheticSummaryPayload(supabase, userId)
      console.log(
        '[weekly-summary/latest] recovery after SELECT error — body_clock_scores:',
        payload.summary.body_clock_scores,
      )
      return NextResponse.json(payload)
    }

    if (!data) {
      console.log('[weekly-summary/latest] row: none — using synthetic summary + buildWeeklySummarySeries')
      const payload = await syntheticSummaryPayload(supabase, userId)
      console.log(
        '[weekly-summary/latest] response body_clock_scores (no row):',
        payload.summary.body_clock_scores,
      )
      return NextResponse.json(payload)
    }

    const summary = data as Record<string, unknown> & { week_start?: string }
    const rollingStart = getRollingWeekStartThroughToday()
    const storedStart =
      typeof summary.week_start === 'string' ? summary.week_start.slice(0, 10) : null
    const staleWindow = storedStart == null || storedStart !== rollingStart
    const shouldRebuildSeries =
      needsDailySeriesEnrichment(summary) || staleWindow

    if (!shouldRebuildSeries) {
      console.log('[weekly-summary/latest] row: found — passthrough (arrays OK, week aligned)', {
        week_start: summary.week_start,
      })
      console.log(
        '[weekly-summary/latest] response body_clock_scores (existing row):',
        summary.body_clock_scores,
      )
      return NextResponse.json({ summary: data })
    }

    console.log('[weekly-summary/latest] row: found — rebuilding series', {
      rollingStart,
      storedStart,
      staleWindow,
      needsEnrichment: needsDailySeriesEnrichment(summary),
    })

    try {
      const series = await buildWeeklySummarySeries(supabase, userId, rollingStart)
      console.log(
        '[weekly-summary/latest] response body_clock_scores (rebuilt):',
        series.body_clock_scores,
      )
      return NextResponse.json({
        summary: {
          ...data,
          week_start: rollingStart,
          body_clock_scores: series.body_clock_scores,
          sleep_hours: series.sleep_hours,
          sleep_timing_scores: series.sleep_timing_scores,
        },
      })
    } catch (e) {
      logErr('series enrichment failed', e)
      const z = emptyWeeklySummarySeries()
      console.log(
        '[weekly-summary/latest] response body_clock_scores (enrich fallback zeros):',
        z.body_clock_scores,
      )
      return NextResponse.json({
        summary: {
          ...data,
          week_start: rollingStart,
          body_clock_scores: z.body_clock_scores,
          sleep_hours: z.sleep_hours,
          sleep_timing_scores: z.sleep_timing_scores,
        },
      })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.error(
      '[weekly-summary/latest] RETURN { summary: null } — BRANCH: outer try/catch (fatal before or inside handler)',
      { message: msg, stack, fullError: err },
    )
    return NextResponse.json({ summary: null }, { status: 200 })
  }
}

