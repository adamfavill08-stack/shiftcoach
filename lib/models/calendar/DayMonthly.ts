// DayMonthly model - matches Simple Calendar Pro DayMonthly.kt
import { Event } from './Event'

export interface DayMonthly {
  value: number // Day of month (1-31)
  isThisMonth: boolean
  isToday: boolean
  code: string // YYYYMMdd format
  weekOfYear: number
  dayEvents: Event[]
  indexOnMonthView: number // 0-41 (42 days total)
  isWeekend: boolean
  date: Date
}

