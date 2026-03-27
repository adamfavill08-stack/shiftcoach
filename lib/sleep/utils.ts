import type { SleepQuality, SleepType } from './types'

export function getShiftedDayKey(dateInput: string | Date, shiftStartHour = 7): string {
  const date = new Date(dateInput)
  const shifted = new Date(date)
  shifted.setHours(shiftStartHour, 0, 0, 0)

  if (date.getHours() < shiftStartHour) {
    shifted.setDate(shifted.getDate() - 1)
  }

  return shifted.toISOString().slice(0, 10)
}

export function minutesBetween(startAt: string | Date, endAt: string | Date): number {
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.round((end - start) / 60000)
}

export function isPrimarySleepType(type: SleepType): boolean {
  return type === 'main_sleep' || type === 'post_shift_sleep' || type === 'recovery_sleep'
}

export function getSleepTypeLabel(type: SleepType | string): string {
  switch (type) {
    case 'main_sleep':
      return 'Main sleep'
    case 'post_shift_sleep':
      return 'Post-shift sleep'
    case 'recovery_sleep':
      return 'Recovery sleep'
    case 'nap':
      return 'Nap'
    default:
      return 'Sleep'
  }
}

export function qualityLabelToNumber(
  value: 'Excellent' | 'Good' | 'Fair' | 'Poor'
): SleepQuality {
  switch (value) {
    case 'Excellent':
      return 5
    case 'Good':
      return 4
    case 'Fair':
      return 3
    case 'Poor':
      return 2
  }
}

export function qualityNumberToLabel(value: number | null | undefined): string {
  switch (value) {
    case 5:
      return 'Excellent'
    case 4:
      return 'Good'
    case 3:
      return 'Fair'
    case 2:
      return 'Poor'
    case 1:
      return 'Very poor'
    default:
      return 'Fair'
  }
}
