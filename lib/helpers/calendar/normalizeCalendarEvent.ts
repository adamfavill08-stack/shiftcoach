import type { Attendee, Event } from '@/lib/models/calendar/Event'

function parseJsonArray<T>(value: unknown, fallback: T[]): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string') {
    try {
      const p = JSON.parse(value)
      return Array.isArray(p) ? p : fallback
    } catch {
      return fallback
    }
  }
  return fallback
}

/** Map API / Supabase row (snake_case or camelCase) to Event. */
export function normalizeCalendarEvent(raw: Record<string, unknown> | null | undefined): Event | null {
  if (!raw || typeof raw !== 'object') return null

  const r = raw as Record<string, unknown>
  const startRaw = r.startTS ?? r.start_ts
  const endRaw = r.endTS ?? r.end_ts
  const startTS = typeof startRaw === 'number' ? startRaw : parseInt(String(startRaw ?? 0), 10)
  const endTS = typeof endRaw === 'number' ? endRaw : parseInt(String(endRaw ?? 0), 10)

  return {
    id: (r.id as number) ?? undefined,
    userId: (r.userId ?? r.user_id) as string | undefined,
    startTS: Number.isFinite(startTS) ? startTS : 0,
    endTS: Number.isFinite(endTS) ? endTS : 0,
    title: String(r.title ?? ''),
    location: String(r.location ?? ''),
    description: String(r.description ?? ''),
    reminder1Minutes: (r.reminder1Minutes ?? r.reminder_1_minutes ?? -1) as number,
    reminder2Minutes: (r.reminder2Minutes ?? r.reminder_2_minutes ?? -1) as number,
    reminder3Minutes: (r.reminder3Minutes ?? r.reminder_3_minutes ?? -1) as number,
    reminder1Type: (r.reminder1Type ?? r.reminder_1_type ?? 0) as number,
    reminder2Type: (r.reminder2Type ?? r.reminder_2_type ?? 0) as number,
    reminder3Type: (r.reminder3Type ?? r.reminder_3_type ?? 0) as number,
    repeatInterval: (r.repeatInterval ?? r.repeat_interval ?? 0) as number,
    repeatRule: (r.repeatRule ?? r.repeat_rule ?? 0) as number,
    repeatLimit: (r.repeatLimit ?? r.repeat_limit ?? 0) as number,
    repetitionExceptions: parseJsonArray<string>(r.repetitionExceptions ?? r.repetition_exceptions, []),
    attendees: parseJsonArray<Attendee>(r.attendees, []),
    importId: String(r.importId ?? r.import_id ?? ''),
    timeZone: String(r.timeZone ?? r.time_zone ?? ''),
    flags: (r.flags ?? 0) as number,
    eventType: (r.eventType ?? r.event_type ?? 1) as number,
    parentId: (r.parentId ?? r.parent_id ?? 0) as number,
    lastUpdated: (r.lastUpdated ?? r.last_updated ?? 0) as number,
    source: String(r.source ?? 'simple-calendar'),
    availability: (r.availability ?? 0) as number,
    color: (r.color ?? 0) as number,
    type: (r.type ?? 0) as number,
    createdAt: r.createdAt as string | undefined,
    updatedAt: r.updatedAt as string | undefined,
  }
}
