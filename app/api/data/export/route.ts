import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/data/export
 * Exports all user data in JSON format
 * GDPR compliant - includes all user data
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get format (JSON or CSV) - default to JSON
    const format = req.nextUrl.searchParams.get('format') || 'json'

    // Fetch all user data
    const [
      profileResult,
      sleepLogsResult,
      shiftsResult,
      moodLogsResult,
      activityLogsResult,
      waterLogsResult,
      caffeineLogsResult,
      rhythmScoresResult,
      dailyMetricsResult,
      weeklySummariesResult,
      rotaEventsResult,
    ] = await Promise.all([
      // Profile
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),

      // Sleep logs
      supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .order('start_ts', { ascending: false }),

      // Shifts
      supabase
        .from('shifts')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false }),

      // Mood logs
      supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', userId)
        .order('ts', { ascending: false }),

      // Activity logs
      supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('ts', { ascending: false }),

      // Water logs
      supabase
        .from('water_logs')
        .select('*')
        .eq('user_id', userId)
        .order('ts', { ascending: false }),

      // Caffeine logs
      supabase
        .from('caffeine_logs')
        .select('*')
        .eq('user_id', userId)
        .order('ts', { ascending: false }),

      // Shift rhythm scores
      supabase
        .from('shift_rhythm_scores')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false }),

      // Daily metrics
      supabase
        .from('daily_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false }),

      // Weekly summaries
      supabase
        .from('weekly_summaries')
        .select('*')
        .eq('user_id', userId)
        .order('week_start_date', { ascending: false }),

      // Rota events
      supabase
        .from('rota_events')
        .select('*')
        .eq('user_id', userId)
        .order('event_date', { ascending: false }),
    ])

    // Compile export data
    const exportData = {
      exportDate: new Date().toISOString(),
      userId,
      profile: profileResult.data || null,
      sleepLogs: sleepLogsResult.data || [],
      shifts: shiftsResult.data || [],
      moodLogs: moodLogsResult.data || [],
      activityLogs: activityLogsResult.data || [],
      waterLogs: waterLogsResult.data || [],
      caffeineLogs: caffeineLogsResult.data || [],
      shiftRhythmScores: rhythmScoresResult.data || [],
      dailyMetrics: dailyMetricsResult.data || [],
      weeklySummaries: weeklySummariesResult.data || [],
      rotaEvents: rotaEventsResult.data || [],
      summary: {
        totalSleepLogs: sleepLogsResult.data?.length || 0,
        totalShifts: shiftsResult.data?.length || 0,
        totalMoodLogs: moodLogsResult.data?.length || 0,
        totalActivityLogs: activityLogsResult.data?.length || 0,
        totalWaterLogs: waterLogsResult.data?.length || 0,
        totalCaffeineLogs: caffeineLogsResult.data?.length || 0,
        totalRhythmScores: rhythmScoresResult.data?.length || 0,
        totalDailyMetrics: dailyMetricsResult.data?.length || 0,
        totalWeeklySummaries: weeklySummariesResult.data?.length || 0,
        totalRotaEvents: rotaEventsResult.data?.length || 0,
      },
    }

    if (format === 'csv') {
      // Convert to CSV (simplified - just profile and summary for now)
      const csvRows: string[] = []
      csvRows.push('Data Export Summary')
      csvRows.push(`Export Date,${exportData.exportDate}`)
      csvRows.push(`User ID,${userId}`)
      csvRows.push('')
      csvRows.push('Summary')
      csvRows.push(`Total Sleep Logs,${exportData.summary.totalSleepLogs}`)
      csvRows.push(`Total Shifts,${exportData.summary.totalShifts}`)
      csvRows.push(`Total Mood Logs,${exportData.summary.totalMoodLogs}`)
      csvRows.push(`Total Activity Logs,${exportData.summary.totalActivityLogs}`)
      csvRows.push(`Total Water Logs,${exportData.summary.totalWaterLogs}`)
      csvRows.push(`Total Caffeine Logs,${exportData.summary.totalCaffeineLogs}`)
      csvRows.push(`Total Rhythm Scores,${exportData.summary.totalRhythmScores}`)
      csvRows.push(`Total Daily Metrics,${exportData.summary.totalDailyMetrics}`)
      csvRows.push(`Total Weekly Summaries,${exportData.summary.totalWeeklySummaries}`)
      csvRows.push(`Total Rota Events,${exportData.summary.totalRotaEvents}`)
      csvRows.push('')
      csvRows.push('Note: Full data available in JSON format')

      const csv = csvRows.join('\n')

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="shiftcoach-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Return JSON
    return NextResponse.json(exportData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="shiftcoach-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (err: any) {
    console.error('[api/data/export] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to export data' },
      { status: 500 }
    )
  }
}

