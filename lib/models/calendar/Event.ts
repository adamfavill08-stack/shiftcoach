// Event model - matches Simple Calendar Pro Event.kt
export interface Event {
  id?: number | null
  userId?: string
  startTS: number // Unix timestamp in seconds
  endTS: number
  title: string
  location: string
  description: string
  
  // Reminders
  reminder1Minutes: number // -1 = REMINDER_OFF
  reminder2Minutes: number
  reminder3Minutes: number
  reminder1Type: number // 0 = REMINDER_NOTIFICATION
  reminder2Type: number
  reminder3Type: number
  
  // Recurrence
  repeatInterval: number // 0 = no repeat
  repeatRule: number // REPEAT_SAME_DAY, REPEAT_ORDER_WEEKDAY, etc.
  repeatLimit: number // 0 = no limit
  repetitionExceptions: string[] // Array of day codes (YYYYMMdd)
  
  // Attendees
  attendees: Attendee[]
  
  // Metadata
  importId: string
  timeZone: string
  flags: number // FLAG_ALL_DAY, FLAG_IS_IN_PAST, etc.
  eventType: number // References event_types.id
  parentId: number // For recurring event instances
  lastUpdated: number
  source: string // 'simple-calendar', 'imported-ics', 'caldav', etc.
  availability: number
  color: number
  type: number // TYPE_EVENT = 0, TYPE_TASK = 1
  
  createdAt?: string
  updatedAt?: string
}

export interface Attendee {
  contactId: number
  name: string
  email: string
  status: number // ATTENDEE_STATUS_ACCEPTED, etc.
  photoUri: string
  isMe: boolean
  relationship: number
}

export interface Reminder {
  minutes: number
  type: number
}

// Event flags
export const FLAG_ALL_DAY = 1
export const FLAG_IS_IN_PAST = 2
export const FLAG_MISSING_YEAR = 4
export const FLAG_TASK_COMPLETED = 8

// Event types
export const TYPE_EVENT = 0
export const TYPE_TASK = 1

// Reminder constants
export const REMINDER_OFF = -1
export const REMINDER_NOTIFICATION = 0
export const REMINDER_EMAIL = 1

// Repeat rules
export const REPEAT_SAME_DAY = 1
export const REPEAT_ORDER_WEEKDAY_USE_LAST = 2
export const REPEAT_LAST_DAY = 3
export const REPEAT_ORDER_WEEKDAY = 4

// Sources
export const SOURCE_SIMPLE_CALENDAR = 'simple-calendar'
export const SOURCE_IMPORTED_ICS = 'imported-ics'
export const SOURCE_CONTACT_BIRTHDAY = 'contact-birthday'
export const SOURCE_CONTACT_ANNIVERSARY = 'contact-anniversary'
export const SOURCE_CALDAV = 'caldav'

// Helper functions
export function isAllDay(event: Event): boolean {
  return (event.flags & FLAG_ALL_DAY) !== 0
}

export function isTask(event: Event): boolean {
  return event.type === TYPE_TASK
}

export function isTaskCompleted(event: Event): boolean {
  return isTask(event) && (event.flags & FLAG_TASK_COMPLETED) !== 0
}

export function isPastEvent(event: Event): boolean {
  return (event.flags & FLAG_IS_IN_PAST) !== 0
}

export function getReminders(event: Event): Reminder[] {
  const reminders: Reminder[] = []
  if (event.reminder1Minutes !== REMINDER_OFF) {
    reminders.push({ minutes: event.reminder1Minutes, type: event.reminder1Type })
  }
  if (event.reminder2Minutes !== REMINDER_OFF) {
    reminders.push({ minutes: event.reminder2Minutes, type: event.reminder2Type })
  }
  if (event.reminder3Minutes !== REMINDER_OFF) {
    reminders.push({ minutes: event.reminder3Minutes, type: event.reminder3Type })
  }
  return reminders
}

