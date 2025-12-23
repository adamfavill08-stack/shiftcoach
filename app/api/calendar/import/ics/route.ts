import { getServerSupabaseAndUserId } from '@/lib/supabase/server'
import { supabaseServer } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { Event, TYPE_EVENT, TYPE_TASK, REMINDER_OFF, REMINDER_NOTIFICATION, FLAG_ALL_DAY } from '@/lib/models/calendar/Event'
import { REGULAR_EVENT_TYPE_ID } from '@/lib/models/calendar/EventType'

// POST /api/calendar/import/ics - Import events from ICS file
export async function POST(request: NextRequest) {
  try {
    const { supabase: authSupabase, userId, isDevFallback } = await getServerSupabaseAndUserId()
    const supabase = isDevFallback ? supabaseServer : authSupabase
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const events = parseICS(text, userId)

    // Insert events
    const results = await Promise.allSettled(
      events.map(event => 
        supabase.from('events').insert({
          user_id: userId,
          start_ts: event.startTS,
          end_ts: event.endTS,
          title: event.title,
          location: event.location,
          description: event.description,
          reminder_1_minutes: event.reminder1Minutes,
          reminder_2_minutes: event.reminder2Minutes,
          reminder_3_minutes: event.reminder3Minutes,
          reminder_1_type: event.reminder1Type,
          reminder_2_type: event.reminder2Type,
          reminder_3_type: event.reminder3Type,
          repeat_interval: event.repeatInterval,
          repeat_rule: event.repeatRule,
          repeat_limit: event.repeatLimit,
          repetition_exceptions: event.repetitionExceptions,
          attendees: event.attendees,
          import_id: event.importId,
          time_zone: event.timeZone,
          flags: event.flags,
          event_type: event.eventType,
          parent_id: event.parentId,
          last_updated: event.lastUpdated,
          source: event.source,
          availability: event.availability,
          color: event.color,
          type: event.type,
        })
      )
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return NextResponse.json({
      success: true,
      imported: successful,
      failed,
      total: events.length,
    })
  } catch (error: any) {
    console.error('Error importing ICS:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Simple ICS parser (simplified version)
function parseICS(icsContent: string, userId: string): Event[] {
  const events: Event[] = []
  const lines = icsContent.split(/\r?\n/)
  
  let currentEvent: Partial<Event> | null = null
  let inEvent = false
  let currentLine = ''

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    
    // Handle line continuation (lines starting with space or tab)
    if (line.startsWith(' ') || line.startsWith('\t')) {
      currentLine += line.substring(1)
      continue
    } else {
      if (currentLine) {
        line = currentLine
        currentLine = ''
      }
    }

    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true
      currentEvent = {
        title: '',
        location: '',
        description: '',
        startTS: 0,
        endTS: 0,
        reminder1Minutes: REMINDER_OFF,
        reminder2Minutes: REMINDER_OFF,
        reminder3Minutes: REMINDER_OFF,
        reminder1Type: REMINDER_NOTIFICATION,
        reminder2Type: REMINDER_NOTIFICATION,
        reminder3Type: REMINDER_NOTIFICATION,
        repeatInterval: 0,
        repeatRule: 0,
        repeatLimit: 0,
        repetitionExceptions: [],
        attendees: [],
        importId: '',
        timeZone: '',
        flags: 0,
        eventType: REGULAR_EVENT_TYPE_ID,
        parentId: 0,
        lastUpdated: Math.floor(Date.now() / 1000),
        source: 'imported-ics',
        availability: 0,
        color: 0,
        type: TYPE_EVENT,
      }
    } else if (line.startsWith('END:VEVENT')) {
      if (currentEvent && currentEvent.startTS && currentEvent.endTS && currentEvent.title) {
        events.push(currentEvent as Event)
      }
      inEvent = false
      currentEvent = null
    } else if (inEvent && currentEvent) {
      if (line.startsWith('DTSTART')) {
        const dateStr = line.split(':')[1]?.replace(/[TZ]/g, '') || ''
        if (dateStr.length === 8) {
          // All-day event (YYYYMMDD)
          const year = parseInt(dateStr.substring(0, 4))
          const month = parseInt(dateStr.substring(4, 6)) - 1
          const day = parseInt(dateStr.substring(6, 8))
          const date = new Date(year, month, day, 0, 0, 0)
          currentEvent.startTS = Math.floor(date.getTime() / 1000)
          currentEvent.flags = (currentEvent.flags || 0) | FLAG_ALL_DAY
        } else if (dateStr.length >= 14) {
          // Timed event (YYYYMMDDTHHMMSS)
          const year = parseInt(dateStr.substring(0, 4))
          const month = parseInt(dateStr.substring(4, 6)) - 1
          const day = parseInt(dateStr.substring(6, 8))
          const hour = parseInt(dateStr.substring(9, 11) || '0')
          const minute = parseInt(dateStr.substring(11, 13) || '0')
          const second = parseInt(dateStr.substring(13, 15) || '0')
          const date = new Date(year, month, day, hour, minute, second)
          currentEvent.startTS = Math.floor(date.getTime() / 1000)
        }
      } else if (line.startsWith('DTEND')) {
        const dateStr = line.split(':')[1]?.replace(/[TZ]/g, '') || ''
        if (dateStr.length === 8) {
          const year = parseInt(dateStr.substring(0, 4))
          const month = parseInt(dateStr.substring(4, 6)) - 1
          const day = parseInt(dateStr.substring(6, 8))
          const date = new Date(year, month, day, 23, 59, 59)
          currentEvent.endTS = Math.floor(date.getTime() / 1000)
        } else if (dateStr.length >= 14) {
          const year = parseInt(dateStr.substring(0, 4))
          const month = parseInt(dateStr.substring(4, 6)) - 1
          const day = parseInt(dateStr.substring(6, 8))
          const hour = parseInt(dateStr.substring(9, 11) || '0')
          const minute = parseInt(dateStr.substring(11, 13) || '0')
          const second = parseInt(dateStr.substring(13, 15) || '0')
          const date = new Date(year, month, day, hour, minute, second)
          currentEvent.endTS = Math.floor(date.getTime() / 1000)
        }
      } else if (line.startsWith('SUMMARY')) {
        currentEvent.title = decodeICSValue(line.split(':')[1] || '')
      } else if (line.startsWith('LOCATION')) {
        currentEvent.location = decodeICSValue(line.split(':')[1] || '')
      } else if (line.startsWith('DESCRIPTION')) {
        currentEvent.description = decodeICSValue(line.split(':')[1] || '')
      } else if (line.startsWith('UID')) {
        currentEvent.importId = line.split(':')[1] || ''
      }
    }
  }

  return events
}

function decodeICSValue(value: string): string {
  // Basic ICS value decoding (handle escaped characters)
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

