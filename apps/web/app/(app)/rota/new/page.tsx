'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft } from 'lucide-react'
import {
  PATTERNS_BY_LENGTH,
  getPatternDescription,
  type ShiftLength,
} from '@/lib/rota/patternPresets'
import { getPatternSlots, type ShiftSlot } from '@/lib/rota/patternSlots'

const SHIFT_LENGTHS: ShiftLength[] = ['8h', '12h', '16h']

// Helper to generate ordinal labels
const ordinal = (n: number) => {
  if (n === 1) return '1st'
  if (n === 2) return '2nd'
  if (n === 3) return '3rd'
  return `${n}th`
}

// Generate shift options dynamically from pattern slots
function generateShiftOptions(slots: ShiftSlot[], shiftLength: ShiftLength): string[] {
  const options: string[] = []
  
  // Count occurrences of each type
  const counts: Record<string, number> = { M: 0, A: 0, D: 0, N: 0, O: 0 }
  
  for (const slot of slots) {
    const upper = slot.toUpperCase() as 'M' | 'A' | 'D' | 'N' | 'O'
    counts[upper] = (counts[upper] || 0) + 1
  }
  
  // Generate options based on shift length
  if (shiftLength === '8h') {
    // 8h patterns use M, A, N, O
    for (let i = 1; i <= counts.M; i++) {
      options.push(`${ordinal(i)} morning shift`)
    }
    for (let i = 1; i <= counts.A; i++) {
      options.push(`${ordinal(i)} afternoon shift`)
    }
    for (let i = 1; i <= counts.N; i++) {
      options.push(`${ordinal(i)} night shift`)
    }
    for (let i = 1; i <= counts.O; i++) {
      options.push(`${ordinal(i)} off day`)
    }
  } else {
    // 12h and 16h patterns use D, N, O
    for (let i = 1; i <= counts.D; i++) {
      options.push(`${ordinal(i)} day shift`)
    }
    for (let i = 1; i <= counts.N; i++) {
      options.push(`${ordinal(i)} night shift`)
    }
    for (let i = 1; i <= counts.O; i++) {
      options.push(`${ordinal(i)} off day`)
    }
  }
  
  return options
}

type ShiftColorConfig = {
  morning: string
  afternoon: string
  day: string
  night: string
  off: string
}

const SHIFT_COLOR_PRESETS = [
  { id: 'blue', label: 'Blue', value: '#2563EB' },
  { id: 'indigo', label: 'Indigo', value: '#4F46E5' },
  { id: 'red', label: 'Red', value: '#EF4444' },
  { id: 'green', label: 'Green', value: '#22C55E' },
  { id: 'yellow', label: 'Yellow', value: '#FACC15' },
  { id: 'purple', label: 'Purple', value: '#8B5CF6' },
  { id: 'teal', label: 'Teal', value: '#14B8A6' },
  { id: 'white', label: 'White', value: '#FFFFFF' },
]

const OFF_COLOR_PRESETS = [
  { id: 'none', label: 'No colour', value: 'transparent' },
  { id: 'blue', label: 'Blue', value: '#2563EB' },
  { id: 'green', label: 'Green', value: '#22C55E' },
  { id: 'yellow', label: 'Yellow', value: '#FACC15' },
  { id: 'white', label: 'White', value: '#FFFFFF' },
]

const PRESET_SLOT_LABELS: Record<string, string[]> = {
  morning: ['1st morning shift', '2nd morning shift', '3rd morning shift', '4th morning shift'],
  afternoon: ['1st afternoon shift', '2nd afternoon shift', '3rd afternoon shift', '4th afternoon shift'],
  night: ['1st night shift', '2nd night shift', '3rd night shift', '4th night shift'],
  off: ['1st off day', '2nd off day', '3rd off day', '4th off day'],
}

export default function NewRotaPatternPage() {
  const router = useRouter()

  const [shiftLength, setShiftLength] = useState<ShiftLength>('12h')
  const [selectedPatternId, setSelectedPatternId] = useState<string>(
    PATTERNS_BY_LENGTH['12h'][0]?.id ?? '',
  )
  const [currentShift, setCurrentShift] = useState<string>('1st day shift')
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  })
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const [shiftColors, setShiftColors] = useState<ShiftColorConfig>({
    morning: '#2563EB',
    afternoon: '#4F46E5',
    day: '#2563EB',
    night: '#EF4444',
    off: 'transparent',
  })

  const patterns = useMemo(() => PATTERNS_BY_LENGTH[shiftLength], [shiftLength])

  const activePattern =
    patterns.find((pattern) => pattern.id === selectedPatternId) ?? patterns[0]

  const previewSlots: ShiftSlot[] = useMemo(
    () => getPatternSlots(activePattern?.id),
    [activePattern?.id],
  )
  
  const currentShiftOptions = useMemo(() => {
    return generateShiftOptions(previewSlots, shiftLength)
  }, [previewSlots, shiftLength])

  const patternDescription = getPatternDescription(activePattern?.id)

  useEffect(() => {
    const nextPatterns = PATTERNS_BY_LENGTH[shiftLength] ?? []
    if (!nextPatterns.some((pattern) => pattern.id === selectedPatternId)) {
      setSelectedPatternId(nextPatterns[0]?.id ?? '')
    }
  }, [shiftLength, selectedPatternId])

  useEffect(() => {
    if (shiftLength === '8h' && shiftColors.day !== shiftColors.morning) {
      setShiftColors((prev) => ({ ...prev, day: prev.morning }))
    }
  }, [shiftLength, shiftColors.day, shiftColors.morning])

  useEffect(() => {
    const options = generateShiftOptions(previewSlots, shiftLength)
    if (options.length > 0 && !options.includes(currentShift)) {
      setCurrentShift(options[0])
    }
  }, [shiftLength, previewSlots, currentShift])

  const morningColorHex = shiftColors.morning || shiftColors.day || '#2563EB'
  const afternoonColorHex = shiftColors.afternoon || shiftColors.day || '#4F46E5'
  const dayColorHex = shiftColors.day || shiftColors.morning || '#2563EB'
  const nightColorHex = shiftColors.night || '#EF4444'
  const offColorHex = shiftColors.off ?? 'transparent'

  const handleSave = async () => {
    if (saving) return
    if (!activePattern || !startDate) return

    const slotSequence = previewSlots.map((slot) => slot.toUpperCase())
    if (!slotSequence.length) {
      console.warn('[rota/new] no pattern slots to save')
      return
    }

    const resolveCurrentShiftIndex = () => {
      const label = currentShift.toLowerCase()
      const match = currentShift.match(/(\d+)/)
      const occurrence = match ? Number.parseInt(match[1], 10) || 1 : 1

      let target: 'M' | 'A' | 'D' | 'N' | 'O' = 'O'
      if (label.includes('off')) {
        target = 'O'
      } else if (label.includes('night')) {
        target = 'N'
      } else if (shiftLength === '8h') {
        if (label.includes('afternoon')) {
          target = 'A'
        } else {
          target = 'M'
        }
      } else {
        target = 'D'
      }

      let count = 0
      for (let i = 0; i < slotSequence.length; i += 1) {
        if (slotSequence[i] === target) {
          count += 1
          if (count === occurrence) {
            return i
          }
        }
      }

      return 0
    }

    const currentShiftIndex = resolveCurrentShiftIndex()

    const normalizedStartDate = (() => {
      const parsed = new Date(startDate)
      if (Number.isNaN(parsed.getTime())) return startDate
      return parsed.toISOString().slice(0, 10)
    })()

    const payload = {
      shiftLength,
      patternId: activePattern.id,
      patternSlots: slotSequence,
      currentShiftIndex,
      startDate: normalizedStartDate,
      colorConfig: shiftColors,
      notes: note?.trim() ? note.trim() : null,
    }

    console.log('[rota/new] saving rota pattern', payload)

    try {
      setSaving(true)
      const res = await fetch('/api/rota/pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      let responseText: string | null = null
      try {
        responseText = await res.text()
      } catch (e) {
        console.warn('[rota/new] failed to read response text', e)
      }

      if (!res.ok) {
        console.error('[rota/new] failed to save rota pattern', {
          status: res.status,
          statusText: res.statusText,
          body: responseText,
        })
        if (typeof window !== 'undefined') {
          alert('Could not save rota pattern. Check the dev console for details.')
        }
        return
      }

      console.log('[rota/new] save success', responseText)

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dashboardPage', '4')
        // Dispatch event to refresh settings (shift_pattern may have been auto-updated)
        window.dispatchEvent(new CustomEvent('rota-saved'))
      }

      // Navigate to dashboard and refresh to ensure calendar refetches
      router.push('/dashboard?tab=rota')
      router.refresh()
    } catch (err) {
      console.error('[rota/new] save error', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background: 'linear-gradient(180deg, #F7FAFF 0%, #EEF3FA 50%, #E7EDF9 100%)',
      }}
    >
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 shadow-sm"
        >
          <ChevronLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-base font-semibold text-slate-900">New rota</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 shadow-md text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Check className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 px-3 pb-4">
        <div
          className="mx-auto max-w-md overflow-hidden rounded-3xl"
          style={{
            backgroundColor: 'rgba(255,255,255,0.96)',
            boxShadow: '0 18px 40px rgba(15,23,42,0.10), 0 0 0 1px rgba(148,163,184,0.08)',
          }}
        >
          <div className="space-y-3 px-4 pb-3 pt-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Pattern
              </label>
              <div className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-900">
                {activePattern?.label}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Shift length
              </label>
              <div className="flex gap-2 rounded-2xl bg-slate-50/80 p-1">
                {SHIFT_LENGTHS.map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => {
                      setShiftLength(len)
                      const first = PATTERNS_BY_LENGTH[len][0]
                      if (first) {
                        setSelectedPatternId(first.id)
                      }
                    }}
                    className={`flex-1 rounded-2xl py-2 text-xs font-medium ${
                      shiftLength === len
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white'
                        : 'text-slate-500'
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Pattern presets
              </label>
              <select
                className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-900"
                value={selectedPatternId}
                onChange={(e) => setSelectedPatternId(e.target.value)}
              >
                {patterns.map((pattern) => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <div className="space-y-3 px-4 py-3 text-sm text-slate-900">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Start date
              </label>
              <input
                type="date"
                className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Current shift in pattern
              </label>
              <select
                className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-900"
                value={currentShift}
                onChange={(e) => setCurrentShift(e.target.value)}
              >
                {currentShiftOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-400">{patternDescription}</p>
            </div>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Shift colours
              </h3>
              <p className="text-xs text-slate-400">
                These colours will be used on your calendar for this rota.
              </p>

              {shiftLength === '8h' ? (
                <>
                  <ColorRow
                    label="Morning shifts"
                    color={shiftColors.morning}
                    onChange={(value) =>
                      setShiftColors((prev) => ({ ...prev, morning: value }))
                    }
                  />
                  <ColorRow
                    label="Afternoon shifts"
                    color={shiftColors.afternoon}
                    onChange={(value) =>
                      setShiftColors((prev) => ({ ...prev, afternoon: value }))
                    }
                  />
                  <ColorRow
                    label="Night shifts"
                    color={shiftColors.night}
                    onChange={(value) =>
                      setShiftColors((prev) => ({ ...prev, night: value }))
                    }
                  />
                  <OffColorRow
                    label="Days off"
                    color={shiftColors.off}
                    onChange={(value) =>
                      setShiftColors((prev) => ({ ...prev, off: value }))
                    }
                  />
                </>
              ) : (
                <>
                  <ColorRow
                    label="Day shifts"
                    color={shiftColors.day}
                    onChange={(value) =>
                      setShiftColors((prev) => ({ ...prev, day: value }))
                    }
                  />
                  <ColorRow
                    label="Night shifts"
                    color={shiftColors.night}
                    onChange={(value) =>
                      setShiftColors((prev) => ({ ...prev, night: value }))
                    }
                  />
                  <OffColorRow
                    label="Days off"
                    color={shiftColors.off}
                    onChange={(value) =>
                      setShiftColors((prev) => ({ ...prev, off: value }))
                    }
                  />
                </>
              )}

              <p className="text-[11px] text-slate-400">
                Select “No colour” if you prefer your off days to appear blank.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Pattern preview
              </h3>
              <p className="text-xs text-slate-400">
                This is how your shift blocks will repeat across the month.
              </p>

              <div className="flex gap-2">
                {previewSlots.map((slot, index) => {
                  const isMorning = slot === 'M'
                  const isAfternoon = slot === 'A'
                  const isDay = slot === 'D'
                  const isNight = slot === 'N'
                  const isOff = slot === 'O'

                  let background = 'transparent'
                  let textClass = 'text-slate-400'
                  let showBorder = true

                  if (isMorning) {
                    background = morningColorHex
                    textClass = 'text-white'
                    showBorder = false
                  } else if (isAfternoon) {
                    background = afternoonColorHex
                    textClass = 'text-white'
                    showBorder = false
                  } else if (isDay) {
                    background = dayColorHex
                    textClass = 'text-white'
                    showBorder = false
                  } else if (isNight) {
                    background = nightColorHex
                    textClass = 'text-white'
                    showBorder = false
                  } else if (isOff) {
                    if (offColorHex === 'transparent') {
                      background = 'transparent'
                      textClass = 'text-slate-400'
                      showBorder = true
                    } else {
                      background = offColorHex
                      textClass = 'text-white'
                      showBorder = false
                    }
                  }

                  const label =
                    slot === 'M'
                      ? 'M'
                      : slot === 'A'
                      ? 'A'
                      : slot === 'D'
                      ? 'D'
                      : slot === 'N'
                      ? 'N'
                      : 'O'

                  return (
                    <div
                      key={`${slot}-${index}`}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold shadow-sm ${
                        showBorder ? 'border border-slate-200' : 'border border-transparent'
                      }`}
                      style={{ backgroundColor: background }}
                    >
                      <span className={textClass}>{label}</span>
                    </div>
                  )
                })}
              </div>
            </section>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Notes (optional)
              </label>
              <textarea
                className="w-full resize-none rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                rows={2}
                placeholder="Anything special about this rota (e.g. ward, team, contract)?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function ColorRow({ label, color, onChange }: { label: string; color: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className="h-4 w-4 rounded-full border border-slate-200 shadow-sm"
          style={{ backgroundColor: color }}
        />
        <div className="relative">
          <select
            className="appearance-none rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
            value={color}
            onChange={(e) => onChange(e.target.value)}
          >
            {SHIFT_COLOR_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-slate-400">
            ▼
          </span>
        </div>
      </div>
    </div>
  )
}

function OffColorRow({
  label,
  color,
  onChange,
}: {
  label: string
  color: string
  onChange: (value: string) => void
}) {
  const swatchColor = color === 'transparent' ? '#E5E7EB' : color

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className="h-4 w-4 rounded-full border border-slate-200 shadow-sm"
          style={{ backgroundColor: swatchColor }}
        />
        <div className="relative">
          <select
            className="appearance-none rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
            value={color}
            onChange={(e) => onChange(e.target.value)}
          >
            {OFF_COLOR_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-slate-400">
            ▼
          </span>
        </div>
      </div>
    </div>
  )
}
