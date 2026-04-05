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
import { notifyRotaUpdated } from '@/lib/shift-agent/shiftAgent'
import { useTranslation } from '@/components/providers/language-provider'

const SHIFT_LENGTHS: ShiftLength[] = ['8h', '12h', '16h']

/** Locale-independent ids for “current shift in pattern” (must match save payload logic). */
function generateShiftOptionIds(slots: ShiftSlot[], shiftLength: ShiftLength): string[] {
  const counts: Record<string, number> = { M: 0, A: 0, D: 0, N: 0, O: 0 }
  for (const slot of slots) {
    const upper = slot.toUpperCase() as 'M' | 'A' | 'D' | 'N' | 'O'
    counts[upper] = (counts[upper] || 0) + 1
  }
  const ids: string[] = []
  if (shiftLength === '8h') {
    for (let i = 1; i <= counts.M; i++) ids.push(`M:${i}`)
    for (let i = 1; i <= counts.A; i++) ids.push(`A:${i}`)
    for (let i = 1; i <= counts.N; i++) ids.push(`N:${i}`)
    for (let i = 1; i <= counts.O; i++) ids.push(`O:${i}`)
  } else {
    for (let i = 1; i <= counts.D; i++) ids.push(`D:${i}`)
    for (let i = 1; i <= counts.N; i++) ids.push(`N:${i}`)
    for (let i = 1; i <= counts.O; i++) ids.push(`O:${i}`)
  }
  return ids
}

function parseShiftOptionId(
  id: string,
): { target: 'M' | 'A' | 'D' | 'N' | 'O'; occurrence: number } | null {
  const m = id.match(/^([MADNO]):(\d+)$/i)
  if (!m) return null
  const letter = m[1].toUpperCase() as 'M' | 'A' | 'D' | 'N' | 'O'
  const occurrence = Number.parseInt(m[2], 10)
  if (!Number.isFinite(occurrence) || occurrence < 1) return null
  return { target: letter, occurrence }
}

function resolveCurrentShiftIndexFromId(id: string, slotSequence: string[]): number {
  const parsed = parseShiftOptionId(id)
  if (!parsed) return 0
  let count = 0
  for (let i = 0; i < slotSequence.length; i += 1) {
    if (slotSequence[i] === parsed.target) {
      count += 1
      if (count === parsed.occurrence) return i
    }
  }
  return 0
}

function labelForShiftOptionId(
  id: string,
  t: (key: string, params?: Record<string, string | number | undefined>) => string,
): string {
  const parsed = parseShiftOptionId(id)
  if (!parsed) return id
  const typeKey =
    parsed.target === 'M'
      ? 'rota.new.slotMorning'
      : parsed.target === 'A'
        ? 'rota.new.slotAfternoon'
        : parsed.target === 'D'
          ? 'rota.new.slotDay'
          : parsed.target === 'N'
            ? 'rota.new.slotNight'
            : 'rota.new.slotOff'
  return t('rota.new.shiftSlot', { type: t(typeKey), index: parsed.occurrence })
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

export default function NewRotaPatternPage() {
  const { t } = useTranslation()
  const router = useRouter()

  const [shiftLength, setShiftLength] = useState<ShiftLength>('12h')
  const [selectedPatternId, setSelectedPatternId] = useState<string>(
    PATTERNS_BY_LENGTH['12h'][0]?.id ?? '',
  )
  const [currentShiftId, setCurrentShiftId] = useState('')
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
  
  const shiftOptionIds = useMemo(
    () => generateShiftOptionIds(previewSlots, shiftLength),
    [previewSlots, shiftLength],
  )

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
    if (shiftOptionIds.length === 0) return
    setCurrentShiftId((prev) => (prev && shiftOptionIds.includes(prev) ? prev : shiftOptionIds[0]))
  }, [shiftOptionIds])

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

    const currentShiftIndex = resolveCurrentShiftIndexFromId(currentShiftId, slotSequence)

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
          alert(t('rota.new.errSavePattern'))
        }
        return
      }

      console.log('[rota/new] save success', responseText)

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dashboardPage', '4')
        // Dispatch event to refresh settings (shift_pattern may have been auto-updated)
        window.dispatchEvent(new CustomEvent('rota-saved'))
        notifyRotaUpdated()
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
          type="button"
          onClick={() => router.back()}
          aria-label={t('rota.new.backAria')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 shadow-sm"
        >
          <ChevronLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-base font-semibold text-slate-900">{t('rota.new.title')}</h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          aria-label={t('rota.new.saveAria')}
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
                {t('rota.new.pattern')}
              </label>
              <div className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-900">
                {activePattern?.label}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                {t('rota.new.shiftLength')}
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
                {t('rota.new.patternPresets')}
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
                {t('rota.new.startDate')}
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
                {t('rota.new.currentShift')}
              </label>
              <select
                className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-900"
                value={currentShiftId}
                onChange={(e) => setCurrentShiftId(e.target.value)}
              >
                {shiftOptionIds.map((id) => (
                  <option key={id} value={id}>
                    {labelForShiftOptionId(id, t)}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-400">{patternDescription}</p>
            </div>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {t('rota.new.shiftColours')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('rota.new.shiftColoursHint')}
              </p>

              {shiftLength === '8h' ? (
                <>
                  <ColorRow
                    label={t('rota.new.morningShifts')}
                    color={shiftColors.morning}
                    onChange={(value) =>
                      setShiftColors((prev) => ({ ...prev, morning: value }))
                    }
                  />
                  <ColorRow
                    label={t('rota.new.afternoonShifts')}
                    color={shiftColors.afternoon}
                    onChange={(value) =>
                      setShiftColors((prev) => ({ ...prev, afternoon: value }))
                    }
                  />
                  <ColorRow
                    label={t('rota.new.nightShifts')}
                    color={shiftColors.night}
                    onChange={(value) =>
                      setShiftColors((prev) => ({ ...prev, night: value }))
                    }
                  />
                  <OffColorRow
                    label={t('rota.new.daysOff')}
                    color={shiftColors.off}
                    onChange={(value) =>
                      setShiftColors((prev) => ({ ...prev, off: value }))
                    }
                  />
                </>
              ) : (
                <>
                  <ColorRow
                    label={t('rota.new.dayShifts')}
                    color={shiftColors.day}
                    onChange={(value) =>
                      setShiftColors((prev) => ({ ...prev, day: value }))
                    }
                  />
                  <ColorRow
                    label={t('rota.new.nightShifts')}
                    color={shiftColors.night}
                    onChange={(value) =>
                      setShiftColors((prev) => ({ ...prev, night: value }))
                    }
                  />
                  <OffColorRow
                    label={t('rota.new.daysOff')}
                    color={shiftColors.off}
                    onChange={(value) =>
                      setShiftColors((prev) => ({ ...prev, off: value }))
                    }
                  />
                </>
              )}

              <p className="text-[11px] text-slate-400">
                {t('rota.new.offColourHint')}
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {t('rota.new.patternPreview')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('rota.new.patternPreviewHint')}
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
                {t('rota.new.notesOptional')}
              </label>
              <textarea
                className="w-full resize-none rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                rows={2}
                placeholder={t('rota.new.notesPh')}
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
  const { t } = useTranslation()
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
                {t(`rota.new.preset.${preset.id}` as 'rota.new.preset.blue')}
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
  const { t } = useTranslation()
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
                {preset.id === 'none'
                  ? t('rota.new.presetOff.none')
                  : t(`rota.new.preset.${preset.id}` as 'rota.new.preset.blue')}
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
