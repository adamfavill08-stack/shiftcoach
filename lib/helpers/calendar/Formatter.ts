// Formatter - matches Simple Calendar Pro Formatter.kt
import { format as dateFnsFormat, parse } from 'date-fns'

export const DAYCODE_PATTERN = 'yyyyMMdd'
export const YEAR_PATTERN = 'yyyy'
export const TIME_PATTERN = 'HHmmss'

// Get day code from date (YYYYMMdd format)
export function getDayCodeFromDateTime(date: Date): string {
  return dateFnsFormat(date, DAYCODE_PATTERN)
}

// Get date from day code
export function getDateTimeFromCode(dayCode: string): Date {
  return parse(dayCode, DAYCODE_PATTERN, new Date())
}

// Get date from timestamp (seconds)
export function getDateTimeFromTS(ts: number): Date {
  return new Date(ts * 1000)
}

// Get day code from timestamp
export function getDayCodeFromTS(ts: number): string {
  return getDayCodeFromDateTime(getDateTimeFromTS(ts))
}

// Get today's day code
export function getTodayCode(): string {
  return getDayCodeFromDateTime(new Date())
}

// Get current time in seconds (Unix timestamp)
export function getNowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

// Get month name (simplified - you may want to add localization)
export function getMonthName(monthIndex: number): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  if (monthIndex >= 1 && monthIndex <= 12) {
    return monthNames[monthIndex - 1]
  }
  return ''
}

// Re-export format from date-fns for convenience
export { format } from 'date-fns'

