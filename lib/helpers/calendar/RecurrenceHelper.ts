// RecurrenceHelper - Advanced recurrence logic from Simple Calendar Pro
// Handles complex recurrence patterns and exceptions

import { Event, REPEAT_SAME_DAY, REPEAT_ORDER_WEEKDAY, REPEAT_ORDER_WEEKDAY_USE_LAST, REPEAT_LAST_DAY } from '@/lib/models/calendar/Event'

const DAY = 86400
const WEEK = 604800
const MONTH = 2592000 // Approximate
const YEAR = 31536000 // Approximate

export interface RecurrenceOccurrence {
  startTS: number
  endTS: number
  isException: boolean
}

/**
 * Calculate the next occurrence of a recurring event
 */
export function getNextOccurrence(
  event: Event,
  fromTS: number
): RecurrenceOccurrence | null {
  if (event.repeatInterval === 0) {
    return null
  }

  const duration = event.endTS - event.startTS
  let currentTS = event.startTS

  // Check repeat limit
  if (event.repeatLimit > 0 && fromTS > event.repeatLimit) {
    return null
  }

  // Check exceptions
  const exceptions = event.repetitionExceptions || []
  const fromDayCode = getDayCode(fromTS)

  while (currentTS <= fromTS || exceptions.includes(getDayCode(currentTS))) {
    currentTS = getNextOccurrenceTS(event, currentTS)
    
    // Safety limit
    if (currentTS > fromTS + YEAR * 2) {
      return null
    }
  }

  // Check if we've hit the repeat limit
  if (event.repeatLimit > 0 && currentTS > event.repeatLimit) {
    return null
  }

  return {
    startTS: currentTS,
    endTS: currentTS + duration,
    isException: false,
  }
}

/**
 * Get all occurrences of a recurring event in a date range
 */
export function getOccurrencesInRange(
  event: Event,
  fromTS: number,
  toTS: number
): RecurrenceOccurrence[] {
  if (event.repeatInterval === 0) {
    return []
  }

  const occurrences: RecurrenceOccurrence[] = []
  const exceptions = event.repetitionExceptions || []
  const duration = event.endTS - event.startTS
  let currentTS = event.startTS

  // Start from the first occurrence on or after fromTS
  while (currentTS < fromTS) {
    currentTS = getNextOccurrenceTS(event, currentTS)
    if (currentTS > toTS + YEAR) {
      return []
    }
  }

  // Collect occurrences
  while (currentTS <= toTS) {
    // Check repeat limit
    if (event.repeatLimit > 0 && currentTS > event.repeatLimit) {
      break
    }

    // Skip exceptions
    if (!exceptions.includes(getDayCode(currentTS))) {
      occurrences.push({
        startTS: currentTS,
        endTS: currentTS + duration,
        isException: false,
      })
    }

    currentTS = getNextOccurrenceTS(event, currentTS)

    // Safety limit
    if (occurrences.length > 1000) {
      break
    }
  }

  return occurrences
}

/**
 * Calculate the next occurrence timestamp based on recurrence pattern
 */
function getNextOccurrenceTS(event: Event, currentTS: number): number {
  const interval = event.repeatInterval
  const rule = event.repeatRule
  const date = new Date(currentTS * 1000)

  if (interval === DAY) {
    // Daily: add one day
    date.setDate(date.getDate() + 1)
    return Math.floor(date.getTime() / 1000)
  }

  if (interval === WEEK) {
    // Weekly: add one week
    date.setDate(date.getDate() + 7)
    return Math.floor(date.getTime() / 1000)
  }

  if (interval === MONTH) {
    // Monthly: depends on rule
    if (rule === REPEAT_SAME_DAY) {
      // Same day of month
      date.setMonth(date.getMonth() + 1)
      return Math.floor(date.getTime() / 1000)
    } else if (rule === REPEAT_ORDER_WEEKDAY) {
      // Same weekday (e.g., 1st Monday)
      const dayOfWeek = date.getDay()
      const weekOfMonth = Math.floor((date.getDate() - 1) / 7) + 1
      date.setMonth(date.getMonth() + 1)
      date.setDate(1)
      // Find the nth occurrence of this weekday
      while (date.getDay() !== dayOfWeek) {
        date.setDate(date.getDate() + 1)
      }
      date.setDate(date.getDate() + (weekOfMonth - 1) * 7)
      return Math.floor(date.getTime() / 1000)
    } else if (rule === REPEAT_ORDER_WEEKDAY_USE_LAST) {
      // Last weekday of month
      date.setMonth(date.getMonth() + 1)
      date.setDate(0) // Last day of previous month
      const lastDay = date.getDate()
      const lastDayOfWeek = date.getDay()
      const targetDayOfWeek = new Date(currentTS * 1000).getDay()
      // Find last occurrence of target weekday
      date.setDate(lastDay)
      while (date.getDay() !== targetDayOfWeek && date.getDate() > 0) {
        date.setDate(date.getDate() - 1)
      }
      return Math.floor(date.getTime() / 1000)
    } else if (rule === REPEAT_LAST_DAY) {
      // Last day of month
      date.setMonth(date.getMonth() + 2)
      date.setDate(0) // Last day of month
      return Math.floor(date.getTime() / 1000)
    }
  }

  if (interval === YEAR) {
    // Yearly: depends on rule
    if (rule === REPEAT_SAME_DAY) {
      // Same date
      date.setFullYear(date.getFullYear() + 1)
      return Math.floor(date.getTime() / 1000)
    } else if (rule === REPEAT_ORDER_WEEKDAY) {
      // Same weekday (e.g., 1st Monday of January)
      const month = date.getMonth()
      const dayOfWeek = date.getDay()
      const weekOfMonth = Math.floor((date.getDate() - 1) / 7) + 1
      date.setFullYear(date.getFullYear() + 1)
      date.setMonth(month)
      date.setDate(1)
      while (date.getDay() !== dayOfWeek) {
        date.setDate(date.getDate() + 1)
      }
      date.setDate(date.getDate() + (weekOfMonth - 1) * 7)
      return Math.floor(date.getTime() / 1000)
    }
  }

  // Default: add interval seconds
  return currentTS + interval
}

/**
 * Get day code (YYYYMMdd format)
 */
function getDayCode(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Check if a date is an exception for a recurring event
 */
export function isExceptionDate(event: Event, timestamp: number): boolean {
  const exceptions = event.repetitionExceptions || []
  return exceptions.includes(getDayCode(timestamp))
}

/**
 * Add an exception date to a recurring event
 */
export function addExceptionDate(event: Event, timestamp: number): Event {
  const exceptions = event.repetitionExceptions || []
  const dayCode = getDayCode(timestamp)
  if (!exceptions.includes(dayCode)) {
    return {
      ...event,
      repetitionExceptions: [...exceptions, dayCode],
    }
  }
  return event
}

/**
 * Remove an exception date from a recurring event
 */
export function removeExceptionDate(event: Event, timestamp: number): Event {
  const exceptions = event.repetitionExceptions || []
  const dayCode = getDayCode(timestamp)
  return {
    ...event,
    repetitionExceptions: exceptions.filter(code => code !== dayCode),
  }
}

/**
 * Get recurrence summary text
 */
export function getRecurrenceSummary(event: Event): string {
  if (event.repeatInterval === 0) {
    return 'Does not repeat'
  }

  const interval = event.repeatInterval
  const rule = event.repeatRule

  if (interval === DAY) {
    return 'Daily'
  }

  if (interval === WEEK) {
    return 'Weekly'
  }

  if (interval === MONTH) {
    if (rule === REPEAT_SAME_DAY) {
      return 'Monthly (same day)'
    } else if (rule === REPEAT_ORDER_WEEKDAY) {
      return 'Monthly (same weekday)'
    } else if (rule === REPEAT_ORDER_WEEKDAY_USE_LAST) {
      return 'Monthly (last weekday)'
    } else if (rule === REPEAT_LAST_DAY) {
      return 'Monthly (last day)'
    }
    return 'Monthly'
  }

  if (interval === YEAR) {
    if (rule === REPEAT_SAME_DAY) {
      return 'Yearly (same date)'
    } else if (rule === REPEAT_ORDER_WEEKDAY) {
      return 'Yearly (same weekday)'
    }
    return 'Yearly'
  }

  return 'Custom'
}

