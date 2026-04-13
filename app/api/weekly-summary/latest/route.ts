import { NextRequest, NextResponse } from 'next/server'
import { buildWeeklySummarySeries } from '@/lib/data/buildWeeklySummarySeries'
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

/**
 * GET /api/weekly-summary/latest
 *
 * Returns the latest weekly summary for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const { data, error } = await supabase
      .from('weekly_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[weekly-summary/latest] error:', error)
      return NextResponse.json({ summary: null }, { status: 200 })
    }

    if (!data) {
      return NextResponse.json({ summary: null }, { status: 200 })
    }

    const summary = data as Record<string, unknown> & { week_start?: string }
    const rollingStart = getRollingWeekStartThroughToday()
    const storedStart =
      typeof summary.week_start === 'string' ? summary.week_start.slice(0, 10) : null
    const staleWindow = storedStart == null || storedStart !== rollingStart
    const shouldRebuildSeries =
      needsDailySeriesEnrichment(summary) || staleWindow

    if (!shouldRebuildSeries) {
      return NextResponse.json({ summary: data })
    }

    try {
      const series = await buildWeeklySummarySeries(supabase, userId, rollingStart)
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
      console.warn('[weekly-summary/latest] series enrichment failed:', e)
      return NextResponse.json({ summary: data })
    }
  } catch (err: any) {
    console.error('[weekly-summary/latest] Fatal error:', err)
    return NextResponse.json({ summary: null }, { status: 200 })
  }
}

