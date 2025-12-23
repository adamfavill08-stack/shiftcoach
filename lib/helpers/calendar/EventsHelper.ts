// EventsHelper - matches Simple Calendar Pro EventsHelper.kt
// Core event query and manipulation logic

import { Event } from '@/lib/models/calendar/Event'
import { getOccurrencesInRange } from './RecurrenceHelper'
import { EventType } from '@/lib/models/calendar/EventType'
import { format, getDayCodeFromDateTime, getDateTimeFromTS, getNowSeconds } from '@/lib/helpers/calendar/Formatter'
import { addDays, addMonths, addYears, startOfMonth, endOfMonth, getDate, getDay } from 'date-fns'
import { 
  TYPE_EVENT, 
  TYPE_TASK, 
  SOURCE_SIMPLE_CALENDAR, 
  SOURCE_IMPORTED_ICS,
  FLAG_IS_IN_PAST
} from '@/lib/models/calendar/Event'
import { REGULAR_EVENT_TYPE_ID } from '@/lib/models/calendar/EventType'

// Get events in date range (handles both one-time and recurring events)
export async function getEventsInRange(
  fromTS: number,
  toTS: number,
  eventTypeIds?: number[],
  type?: 'event' | 'task',
  searchQuery?: string
): Promise<Event[]> {
  try {
    const params = new URLSearchParams({
      fromTS: fromTS.toString(),
      toTS: toTS.toString(),
    })
    
    if (eventTypeIds && eventTypeIds.length > 0) {
      params.append('eventTypeIds', eventTypeIds.join(','))
    }
    
    if (type) {
      params.append('type', type)
    }
    
    if (searchQuery) {
      params.append('search', searchQuery)
    }

    const response = await fetch(`/api/calendar/events?${params.toString()}`)
    if (!response.ok) {
      // In dev or when not signed in we don't want to break the UI – log and return no events.
      let preview: string | undefined
      let errorDetail: any = undefined
      try {
        preview = await response.text()
        try {
          errorDetail = JSON.parse(preview)
        } catch {
          // Not JSON, keep as text
        }
      } catch {
        preview = undefined
      }
      // Don't log 401 errors - they're expected when user isn't signed in
      if (response.status !== 401) {
        // Only log if we have meaningful error information
        const hasErrorInfo = preview || errorDetail?.error || errorDetail?.detail
        if (hasErrorInfo) {
          const errorInfo: Record<string, any> = {
            status: response.status,
            statusText: response.statusText || 'Unknown',
          }
          if (preview) errorInfo.preview = preview.slice(0, 200)
          if (errorDetail?.error) errorInfo.error = errorDetail.error
          if (errorDetail?.detail) errorInfo.detail = errorDetail.detail
          // Only log if errorInfo has at least status and statusText (not empty)
          if (errorInfo.status !== undefined && errorInfo.statusText) {
            console.error('[EventsHelper] Failed to fetch events', errorInfo)
          }
        } else if (response.status && response.statusText) {
          // Log minimal info if no detailed error available, but only if we have status info
          console.error('[EventsHelper] Failed to fetch events', {
            status: response.status,
            statusText: response.statusText,
          })
        }
        // If we have no meaningful info at all, silently return (don't log empty objects)
      }
      return []
    }
    
    const data = await response.json().catch(() => null)
    return (data && Array.isArray(data.events)) ? data.events : []
  } catch (error) {
    // Only log if it's not a network error or auth error (these are expected in some cases)
    if (error instanceof TypeError && error.message?.includes('fetch')) {
      // Network error - likely offline or CORS issue, silently return empty
      return []
    }
    // Only log if we have meaningful error information
    if (error instanceof Error && error.message) {
      // Don't log empty errors or 401-related errors
      if (error.message.includes('Unauthorized') || error.message.includes('401')) {
        return []
      }
      console.error('[EventsHelper] Error fetching events:', error.message)
    } else if (error && typeof error === 'object' && Object.keys(error).length > 0) {
      // Only log if the error object has properties
      const errorStr = JSON.stringify(error)
      if (!errorStr.includes('401') && !errorStr.includes('Unauthorized')) {
        console.error('[EventsHelper] Error fetching events:', error)
      }
    }
    // Silently return empty array for any other errors (empty objects, null, undefined, etc.)
    // Never log empty objects - they provide no useful information
    return []
  }
}

// Get one-time events in range
export async function getOneTimeEventsInRange(
  fromTS: number,
  toTS: number,
  eventTypeIds?: number[]
): Promise<Event[]> {
  const events = await getEventsInRange(fromTS, toTS, eventTypeIds, 'event')
  return events.filter(e => e.repeatInterval === 0)
}

// Get recurring events that might occur in range
export async function getRecurringEventsInRange(
  toTS: number,
  eventTypeIds?: number[]
): Promise<Event[]> {
  const events = await getEventsInRange(0, toTS, eventTypeIds, 'event')
  return events.filter(e => e.repeatInterval !== 0)
}

// Expand recurring events to show occurrences in date range
export function expandRecurringEvents(
  recurringEvents: Event[],
  fromTS: number,
  toTS: number
): Event[] {
  const occurrences: Event[] = []
  const now = getNowSeconds()

  for (const event of recurringEvents) {
    if (!event.id) continue

    let currentEvent = { ...event }
    let occurrenceTS = event.startTS
    let occurrenceCount = 0
    const maxOccurrences = 1000 // Safety limit

    // Check repeat limit
    const hasLimit = event.repeatLimit > 0
    const limitTS = event.repeatLimit

    while (occurrenceTS <= toTS && occurrenceCount < maxOccurrences) {
      // Check if we've hit the repeat limit
      if (hasLimit && occurrenceTS > limitTS) {
        break
      }

      // Check if this occurrence is in the date range
      if (occurrenceTS >= fromTS || (event.endTS >= fromTS && occurrenceTS <= toTS)) {
        // Check if this day is an exception
        const dayCode = format(getDateTimeFromTS(occurrenceTS), 'yyyyMMdd')
        if (!event.repetitionExceptions.includes(dayCode)) {
          const occurrence = {
            ...currentEvent,
            id: undefined, // Occurrence doesn't have its own ID
            parentId: event.id,
            startTS: occurrenceTS,
            endTS: occurrenceTS + (event.endTS - event.startTS),
          }
          
          // Update past event flag
          occurrence.flags = occurrence.flags & ~FLAG_IS_IN_PAST
          if (occurrence.endTS < now) {
            occurrence.flags = occurrence.flags | FLAG_IS_IN_PAST
          }

          occurrences.push(occurrence)
        }
      }

      // Move to next occurrence
      if (event.repeatInterval > 0) {
        currentEvent = addIntervalTime(currentEvent, event)
        occurrenceTS = currentEvent.startTS
      } else {
        break
      }

      occurrenceCount++
    }
  }

  return occurrences
}

// Add interval time to event (for recurring events)
function addIntervalTime(event: Event, original: Event): Event {
  const DAY = 86400
  const WEEK = 604800
  const MONTH = 2592001
  const YEAR = 31536000

  const oldStart = getDateTimeFromTS(event.startTS)
  let newStart = oldStart

  if (event.repeatInterval === DAY) {
    newStart = addDays(oldStart, 1)
  } else if (event.repeatInterval % YEAR === 0) {
    // Yearly recurrence
    if (event.repeatRule === 4) { // REPEAT_ORDER_WEEKDAY
      newStart = addXthDayInterval(oldStart, original, false)
    } else if (event.repeatRule === 2) { // REPEAT_ORDER_WEEKDAY_USE_LAST
      newStart = addXthDayInterval(oldStart, original, true)
    } else {
      newStart = addYearsWithSameDay(oldStart, event.repeatInterval / YEAR)
    }
  } else if (event.repeatInterval % MONTH === 0) {
    // Monthly recurrence
    if (event.repeatRule === 1) { // REPEAT_SAME_DAY
      newStart = addMonthsWithSameDay(oldStart, original)
    } else if (event.repeatRule === 4) { // REPEAT_ORDER_WEEKDAY
      newStart = addXthDayInterval(oldStart, original, false)
    } else if (event.repeatRule === 2) { // REPEAT_ORDER_WEEKDAY_USE_LAST
      newStart = addXthDayInterval(oldStart, original, true)
    } else if (event.repeatRule === 3) { // REPEAT_LAST_DAY
      newStart = addMonths(oldStart, event.repeatInterval / MONTH)
      // Set to last day of month
      const lastDay = new Date(newStart.getFullYear(), newStart.getMonth() + 1, 0).getDate()
      newStart = new Date(newStart.getFullYear(), newStart.getMonth(), lastDay)
    } else {
      newStart = addMonths(oldStart, event.repeatInterval / MONTH)
    }
  } else if (event.repeatInterval % WEEK === 0) {
    // Weekly recurrence
    newStart = addDays(oldStart, 7 * (event.repeatInterval / WEEK))
  } else {
    // Custom interval in seconds
    newStart = new Date(oldStart.getTime() + (event.repeatInterval * 1000))
  }

  const newStartTS = Math.floor(newStart.getTime() / 1000)
  const newEndTS = newStartTS + (event.endTS - event.startTS)

  return {
    ...event,
    startTS: newStartTS,
    endTS: newEndTS,
  }
}

// Helper functions for date manipulation (using date-fns)

function addYearsWithSameDay(date: Date, years: number): Date {
  let result = addYears(date, years)
  // Handle leap year edge case (Feb 29)
  if (date.getMonth() === 1 && getDate(date) === 29) {
    const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
    if (!isLeapYear(result.getFullYear())) {
      result = new Date(result.getFullYear(), 1, 28) // Use Feb 28 in non-leap years
    }
  }
  return result
}

function addMonthsWithSameDay(date: Date, original: Event): Date {
  let result = addMonths(date, 1)
  const originalDate = getDateTimeFromTS(original.startTS)
  const originalDay = getDate(originalDate)
  
  // Try to keep same day, but handle months with fewer days
  const maxDay = getDate(endOfMonth(result))
  const targetDay = Math.min(originalDay, maxDay)
  result = new Date(result.getFullYear(), result.getMonth(), targetDay)
  
  return result
}

function addXthDayInterval(date: Date, original: Event, forceLastWeekday: boolean): Date {
  // Handle "nth weekday" patterns (e.g., "3rd Monday of month")
  const dayOfWeek = getDay(date) === 0 ? 7 : getDay(date) // Convert Sunday (0) to 7
  const dayOfMonth = getDate(date)
  const weekNumber = Math.floor((dayOfMonth - 1) / 7)
  
  // Move to next month
  let nextMonth = startOfMonth(addMonths(date, 1))
  
  // Find the first occurrence of this weekday in next month
  const firstDayOfWeek = getDay(nextMonth) === 0 ? 7 : getDay(nextMonth)
  const daysToAdd = (dayOfWeek - firstDayOfWeek + 7) % 7
  nextMonth = addDays(nextMonth, daysToAdd)
  
  // Add the week offset
  if (forceLastWeekday && (weekNumber === 3 || weekNumber === 4)) {
    // Use last occurrence
    const lastDayOfMonth = endOfMonth(nextMonth)
    let lastDay = lastDayOfMonth
    const lastDayOfWeek = getDay(lastDay) === 0 ? 7 : getDay(lastDay)
    const daysToSubtract = (lastDayOfWeek - dayOfWeek + 7) % 7
    lastDay = addDays(lastDay, -daysToSubtract)
    return lastDay
  } else {
    // Use nth occurrence
    return addDays(nextMonth, weekNumber * 7)
  }
}

// Get events for a specific day
export async function getEventsForDay(
  dayCode: string, // YYYYMMdd format
  eventTypeIds?: number[]
): Promise<Event[]> {
  const dayStart = getDayStartTS(dayCode)
  const dayEnd = getDayEndTS(dayCode)
  
  // Get one-time events
  const oneTimeEvents = await getOneTimeEventsInRange(dayStart, dayEnd, eventTypeIds)
  
  // Get recurring events and expand them
  const recurringEvents = await getRecurringEventsInRange(dayEnd, eventTypeIds)
  const expandedRecurring = expandRecurringEvents(recurringEvents, dayStart, dayEnd)
  
  // Combine and filter to only events that occur on this day
  const allEvents = [...oneTimeEvents, ...expandedRecurring]
  
  return allEvents.filter(event => {
    const eventStart = getDateTimeFromTS(event.startTS)
    const eventEnd = getDateTimeFromTS(event.endTS)
    const dayDate = getDateTimeFromTS(dayStart)
    
    // Check if event overlaps with this day
    return (
      format(eventStart, 'yyyyMMdd') === dayCode ||
      format(eventEnd, 'yyyyMMdd') === dayCode ||
      (eventStart <= dayDate && eventEnd >= dayDate)
    )
  })
}

// Helper functions for day codes
function getDayStartTS(dayCode: string): number {
  const year = parseInt(dayCode.substring(0, 4))
  const month = parseInt(dayCode.substring(4, 6)) - 1
  const day = parseInt(dayCode.substring(6, 8))
  const date = new Date(year, month, day, 0, 0, 0)
  return Math.floor(date.getTime() / 1000)
}

function getDayEndTS(dayCode: string): number {
  const year = parseInt(dayCode.substring(0, 4))
  const month = parseInt(dayCode.substring(4, 6)) - 1
  const day = parseInt(dayCode.substring(6, 8))
  const date = new Date(year, month, day, 23, 59, 59)
  return Math.floor(date.getTime() / 1000)
}

// Create event
export async function createEvent(event: Partial<Event>): Promise<Event | null> {
  try {
    const response = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
    
    if (!response.ok) {
      throw new Error('Failed to create event')
    }
    
    const data = await response.json()
    return data.event
  } catch (error) {
    console.error('Error creating event:', error)
    return null
  }
}

// Update event
export async function updateEvent(eventId: number, event: Partial<Event>): Promise<Event | null> {
  try {
    const response = await fetch(`/api/calendar/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
    
    if (!response.ok) {
      throw new Error('Failed to update event')
    }
    
    const data = await response.json()
    return data.event
  } catch (error) {
    console.error('Error updating event:', error)
    return null
  }
}

// Delete event
export async function deleteEvent(eventId: number): Promise<boolean> {
  try {
    const response = await fetch(`/api/calendar/events/${eventId}`, {
      method: 'DELETE',
    })
    
    return response.ok
  } catch (error) {
    console.error('Error deleting event:', error)
    return false
  }
}

// Get event types
export async function getEventTypes(): Promise<EventType[]> {
  try {
    const response = await fetch('/api/calendar/event-types')
    if (!response.ok) {
      throw new Error('Failed to fetch event types')
    }
    
    const data = await response.json()
    return data.eventTypes || []
  } catch (error) {
    console.error('Error fetching event types:', error)
    return []
  }
}

