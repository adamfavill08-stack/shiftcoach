type SlotChar = 'M' | 'A' | 'D' | 'N' | 'O'

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/

type RotaDayEvent = {
  id: string
  title: string
  type: string
  color?: string | null
}

export type RotaDayType = 'morning' | 'afternoon' | 'day' | 'night' | 'off' | null

export type RotaDay = {
  date: string
  dayOfMonth: number
  label: SlotChar | null
  type: RotaDayType
  isToday: boolean
  isCurrentMonth: boolean
  events?: RotaDayEvent[]
}

export type BuildRotaMonthArgs = {
  patternSlots: string[]
  currentShiftIndex: number
  startDate: string
  month: number
  year: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function formatLocalIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalIsoDate(value: string): Date | null {
  const match = ISO_DATE_REGEX.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null
  return new Date(year, month, day)
}

function normaliseSlotChar(value: string | null | undefined): SlotChar | null {
  if (!value) return null
  const char = value.toUpperCase()
  if (char === 'M' || char === 'A' || char === 'D' || char === 'N' || char === 'O') {
    return char
  }
  return null
}

function slotCharToType(slot: SlotChar | null): RotaDayType {
  switch (slot) {
    case 'M':
      return 'morning'
    case 'A':
      return 'afternoon'
    case 'D':
      return 'day'
    case 'N':
      return 'night'
    case 'O':
      return 'off'
    default:
      return null
  }
}

function toStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseIsoDate(value: string): Date | null {
  const parsed = parseLocalIsoDate(value)
  if (!parsed) return null
  return toStartOfDay(parsed)
}

function differenceInCalendarDays(later: Date, earlier: Date): number {
  const startLater = toStartOfDay(later)
  const startEarlier = toStartOfDay(earlier)
  return Math.floor((startLater.getTime() - startEarlier.getTime()) / MS_PER_DAY)
}

function buildEmptyWeeks(month: number, year: number): RotaDay[][] {
  const firstOfMonth = new Date(year, month, 1)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7 // Monday = 0
  const gridStart = new Date(firstOfMonth)
  gridStart.setDate(firstOfMonth.getDate() - firstWeekday)

  const today = toStartOfDay(new Date())

  const weeks: RotaDay[][] = []
  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const week: RotaDay[] = []
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const offset = weekIndex * 7 + dayIndex
      const current = new Date(gridStart)
      current.setDate(gridStart.getDate() + offset)

      const currentStart = toStartOfDay(current)

      week.push({
        date: formatLocalIsoDate(currentStart),
        dayOfMonth: currentStart.getDate(),
        label: null,
        type: null,
        isToday: currentStart.getTime() === today.getTime(),
        isCurrentMonth: currentStart.getMonth() === month,
      })
    }
    weeks.push(week)
  }

  return weeks
}

export function buildMonthFromPattern(args: BuildRotaMonthArgs): RotaDay[][] {
  const { patternSlots, currentShiftIndex, startDate, month, year } = args

  const slots = Array.isArray(patternSlots)
    ? patternSlots
        .map((slot) => normaliseSlotChar(typeof slot === 'string' ? slot : String(slot)))
        .filter((slot): slot is SlotChar => slot !== null)
    : []

  const anchorDate = parseIsoDate(startDate)
  if (!anchorDate) {
    return buildEmptyWeeks(month, year)
  }

  const weeks = buildEmptyWeeks(month, year)

  if (!slots.length) {
    return weeks
  }

  const today = toStartOfDay(new Date())

  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex += 1) {
    const week = weeks[weekIndex]

    for (let dayIndex = 0; dayIndex < week.length; dayIndex += 1) {
      const rotaDay = week[dayIndex]
      const currentDate = parseLocalIsoDate(rotaDay.date) ?? new Date(rotaDay.date)
      const diff = differenceInCalendarDays(currentDate, anchorDate)
      const baseIndex = Number.isFinite(currentShiftIndex) ? currentShiftIndex : 0
      const index = ((baseIndex + diff) % slots.length + slots.length) % slots.length
      const slot = slots[index] ?? null
      const type = slotCharToType(slot)

      week[dayIndex] = {
        date: rotaDay.date,
        dayOfMonth: rotaDay.dayOfMonth,
        label: slot,
        type,
        isToday: currentDate.getTime() === today.getTime(),
        isCurrentMonth: rotaDay.isCurrentMonth,
      }
    }
  }

  return weeks
}
