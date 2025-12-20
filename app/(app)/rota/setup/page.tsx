'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Clock, ChevronDown, Sun, Moon, X, Sparkles, Calendar, Check, Car, Trash2 } from 'lucide-react'
import { getPatternsByLength, type ShiftLength } from '@/lib/rota/comprehensivePatterns'
import { getPatternSlots } from '@/lib/rota/patternSlots'

type ShiftType = 'off' | 'day' | 'night'

const weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

type SetupStep = 1 | 2 | 3
type DetailTab = 'times' | 'commute' | 'today'

export default function RotaSetup() {
  const router = useRouter()
  const today = useMemo(() => new Date(), [])
  const [cursorDate, setCursorDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [currentStep, setCurrentStep] = useState<SetupStep>(1)
  const [detailTab, setDetailTab] = useState<DetailTab>('times')
  const [saving, setSaving] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [selectedShiftHours, setSelectedShiftHours] = useState<ShiftLength | null>(null)
  const [customHours, setCustomHours] = useState<string>('')
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null)
  const [showTimeConfig, setShowTimeConfig] = useState(false)
  const [showCommuteConfig, setShowCommuteConfig] = useState(false)
  
  // Commuting configuration
  const [commuteToWork, setCommuteToWork] = useState<{ minutes: string; method: string }>({
    minutes: '30',
    method: 'drive',
  })
  const [commuteFromWork, setCommuteFromWork] = useState<{ minutes: string; method: string }>({
    minutes: '30',
    method: 'drive',
  })
  
  // Preview state
  const [previewData, setPreviewData] = useState<Map<string, { type: string; color: string; label: string; dayInCycle: number }>>(new Map())
  const [showPreview, setShowPreview] = useState(false)
  const [todayShiftInfo, setTodayShiftInfo] = useState<{ type: string; label: string; dayInCycle: number; isWorking: boolean } | null>(null)
  const [selectedTodayPosition, setSelectedTodayPosition] = useState<number | null>(null)
  
  // Smart defaults based on shift length
  const getSmartDefaults = (shiftLength: ShiftLength | null): Record<string, { start: string; end: string }> => {
    if (!shiftLength || shiftLength === 'custom') {
      return {
        morning: { start: '06:00', end: '14:00' },
        day: { start: '08:00', end: '16:00' },
        afternoon: { start: '14:00', end: '22:00' },
        night: { start: '20:00', end: '08:00' },
      }
    }

    switch (shiftLength) {
      case '24h':
        return {
          day: { start: '08:00', end: '08:00' }, // 24-hour shift
        }
      case '16h':
        return {
          day: { start: '06:00', end: '22:00' },
          night: { start: '18:00', end: '10:00' },
        }
      case '12h':
        return {
          day: { start: '07:00', end: '19:00' },
          night: { start: '19:00', end: '07:00' },
        }
      case '10h':
        return {
          day: { start: '07:00', end: '17:00' },
          night: { start: '19:00', end: '05:00' },
        }
      case '8h':
        return {
          morning: { start: '06:00', end: '14:00' },
          day: { start: '08:00', end: '16:00' },
          afternoon: { start: '14:00', end: '22:00' },
          night: { start: '22:00', end: '06:00' },
        }
      case '6h':
        return {
          morning: { start: '06:00', end: '12:00' },
          afternoon: { start: '12:00', end: '18:00' },
          evening: { start: '18:00', end: '00:00' },
        }
      case '4h':
        return {
          morning: { start: '06:00', end: '10:00' },
          afternoon: { start: '12:00', end: '16:00' },
          evening: { start: '17:00', end: '21:00' },
        }
      default:
        return {
          day: { start: '08:00', end: '16:00' },
          night: { start: '20:00', end: '08:00' },
        }
    }
  }

  // Shift time configuration - initialized with smart defaults
  const [shiftTimes, setShiftTimes] = useState<Record<string, { start: string; end: string }>>(
    getSmartDefaults(selectedShiftHours)
  )

  // Update defaults when shift length changes (only if pattern not selected yet)
  useEffect(() => {
    if (selectedShiftHours && !selectedPattern) {
      const defaults = getSmartDefaults(selectedShiftHours)
      setShiftTimes(defaults)
    }
  }, [selectedShiftHours, selectedPattern])

  // Custom pattern builder state - month view (30 days)
  const [customPattern, setCustomPattern] = useState<ShiftType[]>(
    Array(30).fill('off') // Start with 30 days all off
  )
  const [recognizedPattern, setRecognizedPattern] = useState<{ cycle: ShiftType[], cycleLength: number } | null>(null)
  const [showPatternConfirmation, setShowPatternConfirmation] = useState(false)
  const [startDate, setStartDate] = useState<string>(today.toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState<string>('')
  const [noEndDate, setNoEndDate] = useState(true)
  const [showAllShiftLengths, setShowAllShiftLengths] = useState(false)

  // Get available patterns based on selected shift hours
  const availablePatterns = useMemo(() => {
    if (!selectedShiftHours) {
      return []
    }
    if (selectedShiftHours === 'custom') {
      // For custom hours, show a message that they can build their own pattern
      return []
    }
    return getPatternsByLength(selectedShiftHours)
  }, [selectedShiftHours])

  // Detect which shift types are in the selected pattern - smart detection based on shift length
  const getRelevantShiftTypes = useMemo(() => {
    if (!selectedPattern || !selectedShiftHours) return []

    // For 12h, 16h, 10h, and 24h shifts, we know they typically only use day/night
    // Don't even check the pattern - just use shift length logic
    if (selectedShiftHours === '24h') {
      return ['day'] // 24h is just one type (24-hour shift)
    }
    
    if (selectedShiftHours === '12h' || selectedShiftHours === '16h' || selectedShiftHours === '10h') {
      // These shift lengths typically only use day and night
      // Check pattern to see if it mentions morning/afternoon explicitly
      const pattern = availablePatterns.find((p) => p.id === selectedPattern)
      if (pattern) {
        const combined = `${pattern.label.toLowerCase()} ${pattern.description.toLowerCase()}`
        // Only include morning/afternoon if explicitly mentioned
        const hasMorning = combined.includes('morning') || combined.includes('early shift')
        const hasAfternoon = combined.includes('afternoon') || combined.includes('late shift')
        
        const types: string[] = []
        if (combined.includes('day') || combined.includes('d')) types.push('day')
        if (combined.includes('night') || combined.includes('n')) types.push('night')
        if (hasMorning) types.push('morning')
        if (hasAfternoon) types.push('afternoon')
        
        // If we found types, return them; otherwise default to day/night
        return types.length > 0 ? types : ['day', 'night']
      }
      return ['day', 'night'] // Default for 12h/16h/10h
    }
    
    // For 8h, 6h, 4h - check pattern more carefully
    const pattern = availablePatterns.find((p) => p.id === selectedPattern)
    if (!pattern) {
      // Fallback based on shift length
      if (selectedShiftHours === '8h') {
        return ['morning', 'day', 'afternoon', 'night']
      } else if (selectedShiftHours === '6h' || selectedShiftHours === '4h') {
        return ['morning', 'afternoon', 'evening']
      }
      return ['day', 'night']
    }

    const label = pattern.label.toLowerCase()
    const description = pattern.description.toLowerCase()
    const combined = `${label} ${description}`

    const types: string[] = []

    // More precise detection - avoid false positives
    if (combined.includes('night') && !combined.includes('midnight')) {
      types.push('night')
    }
    if (combined.includes(' day ') || combined.includes('days') || (combined.includes('day') && !combined.includes('today'))) {
      types.push('day')
    }
    if (combined.includes('morning') && !combined.includes('tomorrow')) {
      types.push('morning')
    }
    if (combined.includes('afternoon')) {
      types.push('afternoon')
    }
    if (combined.includes('evening')) {
      types.push('evening')
    }

    // If no types detected, use smart defaults based on shift length
    if (types.length === 0) {
      if (selectedShiftHours === '8h') {
        return ['morning', 'day', 'afternoon', 'night']
      } else if (selectedShiftHours === '6h') {
        return ['morning', 'afternoon', 'evening']
      } else if (selectedShiftHours === '4h') {
        return ['morning', 'afternoon', 'evening']
      }
      return ['day', 'night']
    }

    return types
  }, [selectedPattern, selectedShiftHours, availablePatterns])

  // Pattern recognition algorithm - finds repeating cycle in the custom pattern
  const recognizePattern = useMemo(() => {
    const pattern = customPattern
    
    // Try to find a repeating cycle
    // Start from the beginning and try different cycle lengths
    for (let cycleLength = 1; cycleLength <= Math.min(14, pattern.length / 2); cycleLength++) {
      const cycle = pattern.slice(0, cycleLength)
      
      // Skip if cycle is all 'off'
      if (cycle.every((s) => s === 'off')) continue
      
      let matches = true
      
      // Check if this cycle repeats throughout the pattern
      for (let i = cycleLength; i < pattern.length; i++) {
        if (pattern[i] !== cycle[i % cycleLength]) {
          matches = false
          break
        }
      }
      
      if (matches) {
        // Found a repeating pattern
        return { cycle, cycleLength }
      }
    }
    
    // If no repeating pattern found, return null
    return null
  }, [customPattern])

  // Auto-detect pattern when custom pattern changes
  const handlePatternChange = (newPattern: ShiftType[]) => {
    setCustomPattern(newPattern)
  }

  // Update recognized pattern when pattern changes
  useEffect(() => {
    if (recognizePattern && recognizePattern.cycle.some((s) => s !== 'off')) {
      setRecognizedPattern(recognizePattern)
    } else {
      setRecognizedPattern(null)
    }
  }, [recognizePattern])

  const handleDayClick = (idx: number) => {
    const next: ShiftType = 
      customPattern[idx] === 'off' ? 'day' :
      customPattern[idx] === 'day' ? 'night' : 'off'
    const newPattern = [...customPattern]
    newPattern[idx] = next
    handlePatternChange(newPattern)
  }

  const handleImplementPattern = async () => {
    // TODO: Save pattern to database with start/end dates
    console.log('Implementing pattern:', {
      pattern: recognizedPattern,
      startDate,
      endDate: noEndDate ? null : endDate,
      shiftHours: customHours,
      shiftTimes,
    })
    // Close modal and show success
    setShowPatternConfirmation(false)
  }

  // Get pattern cycle options for dropdown
  const patternCycleOptions = useMemo(() => {
    if (!selectedPattern) return []
    
    const patternSlots = getPatternSlots(selectedPattern)
    const slotToType: Record<string, string> = {
      'M': 'morning',
      'A': 'afternoon',
      'D': 'day',
      'N': 'night',
      'O': 'off',
    }
    
    const shiftLabels: Record<string, string> = {
      morning: 'Morning',
      day: 'Day',
      afternoon: 'Afternoon',
      night: 'Night',
      evening: 'Evening',
      off: 'Off',
    }
    
    let consecutiveOffDays = 0
    let lastSlot = ''
    
    return patternSlots.map((slot, index) => {
      const shiftType = slotToType[slot] || 'off'
      let label = ''
      
      if (shiftType === 'off') {
        if (lastSlot !== 'O') {
          consecutiveOffDays = 1
        } else {
          consecutiveOffDays++
        }
        label = `Day ${consecutiveOffDays} Off`
      } else {
        consecutiveOffDays = 0
        label = shiftLabels[shiftType] || shiftType
      }
      
      lastSlot = slot
      
      return {
        index: index + 1,
        label: `Day ${index + 1}: ${label}`,
        shiftType,
        isWorking: shiftType !== 'off',
      }
    })
  }, [selectedPattern])

  const handlePreview = () => {
    if (!selectedPattern || !selectedShiftHours) {
      alert('Please select a pattern and shift hours first')
      return
    }

    if (selectedTodayPosition === null) {
      alert('Please select which shift/day off you are on today')
      return
    }

    // Get pattern slots from the selected pattern
    const pattern = availablePatterns.find((p) => p.id === selectedPattern)
    if (!pattern) return

    // Generate preview data starting from TODAY for the next 30 days
    const preview = new Map<string, { type: string; color: string; label: string; dayInCycle: number }>()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString().slice(0, 10)
    
    // Default colors for shift types
    const shiftColors: Record<string, string> = {
      morning: '#10B981', // Green
      day: '#3B82F6', // Blue
      afternoon: '#A855F7', // Purple
      night: '#EF4444', // Red
      evening: '#EF4444', // Red (evening treated as night)
      off: 'transparent',
    }

    // Get pattern slots from pattern ID
    const patternSlots = getPatternSlots(selectedPattern)
    
    // Convert slots to shift types
    const slotToType: Record<string, string> = {
      'M': 'morning',
      'A': 'afternoon',
      'D': 'day',
      'N': 'night',
      'O': 'off',
    }
    
    const patternCycle = patternSlots.map((slot) => slotToType[slot] || 'off')

    // Track consecutive off days within the current cycle
    let consecutiveOffDays = 0
    let lastShiftType = ''

    // Apply pattern to the next 30 calendar days starting from today
    const previewWindowDays = 30
    for (let offset = 0; offset < previewWindowDays; offset++) {
      const date = new Date(today)
      date.setDate(today.getDate() + offset)
      date.setHours(0, 0, 0, 0)
      const dateStr = date.toISOString().slice(0, 10)
      
      // Skip if after end date (if set)
      if (!noEndDate && endDate) {
        const endDateObj = new Date(endDate)
        endDateObj.setHours(0, 0, 0, 0)
        if (date > endDateObj) continue
      }

      // Calculate which day in the pattern cycle based on today's position.
      // If today is day X in the cycle, and we're Y days from today, then the cycle position is (X + Y - 1) % cycleLength.
      const daysFromToday = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const cycleIndex = (selectedTodayPosition - 1 + daysFromToday + patternCycle.length) % patternCycle.length
      const shiftType = patternCycle[cycleIndex]
      const dayInCycle = cycleIndex + 1
      
      let label = ''
      let isWorking = false

      if (shiftType === 'off') {
        // Reset counter if we just switched from working to off
        if (lastShiftType !== 'off') {
          consecutiveOffDays = 1
        } else {
          consecutiveOffDays++
        }
        label = `Day ${consecutiveOffDays} Off`
        isWorking = false
      } else {
        // Reset counter when we start working
        consecutiveOffDays = 0
        const shiftLabels: Record<string, string> = {
          morning: 'Morning',
          day: 'Day',
          afternoon: 'Afternoon',
          night: 'Night',
          evening: 'Evening',
        }
        label = shiftLabels[shiftType] || shiftType
        isWorking = true
      }
      
      lastShiftType = shiftType

      // Store preview data
      preview.set(dateStr, {
        type: shiftType,
        color: shiftType === 'off' ? 'transparent' : (shiftColors[shiftType] || shiftColors.day),
        label,
        dayInCycle,
      })

      // Check if this is today
      if (dateStr === todayISO) {
        setTodayShiftInfo({
          type: shiftType,
          label,
          dayInCycle,
          isWorking,
        })
      }
    }

    setPreviewData(preview)
    setShowPreview(true)
  }

  const handleClearRota = async () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true)
      return
    }

    setClearing(true)
    try {
      const response = await fetch('/api/rota/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to clear rota')
      }

      // Reset all form state
      setSelectedShiftHours(null)
      setCustomHours('')
      setSelectedPattern(null)
      setShowTimeConfig(false)
      setShowCommuteConfig(false)
      setPreviewData(new Map())
      setShowPreview(false)
      setTodayShiftInfo(null)
      setSelectedTodayPosition(null)
      setCustomPattern(Array(30).fill('off'))
      setRecognizedPattern(null)
      setShowPatternConfirmation(false)
      setStartDate(today.toISOString().slice(0, 10))
      setEndDate('')
      setNoEndDate(true)
      setShiftTimes(getSmartDefaults(null))
      setCommuteToWork({ minutes: '30', method: 'drive' })
      setCommuteFromWork({ minutes: '30', method: 'drive' })

      setShowClearConfirm(false)
      
      const result = await response.json()
      console.log('[RotaSetup] Clear result:', result)
      
      // Dispatch custom event to refresh calendar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rota-cleared'))
      }
      
      alert('Rota cleared successfully. You can now set up a new shift pattern.')
      
      // Small delay before navigation to ensure deletion is processed
      setTimeout(() => {
        // Navigate to calendar to see the cleared state
        router.push('/rota')
        router.refresh()
      }, 200)
    } catch (err: any) {
      console.error('[RotaSetup] Clear error:', err)
      alert(`Failed to clear rota: ${err.message || 'Unknown error'}`)
    } finally {
      setClearing(false)
    }
  }

  const handleSavePattern = async () => {
    if (!selectedPattern || !selectedShiftHours || selectedTodayPosition === null) {
      alert('Please complete all steps: select pattern, configure times, and select your position today')
      return
    }

    setSaving(true)

    try {
      const patternSlots = getPatternSlots(selectedPattern)
      const shiftLength = selectedShiftHours === 'custom' ? customHours : selectedShiftHours
      
      // Prepare color config based on our color scheme
      const colorConfig = {
        morning: '#10B981', // Green
        day: '#3B82F6', // Blue
        afternoon: '#A855F7', // Purple
        night: '#EF4444', // Red
        off: 'transparent',
      }

      // Save pattern to rota_patterns table
      const patternResponse = await fetch('/api/rota/pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftLength,
          patternId: selectedPattern,
          patternSlots,
          currentShiftIndex: selectedTodayPosition - 1, // Convert to 0-based index
          startDate: startDate,
          colorConfig,
          notes: null,
        }),
      })

      if (!patternResponse.ok) {
        const error = await patternResponse.json()
        throw new Error(error.detail || 'Failed to save pattern')
      }

      // Apply pattern to calendar (save shifts to shifts table)
      const applyResponse = await fetch('/api/rota/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patternId: selectedPattern,
          startDate: startDate,
          startCycleIndex: selectedTodayPosition - 1,
          shiftTimes,
          commute: {
            toWork: {
              minutes: parseInt(commuteToWork.minutes) || 0,
              method: commuteToWork.method,
            },
            fromWork: {
              minutes: parseInt(commuteFromWork.minutes) || 0,
              method: commuteFromWork.method,
            },
          },
          endDate: noEndDate ? null : endDate,
        }),
      })

      if (!applyResponse.ok) {
        const error = await applyResponse.json()
        throw new Error(error.detail || 'Failed to apply pattern to calendar')
      }

      // Dispatch event to refresh calendar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rota-saved'))
      }

      // Success - navigate to calendar
      router.push('/rota')
      router.refresh()
    } catch (err: any) {
      console.error('[RotaSetup] Save error:', err)
      alert(`Failed to save pattern: ${err.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const month = cursorDate.getMonth()
  const year = cursorDate.getFullYear()

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        month: 'long',
        year: 'numeric',
      }).format(cursorDate),
    [cursorDate],
  )

  const goToPrevMonth = () => {
    setCursorDate((prev) => {
      const next = new Date(prev)
      next.setMonth(prev.getMonth() - 1)
      return new Date(next.getFullYear(), next.getMonth(), 1)
    })
  }

  const goToNextMonth = () => {
    setCursorDate((prev) => {
      const next = new Date(prev)
      next.setMonth(prev.getMonth() + 1)
      return new Date(next.getFullYear(), next.getMonth(), 1)
    })
  }

  // Generate calendar days
  const calendarWeeks = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startWeekday = (firstDay.getDay() + 6) % 7 // Monday = 0

    const cells: Array<{ dayNumber: number; date: string; isCurrentMonth: boolean } | null> = []

    // Add empty cells for days before month starts
    for (let i = 0; i < startWeekday; i++) {
      cells.push(null)
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().slice(0, 10)
      cells.push({
        dayNumber: day,
        date: dateStr,
        isCurrentMonth: true,
      })
    }

    // Fill remaining cells to complete weeks
    while (cells.length % 7 !== 0) {
      cells.push(null)
    }

    // Group into weeks
    const weeks: Array<Array<{ dayNumber: number; date: string; isCurrentMonth: boolean } | null>> = []
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7))
    }

    return weeks
  }, [year, month])

  const todayISO = today.toISOString().slice(0, 10)

  const canContinue =
    currentStep === 1
      ? !!selectedShiftHours && (selectedShiftHours !== 'custom' || !!customHours)
      : currentStep === 2
      ? !!selectedPattern && selectedShiftHours !== 'custom'
      : false

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 dark:from-slate-950 to-white dark:to-slate-900">
      <div className="mx-auto max-w-md px-4 py-6">
          {/* Header with Clear Button – top of card */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  router.push('/rota')
                  router.refresh()
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100 active:scale-95 transition-all"
                aria-label="Back to calendar"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Rota Setup</h2>
            </div>
            <button
              type="button"
              onClick={handleClearRota}
              disabled={clearing}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-500 dark:bg-red-600 px-4 py-1 text-xs font-semibold text-white transition-all hover:bg-red-600 dark:hover:bg-red-700 active:bg-red-700 dark:active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm dark:shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span>{clearing ? 'Clearing…' : 'Clear rota'}</span>
            </button>
          </div>

          {/* Today's Shift Info */}
          {showPreview && todayShiftInfo && (
            <div className="mb-4 rounded-xl border-2 border-sky-300 dark:border-sky-600/50 bg-gradient-to-br from-sky-50 dark:from-sky-950/30 to-indigo-50 dark:to-indigo-950/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                    {todayShiftInfo.isWorking ? 'Working Today' : 'Off Today'}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                    {todayShiftInfo.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    Day {todayShiftInfo.dayInCycle} of {getPatternSlots(selectedPattern || '').length} in cycle
                  </p>
                </div>
                {todayShiftInfo.isWorking && (
                  <div className="rounded-full bg-sky-500 dark:bg-sky-600 p-2">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mini Calendar Preview */}
          <div className="mb-6 rounded-[28px] bg-white/95 dark:bg-slate-900/45 p-4 border border-slate-200/50 dark:border-slate-700/40">
            
            <div className="relative z-10">
            {/* Calendar Header */}
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={goToPrevMonth}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 active:scale-95"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              </button>

              <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 antialiased">{monthLabel}</h3>

              <button
                type="button"
                onClick={goToNextMonth}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 active:scale-95"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-1.5">
              {/* Weekday Labels */}
              <div className="grid grid-cols-7 gap-1">
                {weekdayLabels.map((label, idx) => (
                  <div key={`${label}-${idx}`} className="text-center">
                    <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide antialiased">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Calendar Weeks */}
              {calendarWeeks.map((week, weekIdx) => (
                <div key={`week-${weekIdx}`} className="space-y-1">
                  {/* Dates Row */}
                  <div className="grid grid-cols-7 gap-1">
                    {week.map((day, dayIdx) => {
                      if (!day) {
                        return <div key={`empty-${weekIdx}-${dayIdx}`} className="h-7" />
                      }

                      const isToday = day.date === todayISO

                      return (
                        <div key={day.date} className="flex flex-col items-center">
                          <div
                            className={[
                              'flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-semibold transition-all antialiased',
                              isToday
                                ? 'bg-sky-500 dark:bg-sky-600 text-white shadow-sm shadow-sky-500/30 dark:shadow-sky-500/40'
                                : day.isCurrentMonth
                                  ? 'text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                  : 'text-slate-300 dark:text-slate-600',
                            ].join(' ')}
                          >
                            {day.dayNumber}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Shift Blocks Row - Preview */}
                  <div className="grid grid-cols-7 gap-1" style={{ minHeight: '16px' }}>
                    {week.map((day, dayIdx) => {
                      if (!day) {
                        return <div key={`block-empty-${weekIdx}-${dayIdx}`} className="h-2" />
                      }

                      const previewShift = showPreview ? previewData.get(day.date) : null
                      const isToday = day.date === todayISO

                      return (
                        <div key={`block-${day.date}`} className="flex flex-col gap-0.5 items-stretch">
                          {previewShift && (
                              previewShift.type === 'off' ? (
                              <div
                                className={[
                                  'rounded-md px-1 py-0.5 text-center min-h-[12px] flex items-center justify-center border border-slate-200 dark:border-slate-700/40',
                                  isToday ? 'border-sky-500 dark:border-sky-600 border-2 bg-sky-50 dark:bg-sky-950/30' : 'bg-slate-50 dark:bg-slate-800/50',
                                ].join(' ')}
                              >
                                <span className={[
                                  'text-[8px] font-medium leading-tight block truncate antialiased',
                                  isToday ? 'text-sky-700 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400',
                                ].join(' ')}>
                                  {previewShift.label}
                                </span>
                              </div>
                            ) : (
                              <div
                                className={[
                                  'rounded-md px-1 py-0.5 text-center min-h-[12px] flex items-center justify-center',
                                  isToday ? 'ring-2 ring-sky-400 ring-offset-1' : '',
                                ].join(' ')}
                                style={{
                                  backgroundColor: previewShift.color || '#3B82F6',
                                  boxShadow: isToday ? '0 2px 4px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.1)',
                                }}
                              >
                                <span className="text-[8px] font-medium text-white leading-tight block truncate antialiased drop-shadow-sm">
                                  {previewShift.label}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>

          {/* Premium Segmented Control Stepper */}
          <div className="mb-5 rounded-3xl bg-white/70 dark:bg-slate-900/45 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-18px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)] p-2">
            <div className="flex items-center gap-2">
              {/* Step 1 */}
              <div
                className={[
                  'flex flex-1 flex-col rounded-2xl px-4 py-3 transition-all',
                  currentStep === 1
                    ? 'bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_8px_20px_-16px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_20px_-16px_rgba(0,0,0,0.4)]'
                    : 'px-4 py-3 rounded-2xl text-slate-500 dark:text-slate-400',
                ].join(' ')}
              >
                <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  STEP 1
                </p>
                <p className="mt-1 text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  Shift hours
                </p>
              </div>

              {/* Step 2 */}
              <div
                className={[
                  'flex flex-1 flex-col rounded-2xl px-4 py-3 transition-all',
                  currentStep === 2
                    ? 'bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_8px_20px_-16px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_20px_-16px_rgba(0,0,0,0.4)]'
                    : 'px-4 py-3 rounded-2xl text-slate-500 dark:text-slate-400',
                ].join(' ')}
              >
                <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  STEP 2
                </p>
                <p className="mt-1 text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  Pattern
                </p>
              </div>

              {/* Step 3 */}
              <div
                className={[
                  'flex flex-1 flex-col rounded-2xl px-4 py-3 transition-all',
                  currentStep === 3
                    ? 'bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 shadow-[0_8px_20px_-16px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_20px_-16px_rgba(0,0,0,0.4)]'
                    : 'px-4 py-3 rounded-2xl text-slate-500 dark:text-slate-400',
                ].join(' ')}
              >
                <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  STEP 3
                </p>
                <p className="mt-1 text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  Times &amp; sync
                </p>
              </div>
            </div>
          </div>

          {/* Premium Glass Card */}
          <div className="mt-5 relative overflow-hidden rounded-3xl bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)] p-6">
            {/* Highlight overlay */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
            
            {/* Inner ring */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />
            
            <div className="relative z-10">
              {/* STEP 1 – SHIFT HOURS */}
              {currentStep === 1 && (
                <div>
                  <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    Select shift hours
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-w-prose">
                    Pick the shift length you work most often. You can fine-tune exact start/finish times later.
                  </p>
                
                  <div className="mt-5 space-y-4">
                    {/* Primary, most common options - Choice Chips */}
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { id: '12h', label: '12hr', value: '12h' as ShiftLength },
                        { id: '8h', label: '8hr', value: '8h' as ShiftLength },
                        { id: '10h', label: '10hr', value: '10h' as ShiftLength },
                        { id: 'custom', label: 'Custom', value: 'custom' as ShiftLength },
                      ].map((option) => {
                        const isSelected = selectedShiftHours === option.value
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setSelectedShiftHours(option.value)
                              if (option.value !== 'custom') {
                                setCustomHours('')
                              }
                            }}
                            className={[
                              'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60 dark:focus-visible:ring-slate-600/60 focus-visible:ring-offset-2',
                              isSelected
                                ? 'bg-white/80 dark:bg-slate-800/50 border border-emerald-200/50 dark:border-emerald-800/40 shadow-[0_10px_26px_-18px_rgba(0,0,0,0.18)] dark:shadow-[0_10px_26px_-18px_rgba(0,0,0,0.4)] text-slate-800 dark:text-slate-100'
                                : 'bg-slate-50/40 dark:bg-slate-800/30 border border-slate-200/40 dark:border-slate-700/40 text-slate-800 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/50 hover:border-slate-200/60 dark:hover:border-slate-600/60',
                            ].join(' ')}
                          >
                            {option.label}
                            {option.value === '12h' && (
                              <span className="rounded-full px-2.5 py-1 text-[11px] font-medium bg-emerald-100/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 text-emerald-700/80 dark:text-emerald-300">
                                Most common
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Secondary options, hidden behind a subtle text button */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowAllShiftLengths((prev) => !prev)}
                        className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
                      >
                        {showAllShiftLengths ? 'Hide less common shift lengths' : 'Show less common shift lengths'}
                      </button>

                      {showAllShiftLengths && (
                        <div className="flex flex-wrap items-center gap-2">
                          {[
                            { id: '24h', label: '24hr', value: '24h' as ShiftLength },
                            { id: '16h', label: '16hr', value: '16h' as ShiftLength },
                            { id: '6h', label: '6hr', value: '6h' as ShiftLength },
                            { id: '4h', label: '4hr', value: '4h' as ShiftLength },
                          ].map((option) => {
                            const isSelected = selectedShiftHours === option.value
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => {
                                  setSelectedShiftHours(option.value)
                                  if (option.value !== 'custom') {
                                    setCustomHours('')
                                  }
                                }}
                                className={[
                                  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60 focus-visible:ring-offset-2',
                                  isSelected
                                    ? 'bg-white/80 border border-emerald-200/50 shadow-[0_10px_26px_-18px_rgba(0,0,0,0.18)] text-slate-800'
                                    : 'bg-slate-50/40 border border-slate-200/40 text-slate-800 hover:bg-white/80 hover:border-slate-200/60',
                                ].join(' ')}
                              >
                                {option.label}
                              </button>
                            )
                          })}
                        </div>
                      )}
                  </div>

                  {/* Custom Hours Input */}
                  {selectedShiftHours === 'custom' && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700/40 bg-gradient-to-br from-slate-50 dark:from-slate-800/50 to-white dark:to-slate-900/50 p-4 shadow-sm dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                        Enter Your Shift Hours
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          max="24"
                          step="0.5"
                          value={customHours}
                          onChange={(e) => setCustomHours(e.target.value)}
                          placeholder="e.g., 10, 14, 10.5"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 shadow-sm transition-all focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/20 dark:focus:ring-sky-500/30"
                        />
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">hours</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Enter the number of hours you work per shift (e.g., 10, 14, 10.5)
                      </p>
                    </div>
                  )}
                </div>

                  {/* CalAI Magic Hint */}
                  <div className="mt-5 rounded-2xl p-4 bg-gradient-to-br from-slate-50/70 dark:from-slate-800/50 to-white dark:to-slate-900/50 border border-slate-200/50 dark:border-slate-700/40">
                    <p className="text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      Why we ask
                    </p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Shift length helps ShiftCoach predict energy dips and suggest the best meal and sleep timing.
                    </p>
                  </div>

                  {/* Navigation inside the Select shift hours card */}
                  <div className="mt-6 pt-5 flex items-center justify-between border-t border-slate-200/50 dark:border-slate-700/40">
                    <button
                      type="button"
                      onClick={() => setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as SetupStep) : prev))}
                      disabled={currentStep === 1}
                      className="rounded-full px-5 py-3 bg-white/60 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-slate-800/70 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60 dark:focus-visible:ring-slate-600/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as SetupStep) : prev))}
                      disabled={!canContinue}
                      className="rounded-full px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold shadow-[0_14px_30px_-18px_rgba(0,0,0,0.35)] dark:shadow-[0_14px_30px_-18px_rgba(255,255,255,0.1)] hover:opacity-95 dark:hover:opacity-90 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60 dark:focus-visible:ring-slate-600/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Continue
                    </button>
                  </div>
              </div>
            )}

            {/* STEP 2 & 3 – PATTERN + DETAIL */}
            {currentStep >= 2 && (
              <div className="relative z-10">
                {currentStep === 2 && (
                  <>
                    <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                      Select Shift Pattern
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-w-prose">
                      Choose the pattern that matches your work schedule.
                    </p>
                  </>
                )}
                {!selectedShiftHours ? (
                  <div className="mt-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/40 bg-slate-50/40 dark:bg-slate-800/50 p-6 text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Please select your shift hours first to see available patterns
                    </p>
                  </div>
                ) : selectedShiftHours === 'custom' ? (
                  <div className="mt-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/40 bg-gradient-to-br from-slate-50/70 dark:from-slate-800/50 to-white dark:to-slate-900/50 p-6 text-center">
                    <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Custom patterns</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      A full custom pattern builder is coming soon. For now, choose the shift length that&apos;s
                      closest to your real pattern and we&apos;ll keep things simple.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-5">
                    {/* STEP 2 – Pattern selector */}
                    {currentStep === 2 && (
                      <>
                        <div className="relative">
                          <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            SHIFT PATTERN
                          </label>
                          <div className="relative">
                            <select
                              value={selectedPattern || ''}
                              onChange={(e) => setSelectedPattern(e.target.value)}
                              className="w-full appearance-none rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white/80 dark:bg-slate-800/50 backdrop-blur px-4 py-3.5 pr-10 text-sm font-semibold text-slate-900 dark:text-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all focus:border-slate-300/60 dark:focus:border-slate-600/60 focus:outline-none focus:ring-2 focus:ring-slate-300/40 dark:focus:ring-slate-600/40 focus:ring-offset-2 hover:border-slate-300/60 dark:hover:border-slate-600/60"
                            >
                              <option value="">Select a pattern...</option>
                              {availablePatterns.map((pattern) => (
                                <option key={pattern.id} value={pattern.id}>
                                  {pattern.label}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                              <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" strokeWidth={2} />
                            </div>
                          </div>
                        </div>

                        {selectedPattern && (
                          <div className="rounded-2xl border border-slate-200/50 dark:border-slate-700/40 bg-gradient-to-br from-slate-50/70 dark:from-slate-800/50 to-white dark:to-slate-900/50 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                              {availablePatterns.find((p) => p.id === selectedPattern)?.description}
                            </p>
                            {availablePatterns.find((p) => p.id === selectedPattern)?.commonIn &&
                              availablePatterns.find((p) => p.id === selectedPattern)!.commonIn!.length > 0 && (
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Common in:</span>
                                  {availablePatterns
                                    .find((p) => p.id === selectedPattern)!
                                    .commonIn!.map((location) => (
                                      <span
                                        key={location}
                                        className="rounded-full bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/40 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300"
                                      >
                                        {location}
                                      </span>
                                    ))}
                                </div>
                              )}
                          </div>
                        )}
                      </>
                    )}

                    {/* STEP 3 – summary + times, commute, today selector, preview/save (tabbed) */}
                    {currentStep === 3 && selectedPattern && (
                      <div className="space-y-4">
                        {/* Compact pattern summary pill */}
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50/80 dark:bg-slate-800/50 px-3 py-2">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.16em]">
                              Pattern
                            </span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {availablePatterns.find((p) => p.id === selectedPattern)?.label || 'Selected pattern'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">Step 3 of 3</span>
                        </div>

                        {/* Tabs */}
                        <div className="rounded-xl bg-transparent p-3">
                          <div className="mb-3 flex items-center gap-2 rounded-full bg-white/70 dark:bg-slate-800/50 p-1">
                            {(['times', 'commute', 'today'] as DetailTab[]).map((tab) => {
                              const label =
                                tab === 'times' ? 'Times' : tab === 'commute' ? 'Commute' : 'Today';
                              const active = detailTab === tab;
                              return (
                                <button
                                  key={tab}
                                  type="button"
                                  onClick={() => setDetailTab(tab)}
                                  className={[
                                    'flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                                    active
                                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
                                  ].join(' ')}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Times tab */}
                          {detailTab === 'times' && (
                            <div className="space-y-3 pt-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Set shift times</h3>
                                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    Start and end for each type in your pattern.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowTimeConfig((prev) => !prev)}
                                  className="rounded-full border border-slate-300 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/70"
                                >
                                  {showTimeConfig ? 'Hide' : 'Configure'}
                                </button>
                              </div>

                              {showTimeConfig && (
                                <div className="space-y-4">
                                  {getRelevantShiftTypes.map((shiftType) => {
                                    const shiftTypeConfig = {
                                      morning: { label: 'Morning shift', icon: Sun, color: 'text-sky-500' },
                                      day: { label: 'Day shift', icon: Sun, color: 'text-blue-500' },
                                      afternoon: { label: 'Afternoon shift', icon: Sun, color: 'text-orange-500' },
                                      evening: { label: 'Evening shift', icon: Moon, color: 'text-purple-500' },
                                      night: { label: 'Night shift', icon: Moon, color: 'text-indigo-500' },
                                    }[shiftType] || { label: `${shiftType} shift`, icon: Sun, color: 'text-slate-500' };

                                    const Icon = shiftTypeConfig.icon;
                                    const isNightShift = shiftType === 'night' || shiftType === 'evening';

                                    return (
                                      <div key={shiftType} className="rounded-lg border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 p-3">
                                        <div className="mb-2 flex items-center gap-2">
                                          <Icon className={`h-4 w-4 ${shiftTypeConfig.color}`} />
                                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            {shiftTypeConfig.label}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                                              Start
                                            </label>
                                            <input
                                              type="time"
                                              value={shiftTimes[shiftType]?.start || ''}
                                              onChange={(e) =>
                                                setShiftTimes((prev) => ({
                                                  ...prev,
                                                  [shiftType]: { ...prev[shiftType], start: e.target.value },
                                                }))
                                              }
                                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/20 dark:focus:ring-sky-500/30"
                                            />
                                          </div>
                                          <div>
                                            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                                              End
                                            </label>
                                            <input
                                              type="time"
                                              value={shiftTimes[shiftType]?.end || ''}
                                              onChange={(e) =>
                                                setShiftTimes((prev) => ({
                                                  ...prev,
                                                  [shiftType]: { ...prev[shiftType], end: e.target.value },
                                                }))
                                              }
                                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/20 dark:focus:ring-sky-500/30"
                                            />
                                            {isNightShift && (
                                              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">(Next day if after midnight)</p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {getRelevantShiftTypes.length === 0 && (
                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/50 p-4 text-center">
                                      <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Select a pattern to configure shift times.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Commute tab */}
                          {detailTab === 'commute' && (
                            <div className="space-y-3 pt-1">
                              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Commuting settings</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                We&apos;ll use this to fine‑tune your sleep and activity recommendations.
                              </p>

                              <div className="space-y-4">
                                {/* Commute To Work */}
                                <div className="rounded-lg border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 p-3">
                                  <div className="mb-3 flex items-center gap-2">
                                    <Car className="h-4 w-4 text-sky-500 dark:text-sky-400" />
                                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">To work</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                                        Time (minutes)
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="300"
                                        value={commuteToWork.minutes}
                                        onChange={(e) =>
                                          setCommuteToWork((prev) => ({
                                            ...prev,
                                            minutes: e.target.value,
                                          }))
                                        }
                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/20 dark:focus:ring-sky-500/30"
                                        placeholder="30"
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                                        Method
                                      </label>
                                      <select
                                        value={commuteToWork.method}
                                        onChange={(e) =>
                                          setCommuteToWork((prev) => ({
                                            ...prev,
                                            method: e.target.value,
                                          }))
                                        }
                                        className="w-full appearance-none rounded-lg border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/20 dark:focus:ring-sky-500/30"
                                      >
                                        <option value="walk">Walk</option>
                                        <option value="bike">Bike</option>
                                        <option value="drive">Drive</option>
                                        <option value="taxi">Taxi</option>
                                        <option value="other">Other</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>

                                {/* Commute From Work */}
                                <div className="rounded-lg border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 p-3">
                                  <div className="mb-3 flex items-center gap-2">
                                    <Car className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">From work</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                                        Time (minutes)
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="300"
                                        value={commuteFromWork.minutes}
                                        onChange={(e) =>
                                          setCommuteFromWork((prev) => ({
                                            ...prev,
                                            minutes: e.target.value,
                                          }))
                                        }
                                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/20 dark:focus:ring-sky-500/30"
                                        placeholder="30"
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                                        Method
                                      </label>
                                      <select
                                        value={commuteFromWork.method}
                                        onChange={(e) =>
                                          setCommuteFromWork((prev) => ({
                                            ...prev,
                                            method: e.target.value,
                                          }))
                                        }
                                        className="w-full appearance-none rounded-lg border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/20 dark:focus:ring-sky-500/30"
                                      >
                                        <option value="walk">Walk</option>
                                        <option value="bike">Bike</option>
                                        <option value="drive">Drive</option>
                                        <option value="taxi">Taxi</option>
                                        <option value="other">Other</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Today tab */}
                          {detailTab === 'today' && (
                            <div className="space-y-4 pt-1">
                              {patternCycleOptions.length > 0 && (
                                <div className="rounded-xl bg-transparent p-0">
                                  <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    Where are you in your pattern today?
                                  </label>
                                  <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                                    Select today&apos;s shift or rest day so your calendar and coach stay in sync.
                                  </p>
                                  <div className="relative">
                                    <select
                                      value={selectedTodayPosition || ''}
                                      onChange={(e) => setSelectedTodayPosition(parseInt(e.target.value))}
                                      className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 px-4 py-3 pr-10 text-sm font-semibold text-slate-900 dark:text-slate-100 shadow-sm focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/20 dark:focus:ring-sky-500/30"
                                    >
                                      <option value="">Select your position today...</option>
                                      {patternCycleOptions.map((option) => (
                                        <option key={option.index} value={option.index}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                      <ChevronDown className="h-5 w-5 text-slate-400 dark:text-slate-500" strokeWidth={2} />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Preview and Save Buttons */}
                              <div className="mt-2 flex gap-3">
                                <button
                                  type="button"
                                  onClick={handlePreview}
                                  className="flex-1 rounded-xl border-2 border-sky-500 dark:border-sky-600 bg-white dark:bg-slate-800/50 px-4 py-3 text-sm font-semibold text-sky-600 dark:text-sky-400 shadow-sm transition-all hover:bg-sky-50 dark:hover:bg-slate-800/70 active:scale-95"
                                >
                                  Preview on calendar
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSavePattern}
                                  disabled={saving}
                                  className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 dark:from-sky-600 to-indigo-500 dark:to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-sky-500/30 dark:shadow-sky-500/40 transition-all hover:from-sky-600 dark:hover:from-sky-700 hover:to-indigo-600 dark:hover:to-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {saving ? 'Saving…' : 'Save pattern'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation controls – for steps 2 and 3 only, stay at bottom of card */}
          {currentStep >= 2 && (
            <div className="mt-6 pt-5 flex items-center justify-between border-t border-slate-200/50 dark:border-slate-700/40">
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as SetupStep) : prev))}
                className="rounded-full px-5 py-3 bg-white/60 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-slate-800/70 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60 dark:focus-visible:ring-slate-600/60 focus-visible:ring-offset-2"
              >
                Back
              </button>
              {currentStep < 3 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as SetupStep) : prev))}
                  disabled={!canContinue}
                  className="rounded-full px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold shadow-[0_14px_30px_-18px_rgba(0,0,0,0.35)] dark:shadow-[0_14px_30px_-18px_rgba(255,255,255,0.1)] hover:opacity-95 dark:hover:opacity-90 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60 dark:focus-visible:ring-slate-600/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pattern Confirmation Modal */}
      {showPatternConfirmation && recognizedPattern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[32px] border border-slate-200/80 dark:border-slate-700/40 bg-white dark:bg-slate-900/95 p-6 shadow-2xl dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
            {/* Premium gradient overlay */}
            <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-gradient-to-b from-white/98 dark:from-slate-900/70 via-white/90 dark:via-slate-900/50 to-white/85 dark:to-slate-950/60" />
            <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-gradient-to-br from-blue-50/20 dark:from-blue-950/15 via-transparent to-indigo-50/20 dark:to-indigo-950/15" />
            
            {/* Inner ring */}
            <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />
            
            <div className="relative z-10">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-sky-500 dark:from-sky-600 to-indigo-500 dark:to-indigo-600 p-2">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Implement Pattern</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Confirm your shift pattern details</p>
              </div>
            </div>

            {/* Pattern Preview */}
            <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Recognized Pattern ({recognizedPattern.cycleLength} days)
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {recognizedPattern.cycle
                  .map((s) => {
                    if (s === 'day') return 'Day'
                    if (s === 'night') return 'Night'
                    return 'Off'
                  })
                  .join(' → ')}
              </p>
            </div>

            {/* Date Options */}
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm transition-all focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/20 dark:focus:ring-sky-500/30"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={noEndDate}
                    onChange={(e) => {
                      setNoEndDate(e.target.checked)
                      if (e.target.checked) {
                        setEndDate('')
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-sky-500 dark:text-sky-400 focus:ring-sky-400 dark:focus:ring-sky-500"
                  />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    No End Date (Continue Forever)
                  </span>
                </label>
              </div>

              {!noEndDate && (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm transition-all focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/20 dark:focus:ring-sky-500/30"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowPatternConfirmation(false)}
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800/70 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImplementPattern}
                className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 dark:from-sky-600 to-indigo-500 dark:to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/30 dark:shadow-sky-500/40 transition-all hover:from-sky-600 dark:hover:from-sky-700 hover:to-indigo-600 dark:hover:to-indigo-700 active:scale-95"
              >
                <span className="flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" />
                  Implement Pattern
                </span>
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Rota Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[32px] border border-slate-200/80 dark:border-slate-700/40 bg-white dark:bg-slate-900/95 p-6 shadow-2xl dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
            {/* Premium gradient overlay */}
            <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-gradient-to-b from-white/98 dark:from-slate-900/70 via-white/90 dark:via-slate-900/50 to-white/85 dark:to-slate-950/60" />
            <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-gradient-to-br from-red-50/20 dark:from-red-950/15 via-transparent to-transparent" />
            
            {/* Inner ring */}
            <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />
            
            <div className="relative z-10">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-red-500 dark:from-red-600 to-red-600 dark:to-red-700 p-2">
                <Trash2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Clear Rota</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This will remove your shift pattern</p>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30 p-3">
              <p className="text-sm font-medium text-red-900 dark:text-red-300">
                Are you sure you want to clear your rota? This will:
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-red-700 dark:text-red-400">
                <li>Delete your shift pattern configuration</li>
                <li>Remove all future shifts from your calendar</li>
                <li>Reset all rota settings</li>
              </ul>
              <p className="mt-2 text-xs font-semibold text-red-800 dark:text-red-400">
                This action cannot be undone.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700/40 bg-white dark:bg-slate-800/50 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800/70 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearRota}
                disabled={clearing}
                className="flex-1 rounded-xl bg-gradient-to-r from-red-500 dark:from-red-600 to-red-600 dark:to-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-500/30 dark:shadow-red-500/40 transition-all hover:from-red-600 dark:hover:from-red-700 hover:to-red-700 dark:hover:to-red-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearing ? 'Clearing...' : 'Clear Rota'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
