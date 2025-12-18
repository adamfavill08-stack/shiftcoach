import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { SHIFT_CALI_COACH_SYSTEM_PROMPT } from '@/lib/coach/systemPrompt'
import { getCoachingState } from '@/lib/coach/getCoachingState'
import { openai } from '@/lib/openaiClient'

export const dynamic = 'force-dynamic'

function isRateLimitError(err: any) {
  if (!err) return false
  if (err.status === 429) return true
  const message = typeof err.message === 'string' ? err.message : ''
  if (message.includes('Rate limit')) return true
  const code = err?.error?.code || err?.code
  return code === 'rate_limit_exceeded'
}

export async function GET(req: NextRequest) {
  try {
    console.log('[api/sleep/overview] Starting request')
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase

    console.log('[api/sleep/overview] User ID:', userId, 'isDevFallback:', isDevFallback)

    if (!userId) {
      console.error('[api/sleep/overview] No userId, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch sleep summary data directly from database
    let sleepSummary: any = null
    try {
      const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
      const sevenAgo = new Date()
      sevenAgo.setDate(sevenAgo.getDate() - 6)
      sevenAgo.setHours(0, 0, 0, 0)
      
      // Try old schema first
      let lastLogs, lastErr
      let result = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('naps', 0)
        .gte('end_ts', since)
        .order('end_ts', { ascending: false })
        .limit(1)
      
      lastLogs = result.data
      lastErr = result.error
      
      if (lastErr && (lastErr.message?.includes("end_ts") || lastErr.message?.includes("naps"))) {
        result = await supabase
          .from('sleep_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('type', 'sleep')
          .gte('end_at', since)
          .order('end_at', { ascending: false })
          .limit(1)
        lastLogs = result.data
        lastErr = result.error
      }

      const last = lastLogs?.[0] ?? null
      const startTime = last?.start_at || last?.start_ts
      const endTime = last?.end_at || last?.end_ts
      const totalMins = last && startTime && endTime ? Math.round((+new Date(endTime) - +new Date(startTime)) / 60000) : 0

      // Get last 7 days
      let weekLogs, weekErr
      let weekResult = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('naps', 0)
        .gte('start_ts', sevenAgo.toISOString())
        .order('start_ts', { ascending: true })
      
      weekLogs = weekResult.data
      weekErr = weekResult.error
      
      if (weekErr && (weekErr.message?.includes("start_ts") || weekErr.message?.includes("naps"))) {
        weekResult = await supabase
          .from('sleep_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('type', 'sleep')
          .gte('start_at', sevenAgo.toISOString())
          .order('start_at', { ascending: true })
        weekLogs = weekResult.data
        weekErr = weekResult.error
      }

      const getLocalDateString = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const byDay: Record<string, { dateISO: string, total: number, quality: string }> = {}
      for (let i = 0; i < 7; i++) {
        const d = new Date(sevenAgo.getFullYear(), sevenAgo.getMonth(), sevenAgo.getDate() + i, 12, 0, 0, 0)
        const key = getLocalDateString(d)
        byDay[key] = { dateISO: d.toISOString(), total: 0, quality: '—' }
      }

      for (const row of weekLogs ?? []) {
        const endTime = row.end_at || row.end_ts
        const startTime = row.start_at || row.start_ts
        if (!endTime || !startTime) continue
        
        let key: string
        if (row.date) {
          key = row.date.slice(0, 10)
        } else {
          key = getLocalDateString(new Date(endTime))
        }
        
        if (byDay[key]) {
          byDay[key].total += Math.round((+new Date(endTime) - +new Date(startTime)) / 60000)
          const qualityValue = row.quality
          if (qualityValue) {
            if (typeof qualityValue === 'number') {
              const qualityMap: Record<number, string> = { 5: 'Excellent', 4: 'Good', 3: 'Fair', 2: 'Fair', 1: 'Poor' }
              byDay[key].quality = qualityMap[qualityValue] || 'Fair'
            } else {
              byDay[key].quality = qualityValue
            }
          }
        }
      }

      const last7Array = Object.values(byDay).sort((a, b) => 
        new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
      )

      sleepSummary = {
        lastNight: last ? {
          totalMinutes: totalMins,
          startAt: startTime || '',
          endAt: endTime || '',
          quality: (() => {
            const q = last.quality
            if (!q) return 'Fair'
            if (typeof q === 'number') {
              const qualityMap: Record<number, string> = { 5: 'Excellent', 4: 'Good', 3: 'Fair', 2: 'Fair', 1: 'Poor' }
              return qualityMap[q] || 'Fair'
            }
            return q
          })(),
        } : null,
        last7: last7Array,
      }
    } catch (err) {
      console.error('[api/sleep/overview] Error fetching sleep summary:', err)
    }

    // Fetch shift rhythm data directly
    let shiftRhythm: any = null
    try {
      const { calculateCircadianPhase } = await import('@/lib/circadian/calcCircadianPhase')
      type ShiftType = "morning" | "day" | "evening" | "night" | "rotating"
      const { getSleepDeficitForCircadian } = await import('@/lib/circadian/sleep')
      
      // Build CircadianInput directly (similar to /api/circadian/calculate)
      const today = new Date()
      
      // Get latest main sleep session
      const { data: sleepLogs } = await supabase
        .from('sleep_logs')
        .select('start_ts, end_ts, sleep_hours, type, naps')
        .eq('user_id', userId)
        .order('start_ts', { ascending: false })
        .limit(14)
      
      if (!sleepLogs || sleepLogs.length === 0) {
        throw new Error('No sleep data available')
      }
      
      // Filter for main sleep (new schema: type === 'sleep', old schema: naps === 0 or null)
      const mainSleepLogs = sleepLogs.filter((log: any) => {
        if (log.type !== undefined) {
          return log.type === 'sleep' || log.type === 'main'
        }
        return log.naps === 0 || log.naps === null || log.naps === undefined
      })
      
      if (mainSleepLogs.length === 0) {
        throw new Error('No main sleep data available')
      }
      
      const latestSleep = mainSleepLogs[0]
      if (!latestSleep.start_ts || !latestSleep.end_ts) {
        throw new Error('Latest sleep missing timestamps')
      }
      
      const sleepStart = new Date(latestSleep.start_ts)
      const sleepEnd = new Date(latestSleep.end_ts)
      const sleepDurationHours = latestSleep.sleep_hours ?? 
        (sleepEnd.getTime() - sleepStart.getTime()) / (1000 * 60 * 60)
      
      // Calculate averages from recent main sleep
      const recentMainSleep = mainSleepLogs.slice(0, Math.min(14, mainSleepLogs.length))
      const bedtimes: number[] = []
      const wakeTimes: number[] = []
      
      for (const log of recentMainSleep) {
        if (!log.start_ts || !log.end_ts) continue
        const start = new Date(log.start_ts)
        const end = new Date(log.end_ts)
        const bedtimeMin = start.getHours() * 60 + start.getMinutes()
        const wakeTimeMin = end.getHours() * 60 + end.getMinutes()
        bedtimes.push(bedtimeMin)
        wakeTimes.push(wakeTimeMin)
      }
      
      if (bedtimes.length === 0) {
        throw new Error('Insufficient sleep data for averages')
      }
      
      const avgBedtime = Math.round(bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length)
      const avgWakeTime = Math.round(wakeTimes.reduce((a, b) => a + b, 0) / wakeTimes.length)
      
      // Calculate bedtime variance
      const bedtimeMean = avgBedtime
      const variance = bedtimes.reduce((sum, bt) => {
        const diff = Math.abs(bt - bedtimeMean)
        const wrappedDiff = Math.min(diff, 1440 - diff)
        return sum + (wrappedDiff * wrappedDiff)
      }, 0) / bedtimes.length
      const bedtimeVariance = Math.round(Math.sqrt(variance))
      
      // Get sleep deficit
      const profile = await supabase
        .from('profiles')
        .select('sleep_goal_h')
        .eq('user_id', userId)
        .maybeSingle()
      const sleepGoalHours = profile?.data?.sleep_goal_h ?? 7.5
      const sleepDeficit = await getSleepDeficitForCircadian(supabase, userId, sleepGoalHours)
      const sleepDebtHours = sleepDeficit ? Math.max(0, sleepDeficit.weeklyDeficit) : 0
      
      // Get shift type
      const { data: shifts } = await supabase
        .from('shifts')
        .select('label, start_ts, date')
        .eq('user_id', userId)
        .lte('date', today.toISOString().slice(0, 10))
        .order('date', { ascending: false })
        .limit(7)
      
      // Use shared utility for consistent shift type classification
      const { toShiftType } = await import('@/lib/shifts/toShiftType')
      let shiftType: ShiftType = 'day'
      if (shifts && shifts.length > 0) {
        const latestShift = shifts.find(s => s.label && s.label !== 'OFF')
        if (latestShift) {
          shiftType = toShiftType(
            latestShift.label,
            latestShift.start_ts,
            true, // check for rotating
            shifts
          ) as ShiftType
        }
      }
      
      // Build CircadianInput
      const circadianInput = {
        sleepStart,
        sleepEnd,
        avgBedtime,
        avgWakeTime,
        bedtimeVariance,
        sleepDurationHours,
        sleepDebtHours,
        shiftType,
      }
      
      const circadian = calculateCircadianPhase(circadianInput)
      
      // sleepDeficit and sleepGoalHours are already defined above
      shiftRhythm = {
        circadian,
        sleepDeficit,
      }
    } catch (err) {
      console.error('[api/sleep/overview] Error fetching shift rhythm:', err)
    }

    // Fetch user metrics
    const { getUserMetrics } = await import('@/lib/data/getUserMetrics')
    const metrics = await getUserMetrics(userId, supabase)

    const shiftTypeNormalized = metrics.shiftType
      ? (metrics.shiftType.toLowerCase() as 'day' | 'night' | 'late' | 'off')
      : null

    const coachingState = getCoachingState({
      bodyClockScore: metrics.bodyClockScore,
      recoveryScore: metrics.recoveryScore,
      sleepHoursLast24h: metrics.sleepHoursLast24,
      shiftType: shiftTypeNormalized,
      moodScore: metrics.moodScore,
      focusScore: metrics.focusScore,
    })

    // Build comprehensive sleep context
    const sleepContextParts: string[] = []
    
    if (sleepSummary?.lastNight) {
      const hours = Math.floor(sleepSummary.lastNight.totalMinutes / 60)
      const mins = sleepSummary.lastNight.totalMinutes % 60
      sleepContextParts.push(`Last night: ${hours}h ${mins}m`)
      if (sleepSummary.lastNight.quality) {
        sleepContextParts.push(`Quality: ${sleepSummary.lastNight.quality}`)
      }
      if (sleepSummary.lastNight.deep !== undefined) {
        sleepContextParts.push(`Deep: ${sleepSummary.lastNight.deep}%, REM: ${sleepSummary.lastNight.rem}%, Light: ${sleepSummary.lastNight.light}%, Awake: ${sleepSummary.lastNight.awake}%`)
      }
    }

    if (sleepSummary?.last7 && sleepSummary.last7.length > 0) {
      const avgHours = sleepSummary.last7.reduce((sum: number, day: any) => sum + (day.total || 0), 0) / sleepSummary.last7.length / 60
      sleepContextParts.push(`7-day average: ${avgHours.toFixed(1)}h`)
    }

    if (shiftRhythm?.circadian) {
      sleepContextParts.push(`Circadian phase: ${Math.round(shiftRhythm.circadian.circadianPhase * 100)}/100`)
    }

    if (shiftRhythm?.sleepDeficit) {
      sleepContextParts.push(`Sleep deficit: ${shiftRhythm.sleepDeficit.weeklyDeficitHours.toFixed(1)}h (${shiftRhythm.sleepDeficit.category})`)
    }

    if (metrics.shiftType) {
      sleepContextParts.push(`Current shift: ${metrics.shiftType}`)
    }

    if (metrics.moodScore !== null) {
      sleepContextParts.push(`Mood: ${metrics.moodScore}/5`)
    }

    if (metrics.focusScore !== null) {
      sleepContextParts.push(`Focus: ${metrics.focusScore}/5`)
    }

    const sleepContext = sleepContextParts.length > 0
      ? `Sleep data:\n- ${sleepContextParts.join('\n- ')}`
      : 'Sleep data: No recent sleep data logged yet.'

    // Calculate additional statistics
    const stats = {
      totalSleepLast7Days: sleepSummary?.last7?.reduce((sum: number, day: any) => sum + (day.total || 0), 0) || 0,
      averageSleepPerDay: 0,
      bestDay: null as any,
      worstDay: null as any,
      consistencyScore: 0,
      totalDaysWithSleep: 0,
    }

    if (sleepSummary?.last7 && sleepSummary.last7.length > 0) {
      const daysWithSleep = sleepSummary.last7.filter((d: any) => d.total > 0)
      stats.totalDaysWithSleep = daysWithSleep.length
      stats.averageSleepPerDay = daysWithSleep.length > 0 
        ? stats.totalSleepLast7Days / daysWithSleep.length / 60 
        : 0
      
      if (daysWithSleep.length > 0) {
        stats.bestDay = daysWithSleep.reduce((best: any, day: any) => 
          day.total > best.total ? day : best, daysWithSleep[0]
        )
        stats.worstDay = daysWithSleep.reduce((worst: any, day: any) => 
          day.total < worst.total ? day : worst, daysWithSleep[0]
        )
        
        // Calculate consistency (lower variance = higher consistency)
        const sleepHours = daysWithSleep.map((d: any) => d.total / 60)
        const avg = sleepHours.reduce((sum: number, h: number) => sum + h, 0) / sleepHours.length
        const variance = sleepHours.reduce((sum: number, h: number) => sum + Math.pow(h - avg, 2), 0) / sleepHours.length
        const stdDev = Math.sqrt(variance)
        // Consistency score: 100 - (stdDev * 10), clamped to 0-100
        stats.consistencyScore = Math.max(0, Math.min(100, Math.round(100 - (stdDev * 10))))
      }
    }

    const systemMessage = `
${SHIFT_CALI_COACH_SYSTEM_PROMPT}

Coaching state summary:
${coachingState.summary}

${sleepContext}

You are providing a comprehensive sleep analysis and recommendations for a shift worker. Analyze their sleep patterns, identify potential issues (like brain fog, fatigue, poor recovery), and provide actionable recommendations.

Generate a detailed analysis in the following format:

1. **Overview**: A brief summary of their current sleep situation (2-3 sentences)

2. **Key Insights**: 3-4 bullet points highlighting the most important findings from their sleep data

3. **Recommendations**: Specific, actionable recommendations tailored to their shift pattern and sleep issues. Include:
   - Sleep timing adjustments
   - Sleep quality improvements
   - Strategies to reduce brain fog
   - Recovery tips
   - Any other relevant suggestions

4. **Potential Issues**: Identify any red flags or concerns (e.g., chronic sleep debt, circadian misalignment, poor sleep quality)

Be specific, practical, and empathetic. Focus on solutions that work for shift workers.`.trim()

    const messages: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content: systemMessage,
      },
      {
        role: 'user',
        content: 'Provide a comprehensive sleep analysis and recommendations for this user.',
      },
    ]

    let analysis = 'Unable to generate analysis at this time.'
    try {
      console.log('[api/sleep/overview] Calling OpenAI...')
      const chatRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages,
        max_tokens: 1000,
      })
      console.log('[api/sleep/overview] OpenAI response received')
      analysis = chatRes.choices[0]?.message?.content?.trim() || 'Unable to generate analysis at this time.'
    } catch (err) {
      console.error('[/api/sleep/overview] OpenAI error:', err)
      if (isRateLimitError(err)) {
        // Return a basic analysis even if rate limited
        analysis = `Based on your sleep data, here's a quick overview: ${sleepContextParts.length > 0 ? sleepContextParts.join('. ') : 'You need to log more sleep data to get personalized recommendations.'}`
      } else {
        // Still return something useful even if AI fails
        analysis = `Based on your sleep data: ${sleepContextParts.length > 0 ? sleepContextParts.join('. ') : 'Log more sleep data to get personalized recommendations.'}`
      }
    }

    // Parse the AI response into structured format
    const sections = {
      overview: '',
      insights: [] as string[],
      recommendations: [] as string[],
      issues: [] as string[],
    }

    // Simple parsing of markdown-style response
    const lines = analysis.split('\n')
    let currentSection: 'overview' | 'insights' | 'recommendations' | 'issues' | null = null

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      if (trimmed.includes('**Overview**') || trimmed.toLowerCase().includes('overview')) {
        currentSection = 'overview'
        continue
      }
      if (trimmed.includes('**Key Insights**') || trimmed.toLowerCase().includes('key insights')) {
        currentSection = 'insights'
        continue
      }
      if (trimmed.includes('**Recommendations**') || trimmed.toLowerCase().includes('recommendations')) {
        currentSection = 'recommendations'
        continue
      }
      if (trimmed.includes('**Potential Issues**') || trimmed.toLowerCase().includes('potential issues')) {
        currentSection = 'issues'
        continue
      }

      if (currentSection === 'overview') {
        sections.overview += (sections.overview ? ' ' : '') + trimmed.replace(/^\*\*.*?\*\*:?\s*/, '')
      } else if (currentSection === 'insights' || currentSection === 'recommendations' || currentSection === 'issues') {
        if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
          const item = trimmed.replace(/^[-•*]\s*/, '').trim()
          if (item) {
            sections[currentSection].push(item)
          }
        } else {
          sections[currentSection].push(trimmed)
        }
      }
    }

    // If parsing failed, use the raw analysis
    if (!sections.overview && !sections.insights.length && !sections.recommendations.length) {
      sections.overview = analysis
      // Try to extract some basic recommendations from the analysis
      if (analysis.toLowerCase().includes('brain fog')) {
        sections.recommendations.push('Consider adjusting your sleep timing to reduce brain fog symptoms.')
      }
      if (analysis.toLowerCase().includes('sleep debt') || analysis.toLowerCase().includes('deficit')) {
        sections.issues.push('You may be experiencing sleep debt. Try to get more consistent sleep.')
      }
    }

    // Ensure we always have at least a basic overview
    if (!sections.overview) {
      sections.overview = sleepContextParts.length > 0
        ? `Your sleep data shows: ${sleepContextParts.slice(0, 3).join(', ')}.`
        : 'Log more sleep data to get personalized recommendations.'
    }

    const response = {
      analysis: sections.overview,
      insights: sections.insights.length > 0 ? sections.insights : [],
      recommendations: sections.recommendations.length > 0 ? sections.recommendations : [],
      issues: sections.issues.length > 0 ? sections.issues : [],
      sleepData: {
        lastNight: sleepSummary?.lastNight || null,
        last7: sleepSummary?.last7 || [],
        circadian: shiftRhythm?.circadian || null,
        sleepDeficit: shiftRhythm?.sleepDeficit || null,
      },
      statistics: stats,
      metrics: {
        bodyClockScore: metrics.bodyClockScore,
        recoveryScore: metrics.recoveryScore,
        moodScore: metrics.moodScore,
        focusScore: metrics.focusScore,
        shiftType: metrics.shiftType,
        sleepHoursLast24: metrics.sleepHoursLast24,
      },
    }

    console.log('[api/sleep/overview] Returning response:', {
      hasAnalysis: !!response.analysis,
      insightsCount: response.insights.length,
      recommendationsCount: response.recommendations.length,
      issuesCount: response.issues.length,
    })

    return NextResponse.json(response, { status: 200 })
  } catch (err: any) {
    console.error('[/api/sleep/overview] FATAL ERROR:', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })
    return NextResponse.json({ 
      error: 'Failed to generate sleep overview',
      details: err?.message || String(err),
    }, { status: 500 })
  }
}

