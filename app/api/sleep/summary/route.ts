import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { estimateSleepStages } from '@/lib/sleep/estimateSleepStages'
import { loadPhoneHealthSleepForSummary } from '@/lib/sleep/sleepRecordsSummaryFallback'
import { getShiftedDayKey, isPrimarySleepType, minutesBetween, qualityNumberToLabel } from '@/lib/sleep/utils'
import type { SleepType } from '@/lib/sleep/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_req: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const supabase = isDevFallback ? supabaseServer : authSupabase
    const now = new Date()
    const since = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('sleep_logs')
      .select('id, start_at, end_at, type, quality, notes, source, created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('end_at', since)
      .order('end_at', { ascending: false })

    if (error) {
      console.error('[api/sleep/summary] query error:', error)
      return NextResponse.json({ lastNight: null, last7: [], targetMinutes: 8 * 60 }, { status: 200 })
    }

    const logs = (data ?? []).filter((row: any) => row.start_at && row.end_at)
    const primaryLogs = logs.filter((row: any) => isPrimarySleepType(row.type as SleepType))
    let lastNight: (typeof primaryLogs)[0] | null = primaryLogs.length > 0 ? primaryLogs[0] : null

    const grouped: Record<string, { dateISO: string; total: number; quality: string }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = getShiftedDayKey(d)
      grouped[key] = {
        dateISO: new Date(`${key}T12:00:00.000Z`).toISOString(),
        total: 0,
        quality: '—',
      }
    }

    if (primaryLogs.length === 0) {
      const fb = await loadPhoneHealthSleepForSummary(supabase, userId, since, now)
      if (fb.lastNight) {
        lastNight = fb.lastNight as (typeof primaryLogs)[0]
      }
      for (const [key, mins] of fb.minutesByShiftedDay) {
        if (grouped[key]) grouped[key].total += mins
      }
    }

    for (const row of primaryLogs) {
      let key: string
      try {
        key = getShiftedDayKey(row.end_at)
      } catch {
        continue
      }
      if (!grouped[key]) continue
      grouped[key].total += minutesBetween(row.start_at, row.end_at)
      grouped[key].quality = qualityNumberToLabel(row.quality)
    }

    let sleepStages = { deep: 0, rem: 0, light: 0, awake: 0 }
    if (lastNight) {
      const totalMinutes = minutesBetween(lastNight.start_at, lastNight.end_at)
      const { data: wearable } = await supabase
        .from('sleep_records')
        .select('stage, start_at, end_at')
        .eq('user_id', userId)
        .gte('start_at', lastNight.start_at)
        .lte('end_at', lastNight.end_at)
        .order('start_at', { ascending: true })

      if (wearable && wearable.length > 0 && totalMinutes > 0) {
        const totalMs = totalMinutes * 60000
        let deepMs = 0
        let remMs = 0
        let lightMs = 0
        let awakeMs = 0

        for (const record of wearable) {
          const ms = new Date(record.end_at).getTime() - new Date(record.start_at).getTime()
          if (record.stage === 'deep') deepMs += ms
          else if (record.stage === 'rem') remMs += ms
          else if (record.stage === 'light') lightMs += ms
          else if (record.stage === 'awake') awakeMs += ms
        }

        sleepStages = {
          deep: Math.round((deepMs / totalMs) * 100),
          rem: Math.round((remMs / totalMs) * 100),
          light: Math.round((lightMs / totalMs) * 100),
          awake: Math.round((awakeMs / totalMs) * 100),
        }
      } else {
        const durationHours = totalMinutes / 60
        const start = new Date(lastNight.start_at)
        const end = new Date(lastNight.end_at)
        const midpointHour = (start.getHours() + end.getHours()) / 2
        const isDaySleep = midpointHour >= 8 && midpointHour <= 16

        sleepStages = estimateSleepStages({
          durationHours,
          quality: qualityNumberToLabel(lastNight.quality) as 'Excellent' | 'Good' | 'Fair' | 'Poor',
          bedtimeHour: start.getHours(),
          isDaySleep,
        })
      }
    }

    return NextResponse.json(
      {
        lastNight: lastNight
          ? {
              totalMinutes: minutesBetween(lastNight.start_at, lastNight.end_at),
              startAt: lastNight.start_at,
              endAt: lastNight.end_at,
              deep: sleepStages.deep,
              rem: sleepStages.rem,
              light: sleepStages.light,
              awake: sleepStages.awake,
              quality: qualityNumberToLabel(lastNight.quality),
              updatedAt: lastNight.created_at,
            }
          : null,
        last7: Object.values(grouped).sort(
          (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
        ),
        targetMinutes: 8 * 60,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (err: any) {
    console.error('[api/sleep/summary] fatal:', err)
    return NextResponse.json({ lastNight: null, last7: [], targetMinutes: 8 * 60 }, { status: 200 })
  }
}

