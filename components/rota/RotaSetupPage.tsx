'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { CalendarDays, ChevronDown } from 'lucide-react'
import {
  DEFAULT_SHIFT_COLORS,
  getActiveShiftColors,
  saveActiveShiftColors,
  type ShiftColorConfig,
} from '@/lib/data/shiftColors'
import { applyRotaPattern } from '@/lib/rota/applyPattern'
import { PATTERN_SEQUENCES, getPatternCycle } from '@/lib/rota/patternCatalog'
import ShiftPatternSet, { type ShiftPatternSummary } from '@/components/rota/ShiftPatternSet'
import {
  PATTERNS_BY_LENGTH as SHARED_PATTERNS_BY_LENGTH,
  getPatternDescription,
  type ShiftLength,
  type ShiftPattern as PresetBase,
} from '@/lib/rota/patternPresets'

type SetupStep = 1 | 2 | 3

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

type PreviewPatternState = {
  slots: ShiftSlot[]
  alignment: PatternAlignment
}

type PatternSummary = {
  id: string
  name: string
  cycleDescription?: string
  lengthLabel?: string
  startDate?: string
}

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
) as Record<ShiftLength, PresetPattern[]>

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
  const [currentStep, setCurrentStep] = useState<SetupStep>(1)
  const [activePattern, setActivePattern] = useState<PresetPattern | null>(null)
  const [selectedPattern, setSelectedPattern] = useState<PresetPattern | null>(null)
  const [shiftColors, setShiftColors] = useState<ShiftColorConfig>(DEFAULT_SHIFT_COLORS)
  const [days, setDays] = useState<CalendarDay[]>([])
  const [patternSlots, setPatternSlots] = useState<ShiftSlot[]>([])
  const [patternAlignment, setPatternAlignment] = useState<PatternAlignment>({
    startDate: todayISO,
    startSlotIndex: 0,
    patternId: undefined,
  })
  const [previewPattern, setPreviewPattern] = useState<PreviewPatternState | null>(null)
  const [storedPattern, setStoredPattern] = useState<StoredPattern | null>(null)
  const [activePatternSummary, setActivePatternSummary] = useState<PatternSummary | null>(null)
  const [isEditingPattern, setIsEditingPattern] = useState(false)

  // Inline configuration state for the guided flow (Step 2)
  const [configStartDate, setConfigStartDate] = useState<string>(todayISO)
  const [configStartSlotIndex, setConfigStartSlotIndex] = useState<number>(0)
  const [configDayColor, setConfigDayColor] = useState<string>(DEFAULT_SHIFT_COLORS.day)
  const [configNightColor, setConfigNightColor] = useState<string>(DEFAULT_SHIFT_COLORS.night)
  const [configCustomColor, setConfigCustomColor] = useState<string>(
    DEFAULT_SHIFT_COLORS.other ?? DEFAULT_SHIFT_COLORS.custom ?? '#FACC15',
  )

  const loadMonthDays = useCallback(
    async (targetDate: Date) => {
      const base = generateMonthDays(targetDate)

      try {
        let user = null
        let error = null
        try {
          const result = await supabase.auth.getUser()
          user = result.data?.user ?? null
          error = result.error ?? null
        } catch (authErr: any) {
          // Handle auth session errors gracefully
          if (authErr?.message?.includes('session') || authErr?.message?.includes('Auth session missing')) {
            console.warn('[RotaSetup] Auth session not ready, using base calendar')
            setDays(base)
            return
          }
          throw authErr
        }

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
      let user = null
      let error = null
      try {
        const result = await supabase.auth.getUser()
        user = result.data?.user ?? null
        error = result.error ?? null
      } catch (authErr: any) {
        // Handle auth session errors gracefully
        if (authErr?.message?.includes('session') || authErr?.message?.includes('Auth session missing')) {
          console.warn('[RotaSetup] Auth session not ready for loadStoredPattern')
          setStoredPattern(null)
          setActivePatternSummary(null)
          setIsEditingPattern(false)
          return
        }
        throw authErr
      }

      if (error || !user) {
        setStoredPattern(null)
        setActivePatternSummary(null)
        setIsEditingPattern(false)
        setPreviewPattern(null)
        setCurrentStep(1)
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
        setPreviewPattern(null)
        setCurrentStep(1)
        return
      }

      if (!data) {
        setStoredPattern(null)
        setActivePatternSummary(null)
        setIsEditingPattern(false)
        setPreviewPattern(null)
        setCurrentStep(1)
        return
      }

      const mergedColors: ShiftColorConfig = {
        ...DEFAULT_SHIFT_COLORS,
        ...((data.color_config as Partial<ShiftColorConfig> | null) ?? {}),
      }

      setShiftColors(mergedColors)
      setConfigDayColor(mergedColors.day ?? DEFAULT_SHIFT_COLORS.day)
      setConfigNightColor(mergedColors.night ?? DEFAULT_SHIFT_COLORS.night)
      setConfigCustomColor(mergedColors.other ?? mergedColors.custom ?? '#FACC15')

      const startDate = data.start_date ?? todayISO
      const startSlotIndex = data.start_slot_index ?? 0

      setStoredPattern({
        patternId: data.pattern_id,
        startDate,
        startSlotIndex,
        colors: mergedColors,
      })

      setPatternAlignment({ startDate, startSlotIndex, patternId: data.pattern_id ?? undefined })
      setConfigStartDate(startDate)
      setConfigStartSlotIndex(startSlotIndex)

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
        setCurrentStep(3)
      } else {
        setActivePatternSummary({
          id: data.pattern_id,
          name: data.pattern_id,
          startDate,
        })
        setSelectedPattern(null)
        setCurrentStep(2)
      }

      const resolvedSlots =
        patternDef?.slots?.length
          ? patternDef.slots.map((slot) => ({ ...slot }))
          : data.pattern_id
          ? getPatternSlots(data.pattern_id)
          : []

      if (resolvedSlots.length) {
        setPreviewPattern({
          slots: resolvedSlots,
          alignment: { startDate, startSlotIndex, patternId: data.pattern_id ?? undefined },
        })
      } else {
        setPreviewPattern(null)
      }
    } catch (err) {
      console.error('[RotaSetup] loadStoredPattern fatal error', err)
      setStoredPattern(null)
      setActivePatternSummary(null)
      setIsEditingPattern(false)
      setPreviewPattern(null)
      setCurrentStep(1)
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
        let user = null
        let error = null
        try {
          const result = await supabase.auth.getUser()
          user = result.data?.user ?? null
          error = result.error ?? null
        } catch (authErr: any) {
          // Handle auth session errors gracefully
          if (authErr?.message?.includes('session') || authErr?.message?.includes('Auth session missing')) {
            console.warn('[RotaSetup] Auth session not ready for loadColors')
            return
          }
          throw authErr
        }

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
    setConfigStartDate(alignment.startDate)
    setConfigStartSlotIndex(alignment.startSlotIndex)
    const resolvedPattern = PRESET_MAP[pattern.id] ?? pattern
    setActivePattern(resolvedPattern)
    setSelectedPattern(resolvedPattern)
    setIsEditingPattern(true)
    setPreviewPattern(null)
    setCurrentStep(2)

    try {
      let user = null
      let authError = null
      try {
        const result = await supabase.auth.getUser()
        user = result.data?.user ?? null
        authError = result.error ?? null
      } catch (authErr: any) {
        // Handle auth session errors gracefully
        if (authErr?.message?.includes('session') || authErr?.message?.includes('Auth session missing')) {
          console.warn('[RotaSetup] Auth session not ready for handlePresetClick, using defaults')
          setShiftColors(DEFAULT_SHIFT_COLORS)
          setConfigDayColor(DEFAULT_SHIFT_COLORS.day)
          setConfigNightColor(DEFAULT_SHIFT_COLORS.night)
          setConfigCustomColor(DEFAULT_SHIFT_COLORS.other ?? DEFAULT_SHIFT_COLORS.custom ?? '#FACC15')
          return
        }
        throw authErr
      }

      if (authError || !user) {
        console.error('[RotaSetup] no user for color prefs', authError)
        setShiftColors(DEFAULT_SHIFT_COLORS)
        setConfigDayColor(DEFAULT_SHIFT_COLORS.day)
        setConfigNightColor(DEFAULT_SHIFT_COLORS.night)
        setConfigCustomColor(DEFAULT_SHIFT_COLORS.other ?? DEFAULT_SHIFT_COLORS.custom ?? '#FACC15')
        return
      }

      const colors = await getActiveShiftColors(supabase, user.id)
      setShiftColors(colors)
      setConfigDayColor(colors.day ?? DEFAULT_SHIFT_COLORS.day)
      setConfigNightColor(colors.night ?? DEFAULT_SHIFT_COLORS.night)
      setConfigCustomColor(colors.other ?? colors.custom ?? '#FACC15')
    } catch (err) {
      console.error('[RotaSetup] failed to load color prefs', err)
      setShiftColors(DEFAULT_SHIFT_COLORS)
      setConfigDayColor(DEFAULT_SHIFT_COLORS.day)
      setConfigNightColor(DEFAULT_SHIFT_COLORS.night)
      setConfigCustomColor(DEFAULT_SHIFT_COLORS.other ?? DEFAULT_SHIFT_COLORS.custom ?? '#FACC15')
    }
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
      let user = null
      let error = null
      try {
        const result = await supabase.auth.getUser()
        user = result.data?.user ?? null
        error = result.error ?? null
      } catch (authErr: any) {
        // Handle auth session errors gracefully
        if (authErr?.message?.includes('session') || authErr?.message?.includes('Auth session missing')) {
          console.warn('[RotaSetup] Auth session not ready for handleSaveColors')
          return
        }
        throw authErr
      }

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
    setPreviewPattern({
      slots: modalSlots.map((slot) => ({ ...slot })),
      alignment,
    })
    applyPatternToCalendar(modalSlots, alignment)
    await loadMonthDays(currentMonthDate)
    await loadStoredPattern()
    setIsEditingPattern(false)
    setCurrentStep(3)
  }

  const handleSaveRotaAndReturn = async () => {
      try {
        let user = null
        let userError = null
        try {
          const result = await supabase.auth.getUser()
          user = result.data?.user ?? null
          userError = result.error ?? null
        } catch (authErr: any) {
          // Handle auth session errors gracefully
          if (authErr?.message?.includes('session') || authErr?.message?.includes('Auth session missing')) {
            console.warn('[RotaSetup] Auth session not ready for handleSaveRotaAndReturn')
            return
          }
          throw authErr
        }

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
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Preview</p>
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
            {/* Guided step indicator */}
            <div className="flex items-center justify-between rounded-full bg-slate-50/80 px-3 py-2 text-[11px] font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <span
                  className={[
                    'inline-flex h-6 items-center rounded-full px-3 transition-all',
                    currentStep === 1 ? 'bg-slate-900 text-white shadow-sm' : 'bg-transparent text-slate-500',
                  ].join(' ')}
                >
                  1 · Pattern
                </span>
                <span
                  className={[
                    'inline-flex h-6 items-center rounded-full px-3 transition-all',
                    currentStep === 2 ? 'bg-slate-900 text-white shadow-sm' : 'bg-transparent text-slate-500',
                  ].join(' ')}
                >
                  2 · Colours
                </span>
                <span
                  className={[
                    'inline-flex h-6 items-center rounded-full px-3 transition-all',
                    currentStep === 3 ? 'bg-slate-900 text-white shadow-sm' : 'bg-transparent text-slate-500',
                  ].join(' ')}
                >
                  3 · Review
                </span>
              </div>
              {activePatternSummary && !isEditingPattern && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingPattern(true)
                    setCurrentStep(1)
                    if (activePatternSummary.id) {
                      const preset = PRESET_MAP[activePatternSummary.id]
                      if (preset) {
                        setActivePattern(preset)
                        setPatternSlots(getPatternSlots(preset.id))
                      }
                    }
                  }}
                  className="text-[11px] font-medium text-sky-600 hover:text-sky-700"
                >
                  Edit
                </button>
              )}
            </div>

            <div className="rounded-[24px] border border-slate-100 bg-white/95 p-4 shadow-sm shadow-slate-100">
              {currentStep === 1 && (
                <PresetsContent
                  onApplyPattern={handlePresetClick}
                  currentMonthDate={currentMonthDate}
                  previewPattern={previewPattern}
                  shiftColors={shiftColors}
                />
              )}

              {currentStep === 2 && (
                <InlineColorAndStartStep
                  pattern={activePattern}
                  startDate={configStartDate}
                  startSlotIndex={configStartSlotIndex}
                  dayColor={configDayColor}
                  nightColor={configNightColor}
                  customColor={configCustomColor}
                  onStartDateChange={setConfigStartDate}
                  onStartSlotIndexChange={setConfigStartSlotIndex}
                  onDayColorChange={setConfigDayColor}
                  onNightColorChange={setConfigNightColor}
                  onCustomColorChange={setConfigCustomColor}
                  onSave={async () => {
                    if (!activePattern && !storedPattern?.patternId) return
                    const effectivePatternId = activePattern?.id ?? storedPattern?.patternId!
                    const slots =
                      activePattern?.slots?.length && activePattern.slots.length > 0
                        ? activePattern.slots
                        : getPatternSlots(effectivePatternId)

                    const colorConfig: ShiftColorConfig = {
                      day: configDayColor,
                      night: configNightColor,
                      off: 'transparent',
                      other: configCustomColor,
                      custom: configCustomColor,
                    }

                    await handleSaveColors({
                      colors: colorConfig,
                      startDate: configStartDate,
                      startSlotIndex: configStartSlotIndex,
                      patternSlots: slots,
                    })
                  }}
                  slots={patternSlots.length ? patternSlots : activePattern?.slots ?? []}
                />
              )}

              {currentStep === 3 && activePatternSummary && (
                <div className="space-y-4">
                  <PatternSummaryCard
                    summary={activePatternSummary}
                    onEdit={() => {
                      setIsEditingPattern(true)
                      setCurrentStep(1)
                      if (activePatternSummary.id) {
                        const preset = PRESET_MAP[activePatternSummary.id]
                        if (preset) {
                          setActivePattern(preset)
                          setPatternSlots(getPatternSlots(preset.id))
                        }
                      }
                    }}
                  />
                  <p className="text-xs text-slate-500">
                    Your rota is applied across the next year. You can always come back here to adjust it as your
                    shifts change.
                  </p>
                  <button
                    type="button"
                    onClick={handleSaveRotaAndReturn}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-500/30 transition-all hover:bg-slate-800 active:scale-[0.98]"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Continue to rota
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

    </div>
  )
}


function PresetsContent({
  onApplyPattern,
  currentMonthDate,
  previewPattern,
  shiftColors,
}: {
  onApplyPattern: (pattern: PresetPattern) => void
  currentMonthDate: Date
  previewPattern: PreviewPatternState | null
  shiftColors: ShiftColorConfig
}) {
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

  const weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const monthLabel = useMemo(
    () =>
      currentMonthDate.toLocaleString('en-GB', {
        month: 'long',
        year: 'numeric',
      }),
    [currentMonthDate],
  )

  const baseWeeks = useMemo(() => {
    const year = currentMonthDate.getFullYear()
    const month = currentMonthDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startWeekday = (firstDay.getDay() + 6) % 7

    const cells: Array<{ dayNumber: number; shiftType: ShiftSlotType | null } | null> = []
    for (let i = 0; i < startWeekday; i++) {
      cells.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ dayNumber: day, shiftType: null })
    }

    while (cells.length % 7 !== 0) {
      cells.push(null)
    }

    const weeks: Array<Array<{ dayNumber: number; shiftType: ShiftSlotType | null } | null>> = []
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7))
    }

    return weeks
  }, [currentMonthDate])

  const previewWeeks = useMemo(() => {
    if (!previewPattern?.slots?.length || !previewPattern.alignment?.startDate) return []

    const year = currentMonthDate.getFullYear()
    const month = currentMonthDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startWeekday = (firstDay.getDay() + 6) % 7
    const msPerDay = 24 * 60 * 60 * 1000
    const startTime = new Date(previewPattern.alignment.startDate + 'T00:00:00').getTime()
    const slots = previewPattern.slots

    const cells: Array<{ dayNumber: number; shiftType: ShiftSlotType | null } | null> = []
    for (let i = 0; i < startWeekday; i++) {
      cells.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const currentTime = new Date(iso + 'T00:00:00').getTime()

      if (Number.isNaN(startTime) || Number.isNaN(currentTime) || !slots.length) {
        cells.push({ dayNumber: day, shiftType: null })
        continue
      }

      const diffDays = Math.floor((currentTime - startTime) / msPerDay)
      const len = slots.length
      const slotIndex = ((previewPattern.alignment.startSlotIndex + diffDays) % len + len) % len
      cells.push({
        dayNumber: day,
        shiftType: slots[slotIndex]?.type ?? null,
      })
    }

    while (cells.length % 7 !== 0) {
      cells.push(null)
    }

    const weeks: Array<Array<{ dayNumber: number; shiftType: ShiftSlotType | null } | null>> = []
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7))
    }

    return weeks
  }, [currentMonthDate, previewPattern])

  const weeksToRender =
    previewPattern && previewWeeks.length > 0 ? previewWeeks : baseWeeks

  const getColorForShiftType = (type: ShiftSlotType | null): string => {
    if (!type || type === 'off') return 'transparent'
    if (type === 'day') return shiftColors.day
    if (type === 'night') return shiftColors.night
    return shiftColors.other ?? '#CBD5F5'
  }

  const getLabelForShiftType = (type: ShiftSlotType | null): string => {
    if (!type) return ''
    if (type === 'day') return 'Day shift'
    if (type === 'night') return 'Night shift'
    if (type === 'off') return 'Rest day'
    return 'Custom'
  }

  return (
    <div className="space-y-4">
      {/* Visual Calendar Preview - Moved to top */}
      <div className="rounded-[28px] bg-gradient-to-br from-white to-slate-50/70 p-5 -mx-4 w-[calc(100%+2rem)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Preview</p>
            <h3 className="text-sm font-semibold text-slate-900">{monthLabel}</h3>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {weekdayLabels.map((label, idx) => (
            <div key={`weekday-${idx}`} className="text-center">
              <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide antialiased">
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          {weeksToRender.map((week, weekIdx) => (
            <div key={`preview-week-${weekIdx}`} className="grid grid-cols-7 gap-1.5">
              {week.map((day, dayIdx) => {
                if (!day || !day.dayNumber) {
                  return <div key={`empty-${weekIdx}-${dayIdx}`} className="h-10" />
                }

                const shiftColor = getColorForShiftType(day.shiftType)
                const hasShift = !!previewPattern && !!day.shiftType && day.shiftType !== 'off'
                const isOffDay = previewPattern && day.shiftType === 'off'

                return (
                  <div key={`cell-${weekIdx}-${dayIdx}`} className="flex items-center justify-center">
                    <div
                      className={[
                        'flex h-9 w-9 items-center justify-center rounded-2xl text-xs font-semibold transition-all',
                        hasShift
                          ? 'text-white shadow-sm shadow-slate-400/30'
                          : isOffDay
                          ? 'text-slate-400 bg-white border border-dashed border-slate-200'
                          : 'text-slate-900 bg-white border border-slate-200',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={hasShift ? { backgroundColor: shiftColor } : undefined}
                    >
                      {String(day.dayNumber).padStart(2, '0')}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

          {previewPattern?.slots?.length ? (
            <p className="mt-2 text-[10px] text-slate-500 text-center">
              Pattern repeats every {previewPattern.slots.length} days
            </p>
          ) : (
            <p className="mt-2 text-[10px] text-slate-400 text-center">
              Select a pattern and save colours to highlight your shifts.
            </p>
          )}
        </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Shift pattern presets</h2>
        <p className="mt-1 text-sm text-slate-500">
          Pick the rota that&apos;s closest to yours. We&apos;ll tile it automatically across your calendar.
        </p>
      </div>

      <div className="relative">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          Shift Length
        </label>
        <div className="relative">
          <select
            value={selectedLength}
            onChange={(e) => setSelectedLength(e.target.value as ShiftLength)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-semibold text-slate-900 shadow-sm transition-all focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
          >
            {SHIFT_LENGTHS.map((len) => (
              <option key={len} value={len}>
                {len} shifts
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronDown className="h-5 w-5 text-slate-400" strokeWidth={2} />
          </div>
        </div>
      </div>

      <div className="relative">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          Pattern Preset
        </label>
        <div className="relative">
          <select
            value={highlightedId}
            onChange={(e) => {
              const selectedPattern = patterns.find((p) => p.id === e.target.value)
              if (selectedPattern) {
                setHighlightedId(selectedPattern.id)
                onApplyPattern(selectedPattern)
              }
            }}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-semibold text-slate-900 shadow-sm transition-all focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
          >
            {patterns.map((pattern) => (
              <option key={pattern.id} value={pattern.id}>
                {pattern.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronDown className="h-5 w-5 text-slate-400" strokeWidth={2} />
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">{description}</p>
      <p className="text-[11px] text-slate-400">
        Select a pattern to apply it. You&apos;ll still be able to tweak single days and colours later.
      </p>
    </div>
  )
}

function PatternSummaryCard({
  summary,
  onEdit,
}: {
  summary: PatternSummary
  onEdit: () => void
}) {
  const patternLabel =
    summary.name || summary.cycleDescription || summary.lengthLabel || summary.id || 'Shift pattern set'

  return (
    <div className="mt-4 px-3">
      <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 text-center shadow-sm">
        <p className="w-full truncate text-xs font-medium tracking-wide text-slate-800">{patternLabel}</p>
        <button
          type="button"
          onClick={onEdit}
          className="w-full rounded-xl bg-sky-50 py-2 text-xs font-medium text-sky-600 transition-all active:scale-[0.98]"
        >
          Edit pattern
        </button>
      </div>
    </div>
  )
}

type InlineColorAndStartStepProps = {
  pattern: PresetPattern | null
  startDate: string
  startSlotIndex: number
  dayColor: string
  nightColor: string
  customColor: string
  onStartDateChange: (value: string) => void
  onStartSlotIndexChange: (index: number) => void
  onDayColorChange: (value: string) => void
  onNightColorChange: (value: string) => void
  onCustomColorChange: (value: string) => void
  onSave: () => Promise<void>
  slots: ShiftSlot[]
}

function InlineColorAndStartStep({
  pattern,
  startDate,
  startSlotIndex,
  dayColor,
  nightColor,
  customColor,
  onStartDateChange,
  onStartSlotIndexChange,
  onDayColorChange,
  onNightColorChange,
  onCustomColorChange,
  onSave,
  slots,
}: InlineColorAndStartStepProps) {
  const effectiveSlots = slots.length ? slots : getPatternSlots(pattern?.id ?? 'default')

  const slotOptions = useMemo(() => {
    return effectiveSlots.map((slot, index) => {
      const occurrenceIndex =
        effectiveSlots.slice(0, index + 1).filter((s) => s.type === slot.type).length

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
        value: index,
        type: slot.type,
        index,
        label,
      }
    })
  }, [effectiveSlots])

  const handleSaveClick = async () => {
    await onSave()
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
    <div className="space-y-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Colours & timing
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose how your day, night and custom shifts should look, and where this pattern should start.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl bg-slate-50/70 p-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
            Pattern start date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
            First shift in the pattern
          </label>
          <select
            value={startSlotIndex}
            onChange={(e) => onStartSlotIndexChange(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
          >
            {slotOptions.map((opt) => (
              <option key={opt.index} value={opt.index}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {renderColorRow('Day shift colour', dayColor, onDayColorChange)}
        {renderColorRow('Night shift colour', nightColor, onNightColorChange)}
        {renderColorRow('Custom / other', customColor, onCustomColorChange)}
      </div>

      <button
        type="button"
        onClick={handleSaveClick}
        className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-500/30 transition-all hover:bg-slate-800 active:scale-[0.98]"
      >
        Save colours & continue
      </button>
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
  const [customColor, setCustomColor] = useState<string>(initialColors.other ?? initialColors.custom ?? '#FACC15')
  const modalRef = useRef<HTMLDivElement>(null)
  const firstFieldRef = useRef<HTMLSelectElement | null>(null)

  useEffect(() => {
    setDayShiftColor(initialColors.day ?? '#2563EB')
    setNightShiftColor(initialColors.night ?? '#EF4444')
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
      off: 'transparent', // Days off are always transparent (no color)
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
