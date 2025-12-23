// EventType model - matches Simple Calendar Pro EventType.kt
export interface EventType {
  id?: number | null
  title: string
  color: number
  caldavCalendarId: number
  caldavDisplayName: string
  caldavEmail: string
  type: number // OTHER_EVENT, BIRTHDAY_EVENT, etc.
  createdAt?: string
  updatedAt?: string
}

// Event type categories
export const OTHER_EVENT = 0
export const BIRTHDAY_EVENT = 1
export const ANNIVERSARY_EVENT = 2
export const HOLIDAY_EVENT = 3

export const REGULAR_EVENT_TYPE_ID = 1

export function getDisplayTitle(eventType: EventType): string {
  if (eventType.caldavCalendarId === 0) {
    return eventType.title
  }
  return `${eventType.caldavDisplayName} (${eventType.caldavEmail})`
}

export function isSyncedEventType(eventType: EventType): boolean {
  return eventType.caldavCalendarId !== 0
}

