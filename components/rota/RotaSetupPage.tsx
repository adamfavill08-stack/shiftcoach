'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { CalendarDays, Upload, Settings, Wand2 } from 'lucide-react'
import {
  DEFAULT_SHIFT_COLORS,
  getActiveShiftColors,
  saveActiveShiftColors,
  type ShiftColorConfig,
} from '@/lib/data/shiftColors'
import { applyRotaPattern } from '@/lib/rota/applyPattern'
import { PATTERN_SEQUENCES, getPatternCycle } from '@/lib/rota/patternCatalog'
import AddActionFab from '@/components/rota/AddActionFab'
import ShiftPatternSet, { type ShiftPatternSummary } from '@/components/rota/ShiftPatternSet'
import {
  PATTERNS_BY_LENGTH as SHARED_PATTERNS_BY_LENGTH,
  getPatternDescription,
  type ShiftLength,
  type ShiftPattern as PresetBase,
} from '@/lib/rota/patternPresets'

const TABS = [
  { id: 'presets', label: 'Presets', icon: Wand2 },
  { id: 'custom', label: 'Custom pattern', icon: Settings },
  { id: 'import', label: 'Import / photo', icon: Upload },
  { id: 'labels', label: 'Colors & labels', icon: CalendarDays },
] as const

type ColorPreset = {
  id: string
  label: string
  value: string
}

const COLOR_PRESETS: ColorPreset[] = [
  { id: 'blue', label: 'Blue', value: '#2563EB' },
  { id: 'red', label: 'Red', value: '#EF4444' },
  { id: 'green', label: 'Green', value: '#22C55E' },
  { id: 'yellow', label: 'Yellow', value: '#FACC15' },
  { id: 'purple', label: 'Purple', value: '#A855F7' },
  { id: 'teal', label: 'Teal', value: '#06B6D4' },
  { id: 'white', label: 'White', value: '#FFFFFF' },
]

type StoredPattern = {
  patternId: string
  startDate: string
  startSlotIndex: number
  colors: ShiftColorConfig
}

type ShiftSlotType = 'day' | 'night' | 'off' | 'other'
type ShiftSlot = { type: ShiftSlotType }

type PatternAlignment = {
  startDate: string
  startSlotIndex: number
  patternId?: string
}

type PatternSummary = {
  id: string
  name: string
  cycleDescription?: string
  lengthLabel?: string
  startDate?: string
}

type TabId = (typeof TABS)[number]['id']

type CalendarDay = {
  date: string
  dayNumber: number
  shiftType: ShiftSlotType | null
  tag?: string | null
}

function toIsoDate(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)
}

function generateMonthDays(month: Date): CalendarDay[] {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, monthIndex, index + 1)
    return {
      date: toIsoDate(date),
      dayNumber: index + 1,
      shiftType: null,
      tag: null,
    }
  })
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function mapSupabaseShift(value: string | null): ShiftSlotType | null {
  if (!value) return null

  switch (value) {
    case 'day':
    case 'night':
    case 'off':
      return value
    case 'other':
    case 'custom':
      return 'other'
    default:
      return null
  }
}

const patternSlotsMap: Record<string, ShiftSlot[]> = (() => {
  const entries = Object.entries(PATTERN_SEQUENCES).map(([key, sequence]) => [
    key,
    sequence.map((type) => ({ type } as ShiftSlot)),
  ])

  const hasDefault = entries.some(([key]) => key === 'default')
  if (!hasDefault) {
    entries.push([
      'default',
      [
        { type: 'day' },
        { type: 'night' },
        { type: 'off' },
      ],
    ])
  }

  return Object.fromEntries(entries)
})()

const getPatternSlots = (patternId: string): ShiftSlot[] =>
  (patternSlotsMap[patternId] ?? patternSlotsMap.default).map((slot) => ({ ...slot }))

type PresetPattern = PresetBase & {
  length: ShiftLength
  slots: ShiftSlot[]
}

const PRESET_PATTERNS_BY_LENGTH: Record<ShiftLength, PresetPattern[]> = Object.fromEntries(
  (Object.entries(SHARED_PATTERNS_BY_LENGTH) as [ShiftLength, PresetBase[]][]).map(([length, patterns]) => [
    length,
    patterns.map((pattern) => ({
      ...pattern,
      length,
      slots: getPatternSlots(pattern.id),
    })),
  ]),
)

const PRESET_MAP: Record<string, PresetPattern> = Object.fromEntries(
  Object.values(PRESET_PATTERNS_BY_LENGTH)
    .flat()
    .map((pattern) => [pattern.id, pattern]),
)

const SHIFT_LENGTHS: ShiftLength[] = ['8h', '12h', '16h']

export function RotaSetupPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const today = useMemo(() => new Date(), [])
  const todayISO = useMemo(() => today.toISOString().slice(0, 10), [today])

  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => startOfMonth(today))
  const [activeTab, setActiveTab] = useState<TabId>('presets')
  const [activePattern, setActivePattern] = useState<PresetPattern | null>(null)
  const [selectedPattern, setSelectedPattern] = useState<PresetPattern | null>(null)
  const [showColorModal, setShowColorModal] = useState(false)
  const [shiftColors, setShiftColors] = useState<ShiftColorConfig>(DEFAULT_SHIFT_COLORS)
  const [days, setDays] = useState<CalendarDay[]>([])
  const [patternSlots, setPatternSlots] = useState<ShiftSlot[]>([])
  const [patternAlignment, setPatternAlignment] = useState<PatternAlignment>({
    startDate: todayISO,
    startSlotIndex: 0,
    patternId: undefined,
  })
  const [storedPattern, setStoredPattern] = useState<StoredPattern | null>(null)
  const [activePatternSummary, setActivePatternSummary] = useState<PatternSummary | null>(null)
  const [isEditingPattern, setIsEditingPattern] = useState(false)
  const [showHolidayPlaceholder, setShowHolidayPlaceholder] = useState(false)
  const [showTaskPlaceholder, setShowTaskPlaceholder] = useState(false)

  const loadMonthDays = useCallback(
    async (targetDate: Date) => {
      const base = generateMonthDays(targetDate)

      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error || !user) {
          setDays(base)
          return
        }

        const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
        const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)
        const startIso = toIsoDate(monthStart)
        const endIso = toIsoDate(monthEnd)

        const { data, error: rotaError } = await supabase
          .from('rota_days')
          .select('date, shift_type')
          .eq('user_id', user.id)
          .gte('date', startIso)
          .lte('date', endIso)
          .order('date', { ascending: true })

        if (rotaError) {
          const message = typeof rotaError.message === 'string' ? rotaError.message.trim() : ''
          if (message && !message.includes('relation')) {
            console.error('[RotaSetup] loadMonthDays rota error', rotaError)
          }
          setDays(base)
          return
        }

        const shiftEntries = (data ?? [])
          .map((entry) => [entry.date, mapSupabaseShift(entry.shift_type)] as const)
          .filter(([, value]) => value !== null) as Array<[string, ShiftSlotType]>

        const shiftMap = new Map<string, ShiftSlotType>(shiftEntries)

        if (shiftMap.size === 0 && patternAlignment.patternId) {
          const fallbackSlots = getPatternSlots(patternAlignment.patternId)
          const alignmentStart = patternAlignment.startDate ?? toIsoDate(targetDate)
          const startTime = new Date(`${alignmentStart}T00:00:00`).getTime()
          const msPerDay = 24 * 60 * 60 * 1000

          setDays(
            base.map((day) => {
              const currentTime = new Date(`${day.date}T00:00:00`).getTime()
              if (Number.isNaN(currentTime) || Number.isNaN(startTime)) {
                return { ...day, shiftType: null }
              }
              const diffDays = Math.floor((currentTime - startTime) / msPerDay)
              if (diffDays < 0) {
                return { ...day, shiftType: null }
              }
              const slotIndex = ((patternAlignment.startSlotIndex + diffDays) % fallbackSlots.length + fallbackSlots.length) % fallbackSlots.length
              return {
                ...day,
                shiftType: fallbackSlots[slotIndex]?.type ?? null,
              }
            }),
          )
        } else {
          setDays(
            base.map((day) => ({
              ...day,
              shiftType: shiftMap.get(day.date) ?? null,
            })),
          )
        }
      } catch (err) {
        console.error('[RotaSetup] loadMonthDays error', err)
        setDays(base)
      }
    },
    [patternAlignment.patternId, patternAlignment.startDate, patternAlignment.startSlotIndex, supabase],
  )

  const loadStoredPattern = useCallback(async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        setStoredPattern(null)
        setActivePatternSummary(null)
        setIsEditingPattern(false)
        return
      }

      const { data, error: patternError } = await supabase
        .from('rota_patterns')
        .select('pattern_id, start_date, start_slot_index, color_config')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (patternError) {
        const message = typeof patternError.message === 'string' ? patternError.message.trim() : ''
        if (message && !message.includes('relation')) {
          console.error('[RotaSetup] loadStoredPattern error', patternError)
        }
        setStoredPattern(null)
        setActivePatternSummary(null)
        setIsEditingPattern(false)
        return
      }

      if (!data) {
        setStoredPattern(null)
        setActivePatternSummary(null)
        setIsEditingPattern(false)
        return
      }

      const mergedColors: ShiftColorConfig = {
        ...DEFAULT_SHIFT_COLORS,
        ...((data.color_config as Partial<ShiftColorConfig> | null) ?? {}),
      }

      setShiftColors(mergedColors)

      const startDate = data.start_date ?? todayISO
      const startSlotIndex = data.start_slot_index ?? 0

      setStoredPattern({
        patternId: data.pattern_id,
        startDate,
        startSlotIndex,
        colors: mergedColors,
      })

      setPatternAlignment({ startDate, startSlotIndex, patternId: data.pattern_id ?? undefined })

      const patternDef = PRESET_MAP[data.pattern_id]
      if (patternDef) {
        setActivePattern(patternDef)
        setPatternSlots(patternDef.slots.map((slot) => ({ ...slot })))
        setSelectedPattern(patternDef)
        setActivePatternSummary({
          id: patternDef.id,
          name: patternDef.label,
          cycleDescription: getPatternDescription(patternDef.id),
          lengthLabel: patternDef.length,
          startDate,
        })
        setIsEditingPattern(false)
      } else {
        setActivePatternSummary({
          id: data.pattern_id,
          name: data.pattern_id,
          startDate,
        })
        setSelectedPattern(null)
      }
    } catch (err) {
      console.error('[RotaSetup] loadStoredPattern fatal error', err)
      setStoredPattern(null)
      setActivePatternSummary(null)
      setIsEditingPattern(false)
    }
  }, [supabase, todayISO])

  const handleDayClick = (day: CalendarDay) => {
    setDays((prev) =>
      prev.map((entry) =>
        entry.date === day.date
          ? {
              ...entry,
              shiftType:
                entry.shiftType === 'day'
                  ? 'night'
                  : entry.shiftType === 'night'
                  ? 'off'
                  : entry.shiftType === 'off'
                  ? 'other'
                  : 'day',
            }
          : entry,
      ),
    )
  }

  useEffect(() => {
    const loadColors = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error || !user) {
          console.error('[RotaSetup] loadColors auth error', error)
          return
        }

        const colors = await getActiveShiftColors(supabase, user.id)
        setShiftColors(colors)
      } catch (err) {
        console.error('[RotaSetup] failed to load active colours', err)
      }
    }

    loadColors()
  }, [supabase])

  useEffect(() => {
    loadMonthDays(currentMonthDate)
    setPatternAlignment((prev) => ({
      startDate: prev.startDate || todayISO,
      startSlotIndex: prev.startSlotIndex ?? 0,
      patternId: prev.patternId,
    }))
  }, [currentMonthDate, loadMonthDays, todayISO])

  useEffect(() => {
    loadStoredPattern()
  }, [loadStoredPattern])

  const applyPatternToCalendar = (slots: ShiftSlot[], alignment: PatternAlignment) => {
    if (!slots.length) {
      setDays((prev) => prev.map((day) => ({ ...day, shiftType: null })))
      return
    }

    const startTime = new Date(alignment.startDate + 'T00:00:00').getTime()
    const msPerDay = 24 * 60 * 60 * 1000

    setDays((prev) =>
      prev.map((day) => {
        const currentTime = new Date(day.date + 'T00:00:00').getTime()
        if (Number.isNaN(currentTime) || Number.isNaN(startTime)) {
          return { ...day, shiftType: null }
        }

        const diffDays = Math.floor((currentTime - startTime) / msPerDay)
        if (diffDays < 0) {
          return { ...day, shiftType: null }
        }
        const len = slots.length
        const slotIndex = ((alignment.startSlotIndex + diffDays) % len + len) % len
        return { ...day, shiftType: slots[slotIndex].type }
      }),
    )
  }

  const handlePresetClick = async (pattern: PresetPattern) => {
    console.log('[rota] preset clicked', pattern.id)
    const slots = (pattern.slots.length ? pattern.slots : getPatternSlots(pattern.id)).map((slot) => ({ ...slot }))
    setPatternSlots(slots)

    const alignment: PatternAlignment = {
      startDate: todayISO,
      startSlotIndex: 0,
      patternId: pattern.id,
    }
    applyPatternToCalendar(slots, alignment)
    setPatternAlignment(alignment)
    const resolvedPattern = PRESET_MAP[pattern.id] ?? pattern
    setActivePattern(resolvedPattern)
    setSelectedPattern(resolvedPattern)
    setIsEditingPattern(true)

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        console.error('[RotaSetup] no user for color prefs', authError)
        setShiftColors(DEFAULT_SHIFT_COLORS)
        setShowColorModal(true)
        return
      }

      const colors = await getActiveShiftColors(supabase, user.id)
      setShiftColors(colors)
    } catch (err) {
      console.error('[RotaSetup] failed to load color prefs', err)
      setShiftColors(DEFAULT_SHIFT_COLORS)
    }

    setShowColorModal(true)
  }

  const handleSaveColors = async (payload: {
    colors: ShiftColorConfig
    startDate: string
    startSlotIndex: number
    patternSlots: ShiftSlot[]
  }) => {
    const { colors, startDate, startSlotIndex, patternSlots: modalSlots } = payload
    let userId: string | null = null
    const selectedPatternId = activePattern?.id ?? storedPattern?.patternId

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        console.error('[RotaSetup] failed to save color prefs: no user', error)
      } else {
        userId = user.id
        await saveActiveShiftColors(supabase, user.id, colors, {
          patternId: selectedPatternId,
          startDate,
          startSlotIndex,
        })
      }
    } catch (err) {
      console.error('[RotaSetup] failed to save color prefs', err)
    }

    if (userId && selectedPatternId) {
      const startDateObj = new Date(`${startDate}T00:00:00`)
      const patternCycle = getPatternCycle(selectedPatternId)
      const safeStartIndex = patternCycle.length ? startSlotIndex % patternCycle.length : 0

      try {
        await applyRotaPattern({
          supabase,
          userId,
          startDate: startDateObj,
          patternId: selectedPatternId,
          startCycleIndex: safeStartIndex,
          daysToGenerate: 365,
        })
      } catch (err) {
        console.error('[RotaSetup] failed to persist rota pattern', err)
      }

      setStoredPattern({
        patternId: selectedPatternId,
        startDate,
        startSlotIndex,
        colors,
      })

      const summaryPattern = PRESET_MAP[selectedPatternId]
      if (summaryPattern) {
        setActivePatternSummary({
          id: summaryPattern.id,
          name: summaryPattern.label,
          cycleDescription: getPatternDescription(summaryPattern.id),
          lengthLabel: summaryPattern.length,
          startDate,
        })
        setActivePattern(summaryPattern)
        setSelectedPattern(summaryPattern)
      } else {
        setActivePatternSummary({
          id: selectedPatternId,
          name: selectedPatternId,
          startDate,
        })
      }
    } else if (!activePattern) {
      console.warn('[RotaSetup] No active pattern selected when saving colours')
    }

    setShiftColors(colors)
    setPatternSlots(modalSlots)
    const alignment: PatternAlignment = { startDate, startSlotIndex, patternId: selectedPatternId ?? patternAlignment.patternId }
    setPatternAlignment(alignment)
    applyPatternToCalendar(modalSlots, alignment)
    await loadMonthDays(currentMonthDate)
    await loadStoredPattern()
    setShowColorModal(false)
    setIsEditingPattern(false)
  }

  const handleSaveRotaAndReturn = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('[RotaEditor] save: auth error', userError)
        return
      }

      // TODO: Persist `days` to Supabase. Example placeholder:
      // const payload = days.map((day) => ({
      //   user_id: user.id,
      //   date: day.date,
      //   shift_type: day.shiftType,
      //   tag: day.tag ?? null,
      // }))
      // await supabase.from('shift_rota').upsert(payload, { onConflict: 'user_id,date' })

      router.push('/dashboard?tab=rota')
    } catch (err) {
      console.error('[RotaEditor] handleSaveRotaAndReturn error', err)
    }
  }

  const handleClearMonth = () => {
    setDays((prev) => prev.map((day) => ({ ...day, shiftType: null, tag: null })))
  }

  const getBgColorForShift = (shiftType: 'day' | 'night' | 'off' | 'other') => {
    switch (shiftType) {
      case 'day':
        return shiftColors.day
      case 'night':
        return shiftColors.night
      case 'off':
        return shiftColors.off
      default:
        return shiftColors.other
    }
  }

  const getDayStyles = (shiftType: CalendarDay['shiftType']) => {
    const bgColor = shiftType ? getBgColorForShift(shiftType) : '#f9fafb'

    const isBrightColor = (color: string) => {
      if (!color.startsWith('#') || (color.length !== 7 && color.length !== 4)) return false

      let r: number, g: number, b: number
      if (color.length === 7) {
        r = parseInt(color.slice(1, 3), 16)
        g = parseInt(color.slice(3, 5), 16)
        b = parseInt(color.slice(5, 7), 16)
      } else {
        r = parseInt(color[1] + color[1], 16)
        g = parseInt(color[2] + color[2], 16)
        b = parseInt(color[3] + color[3], 16)
      }

      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      return luminance > 0.8
    }

    const bright = isBrightColor(bgColor)
    const textColor = bright ? '#0f172a' : '#ffffff'
    const borderColor = bright && shiftType ? '#e5e7eb' : 'transparent'

    return { bgColor, textColor, borderColor }
  }

  const monthLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
    return formatter.format(currentMonthDate)
  }, [currentMonthDate])

  const goToPrevMonth = () => {
    setCurrentMonthDate((prev) => {
      const next = new Date(prev)
      next.setMonth(prev.getMonth() - 1)
      return startOfMonth(next)
    })
  }

  const goToNextMonth = () => {
    setCurrentMonthDate((prev) => {
      const next = new Date(prev)
      next.setMonth(prev.getMonth() + 1)
      return startOfMonth(next)
    })
  }

  const handleAddTask = () => {
    setShowTaskPlaceholder(true)
    setShowHolidayPlaceholder(false)
  }

  const handleAddEvent = () => {
    setShowHolidayPlaceholder(true)
    setShowTaskPlaceholder(false)
  }

  return (
    <div className="w-full px-4 pb-6 pt-4 md:px-6">
      <div
        className="mx-auto max-w-5xl rounded-[32px] border bg-gradient-to-b from-slate-50 to-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-6"
        style={{ borderColor: 'rgba(148,163,184,0.25)', backdropFilter: 'blur(18px)' }}
      >
        <div className="grid items-start gap-6 md:grid-cols-[3fr,2fr]">
          <section className="space-y-4">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Shift rota</p>
                <h1 className="text-lg font-semibold text-slate-900">Monthly overview</h1>
              </div>
            </header>

            <div className="rounded-[28px] bg-white/95 p-4 shadow-inner shadow-slate-100">
              <div className="mb-3 flex items-center justify-between text-xs text-slate-600">
                <button className="rounded-full px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-50" onClick={goToPrevMonth}>
                  ‹
                </button>
                <span className="font-semibold text-slate-800">{monthLabel}</span>
                <button className="rounded-full px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-50" onClick={goToNextMonth}>
                  ›
                </button>
              </div>

              <div className="grid grid-cols-7 text-center text-[10px] font-medium tracking-wide text-slate-400">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, index) => (
                  <div key={`${d}-${index}`} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div
                className="grid grid-cols-7 gap-1.5"
                style={{ justifyItems: 'center', alignItems: 'center' }}
              >
                {days.map((day) => {
                  const { bgColor, textColor, borderColor } = getDayStyles(day.shiftType)
                  const isToday = day.date === todayISO

                  return (
                    <div key={day.date} className="relative">
                      <button
                        type="button"
                        onClick={() => handleDayClick(day)}
                        className="flex items-center justify-center text-sm font-semibold transition-all duration-150 hover:scale-[1.05]"
                        style={{
                          backgroundColor: bgColor,
                          color: textColor,
                          border: `1px solid ${borderColor}`,
                          height: '38px',
                          width: '38px',
                          borderRadius: '8px',
                        }}
                      >
                        {day.date.split('-')[2]}
                      </button>
                      {isToday && (
                        <span className="pointer-events-none absolute inset-[2px] rounded-[10px] ring-2 ring-sky-400/70 ring-offset-2 ring-offset-white" />
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-slate-500">
                <LegendDot color={shiftColors.day} label="Day shift" />
                <LegendDot color={shiftColors.night} label="Night shift" />
                <LegendDot color={shiftColors.off} label="Off / rest" />
                <LegendDot color={shiftColors.other} label="Custom tag" />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveRotaAndReturn}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-500/30 transition-all hover:bg-slate-800 active:scale-[0.98]"
              >
                <CalendarDays className="h-4 w-4" />
                Save rota & return
              </button>
              <button
                type="button"
                onClick={handleClearMonth}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.98]"
              >
                Clear month
              </button>
            </div>
          </section>

          <section className="space-y-4 md:pl-2">
            {activePatternSummary && !isEditingPattern && (
              <PatternSummaryCard
                summary={activePatternSummary}
                onEdit={() => {
                  setIsEditingPattern(true)
                  setActiveTab('presets')
                  if (activePatternSummary.id) {
                    const preset = PRESET_MAP[activePatternSummary.id]
                    if (preset) {
                      setActivePattern(preset)
                      setPatternSlots(getPatternSlots(preset.id))
                    }
                  }
                }}
                onAddHoliday={handleAddEvent}
              />
            )}

            {showHolidayPlaceholder && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/90 p-4 text-xs text-slate-500 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p>
                    Holiday / event planning is coming soon. For now, continue using presets to keep your rota in sync.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowHolidayPlaceholder(false)}
                    className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {showTaskPlaceholder && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/90 p-4 text-xs text-slate-500 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p>
                    Task scheduling will arrive soon. Use the coach or your notes in the meantime to track key actions.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTaskPlaceholder(false)}
                    className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {(!activePatternSummary || isEditingPattern) && (
              <>
                <div className="flex justify-center">
                  <div
                    className="inline-flex items-center gap-2 rounded-full px-2 py-1"
                    style={{ backdropFilter: 'blur(14px)' }}
                  >
                    {TABS.map(({ id, icon: Icon }) => {
                      const active = id === activeTab
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setActiveTab(id)}
                          className={[
                            'relative flex items-center justify-center rounded-full p-3 transition-all duration-200',
                            active
                              ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-[0_4px_12px_rgba(56,189,248,0.45)] scale-110'
                              : 'text-slate-400 hover:text-slate-700',
                          ].join(' ')}
                          style={{ minWidth: '46px', minHeight: '46px' }}
                        >
                          <Icon
                            className={
                              'h-5 w-5 transition-transform ' + (active ? 'scale-110 opacity-100' : 'opacity-70')
                            }
                          />
                          {active && (
                            <span className="absolute -bottom-1 left-1/2 h-1 w-3 -translate-x-1/2 rounded-full bg-sky-300 blur-[4px]" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-100 bg-white/95 p-4 shadow-sm shadow-slate-100">
                  {activeTab === 'presets' && <PresetsContent onApplyPattern={handlePresetClick} />}
                  {activeTab === 'custom' && <CustomContent />}
                  {activeTab === 'import' && <ImportContent />}
                  {activeTab === 'labels' && <LabelsContent />}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {showColorModal && selectedPattern && (
        <ShiftColorModal
          open={showColorModal}
          pattern={selectedPattern}
          initialColors={shiftColors}
          initialStartDate={patternAlignment.startDate || todayISO}
          initialSlotIndex={patternAlignment.startSlotIndex}
          patternSlots={patternSlots}
          onClose={() => setShowColorModal(false)}
          onSave={handleSaveColors}
        />
      )}

      <AddActionFab onAddTask={handleAddTask} onAddEvent={handleAddEvent} />
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  )
}

function PresetsContent({ onApplyPattern }: { onApplyPattern: (pattern: PresetPattern) => void }) {
  const [selectedLength, setSelectedLength] = useState<ShiftLength>('12h')
  const patterns = PRESET_PATTERNS_BY_LENGTH[selectedLength] ?? []
  const [highlightedId, setHighlightedId] = useState<string>(() => patterns[0]?.id ?? '')

  useEffect(() => {
    const nextPatterns = PRESET_PATTERNS_BY_LENGTH[selectedLength] ?? []
    setHighlightedId((prev) => {
      if (prev && nextPatterns.some((pattern) => pattern.id === prev)) {
        return prev
      }
      return nextPatterns[0]?.id ?? ''
    })
  }, [selectedLength])

  const activePattern =
    patterns.find((pattern) => pattern.id === highlightedId) ?? patterns[0]
  const description = getPatternDescription(activePattern?.id)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Shift pattern presets</h2>
        <p className="mt-1 text-sm text-slate-500">
          Pick the rota that&apos;s closest to yours. We&apos;ll tile it automatically across your calendar.
        </p>
      </div>

      <div className="inline-flex rounded-full bg-slate-50 p-1 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
        {SHIFT_LENGTHS.map((len) => {
          const active = len === selectedLength
          return (
            <button
              key={len}
              type="button"
              onClick={() => setSelectedLength(len)}
              className={[
                'relative rounded-full px-4 py-1.5 text-xs font-medium transition-all',
                active
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-[0_6px_16px_rgba(56,189,248,0.45)]'
                  : 'text-slate-500 hover:text-slate-800',
              ].join(' ')}
            >
              {len} shifts
            </button>
          )
        })}
      </div>

      <div className="space-y-2">
        {patterns.map((pattern) => {
          const isActive = pattern.id === activePattern?.id
          return (
            <button
              key={pattern.id}
              type="button"
              onClick={() => {
                setHighlightedId(pattern.id)
                onApplyPattern(pattern)
              }}
              className={[
                'w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all',
                isActive
                  ? 'border-sky-400/70 bg-sky-50 text-slate-900 shadow-sm'
                  : 'border-slate-100 bg-white/95 text-slate-700 hover:border-sky-200 hover:shadow-md',
              ].join(' ')}
            >
              {pattern.label}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-slate-400">{description}</p>
      <p className="text-[11px] text-slate-400">
        Tap a pattern to apply it. You&apos;ll still be able to tweak single days and colours later.
      </p>
    </div>
  )
}

function PatternSummaryCard({
  summary,
  onEdit,
  onAddHoliday,
}: {
  summary: PatternSummary
  onEdit: () => void
  onAddHoliday: () => void
}) {
  const patternLabel =
    summary.name || summary.cycleDescription || summary.lengthLabel || summary.id || 'Shift pattern set'

  return (
    <div className="mt-4 px-3">
      <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 text-center shadow-sm">
        <p className="w-full truncate text-xs font-medium tracking-wide text-slate-800">{patternLabel}</p>
        <div className="flex w-full gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 rounded-xl bg-sky-50 py-2 text-xs font-medium text-sky-600 transition-all active:scale-[0.98]"
          >
            Edit pattern
          </button>
          <button
            type="button"
            onClick={onAddHoliday}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-medium text-slate-700 transition-all active:scale-[0.98]"
          >
            Add holidays / events
          </button>
        </div>
      </div>
    </div>
  )
}

function ShiftColorModal(props: {
  open: boolean
  pattern: PresetPattern | null
  initialColors: ShiftColorConfig
  initialStartDate: string
  initialSlotIndex: number
  patternSlots: ShiftSlot[]
  onClose: () => void
  onSave: (payload: {
    colors: ShiftColorConfig
    startDate: string
    startSlotIndex: number
    patternSlots: ShiftSlot[]
  }) => void
}) {
  const { open, pattern, initialColors, initialStartDate, initialSlotIndex, patternSlots, onClose, onSave } = props

  const slots = patternSlots.length
    ? patternSlots
    : getPatternSlots(pattern?.id ?? 'default')

  console.log('[rota] ShiftColorModal opened for pattern', pattern?.id)

  const slotOptions = useMemo(() => {
    return slots.map((slot, index) => {
      const occurrenceIndex =
        slots.slice(0, index + 1).filter((s) => s.type === slot.type).length

      const ordinal = (n: number) => {
        if (n === 1) return '1st'
        if (n === 2) return '2nd'
        if (n === 3) return '3rd'
        return `${n}th`
      }

      const baseLabel =
        slot.type === 'day'
          ? 'Day shift'
          : slot.type === 'night'
          ? 'Night shift'
          : slot.type === 'off'
          ? 'Off / rest'
          : 'Other / custom'

      const label = `${ordinal(occurrenceIndex)} ${baseLabel.toLowerCase()}`

      return {
        value: `slot-${index}`,
        type: slot.type,
        index,
        label,
      }
    })
  }, [slots])

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], [])
  const modalCardId = useId()

  const [currentSlotId, setCurrentSlotId] = useState<string>(slotOptions[initialSlotIndex]?.value ?? slotOptions[0]?.value ?? 'slot-0')
  const [startDate, setStartDate] = useState<string>(initialStartDate || todayIso)
  const [dayShiftColor, setDayShiftColor] = useState<string>(initialColors.day ?? '#2563EB')
  const [nightShiftColor, setNightShiftColor] = useState<string>(initialColors.night ?? '#EF4444')
  const [offColor, setOffColor] = useState<string>(initialColors.off ?? '#22C55E')
  const [customColor, setCustomColor] = useState<string>(initialColors.other ?? initialColors.custom ?? '#FACC15')
  const modalRef = useRef<HTMLDivElement>(null)
  const firstFieldRef = useRef<HTMLSelectElement | null>(null)

  useEffect(() => {
    setDayShiftColor(initialColors.day ?? '#2563EB')
    setNightShiftColor(initialColors.night ?? '#EF4444')
    setOffColor(initialColors.off ?? '#22C55E')
    setCustomColor(initialColors.other ?? initialColors.custom ?? '#FACC15')
  }, [initialColors])

  useEffect(() => {
    setCurrentSlotId(slotOptions[initialSlotIndex]?.value ?? slotOptions[0]?.value ?? 'slot-0')
    setStartDate(initialStartDate || todayIso)
  }, [initialSlotIndex, initialStartDate, slotOptions, todayIso])

  useEffect(() => {
    if (!open) return

    const previousActiveElement = document.activeElement as HTMLElement | null

    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key === 'Tab' && modalRef.current) {
        const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>(focusableSelector))
          .filter((el) => !el.hasAttribute('disabled'))
        if (!focusable.length) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    firstFieldRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousActiveElement?.focus()
    }
  }, [open, onClose])

  if (!open || !pattern) return null

  const shiftKeyToLabel: Record<ShiftSlotType, string> = {
    day: 'Day shift',
    night: 'Night shift',
    off: 'Off / rest',
    other: 'Other / custom',
  }

  const handleSave = () => {
    const selectedOption = slotOptions.find((opt) => opt.value === currentSlotId)
    const colorConfig: ShiftColorConfig = {
      day: dayShiftColor,
      night: nightShiftColor,
      off: offColor,
      other: customColor,
      custom: customColor,
    }
    onSave({
      colors: colorConfig,
      startDate,
      startSlotIndex: selectedOption?.index ?? 0,
      patternSlots: slots,
    })
  }

  const renderColorRow = (
    label: string,
    color: string,
    setColor: (value: string) => void,
  ) => (
    <div className="flex items-center justify-between gap-3 sm:gap-4" key={label}>
      <span className="text-sm font-medium text-slate-900 sm:text-sm">{label}</span>
      <div className="flex items-center gap-2 sm:gap-3">
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white shadow-inner ring-1 ring-slate-200 sm:h-6 sm:w-6 sm:ring-2"
          style={{ backgroundColor: color }}
        />
        <div className="relative">
          <select
            className="min-w-[110px] appearance-none rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm transition focus:border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-300/60 hover:shadow-md sm:min-w-[120px]"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          >
            {COLOR_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-2"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalCardId}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div
        ref={modalRef}
        className="relative w-full max-w-[380px] animate-[fadeIn_0.25s_ease-out] space-y-4 overflow-y-auto rounded-2xl bg-white px-4 py-4 shadow-xl sm:max-w-[420px] sm:px-5 sm:py-5"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-2 flex items-center justify-between sm:mb-3">
          <div>
            <p
              id={modalCardId}
              className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 sm:text-[11px]"
            >
              Shift colours
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">{pattern.label}</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
            type="button"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 sm:text-[11px]">Current shift</p>
          <div className="mt-1.5 w-full rounded-full border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 shadow-inner focus-within:border-sky-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-300/60 sm:mt-2 sm:px-4 sm:py-2.5">
            <select
              value={currentSlotId}
              onChange={(event) => setCurrentSlotId(event.target.value)}
              className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
              ref={firstFieldRef}
            >
              {slotOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 sm:mt-4 sm:text-[11px]">
            Start date
          </p>
          <div className="mt-1.5 w-full rounded-full border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 shadow-inner focus-within:border-sky-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-300/60 sm:mt-2 sm:px-4 sm:py-2.5">
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
            />
          </div>
        </div>

        <div className="mt-3 space-y-3 sm:mt-5 sm:space-y-4">
          {renderColorRow('Day shift', dayShiftColor, setDayShiftColor)}
          {renderColorRow('Night shift', nightShiftColor, setNightShiftColor)}
          {renderColorRow('Days off', offColor, setOffColor)}
        </div>

        <div className="mt-5 space-y-1.5 sm:mt-7 sm:space-y-2">
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(56,189,248,0.4)] transition hover:brightness-110 active:translate-y-[1px] sm:py-3 sm:text-base"
          >
            Save colours & continue
          </button>

          <button
            type="button"
            onClick={onClose}
            className="mt-1.5 w-full text-[11px] font-medium text-slate-400 transition hover:text-slate-600 sm:mt-2 sm:text-xs"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
