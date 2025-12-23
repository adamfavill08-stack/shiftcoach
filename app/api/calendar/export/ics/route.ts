import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { Event, TYPE_TASK, REMINDER_NOTIFICATION, REMINDER_EMAIL, FLAG_ALL_DAY } from '@/lib/models/calendar/Event'
import { format } from 'date-fns'

// GET /api/calendar/export/ics - Export events to ICS file
export async function GET(request: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const fromTS = searchParams.get('fromTS')
    const toTS = searchParams.get('toTS')
    const eventTypeIds = searchParams.get('eventTypeIds')?.split(',').map(Number)

    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)

    if (fromTS && toTS) {
      query = query
        .lte('start_ts', Number(toTS))
        .gte('end_ts', Number(fromTS))
    }

    if (eventTypeIds && eventTypeIds.length > 0) {
      query = query.in('event_type', eventTypeIds)
    }

    query = query.order('start_ts', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching events for export:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const events = (data || []).map(event => ({
      ...event,
      repetitionExceptions: Array.isArray(event.repetition_exceptions) 
        ? event.repetition_exceptions 
        : JSON.parse(event.repetition_exceptions || '[]'),
      attendees: Array.isArray(event.attendees) 
        ? event.attendees 
        : JSON.parse(event.attendees || '[]'),
    }))

    const icsContent = generateICS(events)

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="calendar-export-${format(new Date(), 'yyyy-MM-dd')}.ics"`,
      },
    })
  } catch (error: any) {
    console.error('Error exporting ICS:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generateICS(events: any[]): string {
  const lines: string[] = []
  
  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//Simple Calendar//EN')
  lines.push('CALSCALE:GREGORIAN')
  lines.push('METHOD:PUBLISH')

  for (const event of events) {
    if (event.type === TYPE_TASK) {
      lines.push('BEGIN:VTODO')
    } else {
      lines.push('BEGIN:VEVENT')
    }

    // UID
    if (event.import_id) {
      lines.push(`UID:${event.import_id}`)
    } else {
      lines.push(`UID:event-${event.id}@simple-calendar`)
    }

    // DTSTART
    const startDate = new Date(event.start_ts * 1000)
    if ((event.flags & FLAG_ALL_DAY) !== 0) {
      lines.push(`DTSTART;VALUE=DATE:${format(startDate, 'yyyyMMdd')}`)
    } else {
      lines.push(`DTSTART:${format(startDate, "yyyyMMdd'T'HHmmss")}`)
    }

    // DTEND
    const endDate = new Date(event.end_ts * 1000)
    if ((event.flags & FLAG_ALL_DAY) !== 0) {
      lines.push(`DTEND;VALUE=DATE:${format(endDate, 'yyyyMMdd')}`)
    } else {
      lines.push(`DTEND:${format(endDate, "yyyyMMdd'T'HHmmss")}`)
    }

    // SUMMARY
    if (event.title) {
      lines.push(`SUMMARY:${encodeICSValue(event.title)}`)
    }

    // LOCATION
    if (event.location) {
      lines.push(`LOCATION:${encodeICSValue(event.location)}`)
    }

    // DESCRIPTION
    if (event.description) {
      lines.push(`DESCRIPTION:${encodeICSValue(event.description)}`)
    }

    // Reminders
    const reminders = []
    if (event.reminder_1_minutes !== -1) {
      reminders.push({ minutes: event.reminder_1_minutes, type: event.reminder_1_type })
    }
    if (event.reminder_2_minutes !== -1) {
      reminders.push({ minutes: event.reminder_2_minutes, type: event.reminder_2_type })
    }
    if (event.reminder_3_minutes !== -1) {
      reminders.push({ minutes: event.reminder_3_minutes, type: event.reminder_3_type })
    }

    for (const reminder of reminders) {
      lines.push('BEGIN:VALARM')
      lines.push('TRIGGER:-PT' + reminder.minutes + 'M')
      if (reminder.type === REMINDER_NOTIFICATION) {
        lines.push('ACTION:DISPLAY')
        lines.push('DESCRIPTION:Reminder')
      } else if (reminder.type === REMINDER_EMAIL) {
        lines.push('ACTION:EMAIL')
        lines.push('DESCRIPTION:Email reminder')
      }
      lines.push('END:VALARM')
    }

    // Recurrence (simplified)
    if (event.repeat_interval > 0) {
      let rrule = 'RRULE:'
      if (event.repeat_interval === 86400) {
        rrule += 'FREQ=DAILY'
      } else if (event.repeat_interval === 604800) {
        rrule += 'FREQ=WEEKLY'
      } else if (event.repeat_interval === 2592001) {
        rrule += 'FREQ=MONTHLY'
      } else if (event.repeat_interval === 31536000) {
        rrule += 'FREQ=YEARLY'
      }
      if (event.repeat_limit > 0) {
        const limitDate = new Date(event.repeat_limit * 1000)
        rrule += `;UNTIL=${format(limitDate, "yyyyMMdd'T'HHmmss'Z'")}`
      }
      lines.push(rrule)
    }

    // Last modified
    if (event.last_updated) {
      const modifiedDate = new Date(event.last_updated * 1000)
      lines.push(`LAST-MODIFIED:${format(modifiedDate, "yyyyMMdd'T'HHmmss'Z'")}`)
    }

    // Created
    if (event.created_at) {
      const createdDate = new Date(event.created_at)
      lines.push(`CREATED:${format(createdDate, "yyyyMMdd'T'HHmmss'Z'")}`)
    }

    if (event.type === TYPE_TASK) {
      lines.push('END:VTODO')
    } else {
      lines.push('END:VEVENT')
    }
  }

  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}

function encodeICSValue(value: string): string {
  // Basic ICS value encoding (escape special characters)
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

