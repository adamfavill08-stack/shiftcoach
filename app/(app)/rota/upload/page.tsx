'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation, useLanguage } from '@/components/providers/language-provider'
import { LOCALE_META } from '@/lib/i18n/supportedLocales'

type ShiftLengthType = '8h' | '12h' | '16h' | 'other'

type PresetPatternId =
  | '5on2off_8h'
  | '4on3off_8h'
  | 'continental_8h'
  | '3223_8h'
  | '4on4off_12h'
  | '223_12h'
  | 'dupont_12h'
  | '3on3off_12h'
  | '5on5off_12h'
  | '16h_2on2off'
  | '16h_6on4off'
  | '24on48off'
  | 'custom'

type CustomDayTag = {
  id: string
  label: string
  color: string
  icon?: string
}

type ReminderSettings = {
  preShiftMinutes: number
  preSleepMinutes: number
  preMealMinutes: number
}

type CalendarDay = {
  date: Date
  label: string
  code: 'D' | 'N' | 'O' | 'A'
  color: string
}

const patternCatalog: Record<ShiftLengthType, PresetPatternId[]> = {
  '8h': ['5on2off_8h', '4on3off_8h', 'continental_8h', '3223_8h'],
  '12h': ['4on4off_12h', '223_12h', 'dupont_12h', '3on3off_12h', '5on5off_12h'],
  '16h': ['16h_2on2off', '16h_6on4off', '24on48off'],
  other: ['custom'],
}

const reminderOptions = {
  preShift: [15, 30, 60, 90],
  preSleep: [30, 60, 90, 120],
  preMeal: [15, 30, 45],
}

const today = new Date()

function generateMockRotaMonth(
  year: number,
  month: number,
  patternId: PresetPatternId,
  primaryColor: string,
  nightColor: string,
  offColor: string,
  cellLabels: { D: string; N: string; O: string; A: string },
): CalendarDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const pattern: Array<'D' | 'N' | 'O' | 'A'> = (() => {
    switch (patternId) {
      case '4on4off_12h':
        return ['D', 'D', 'N', 'N', 'O', 'O', 'O', 'O']
      case '223_12h':
        return ['D', 'D', 'O', 'O', 'D', 'D', 'D', 'O', 'O']
      case '5on2off_8h':
        return ['D', 'D', 'D', 'D', 'D', 'O', 'O']
      case '4on3off_8h':
        return ['D', 'D', 'D', 'D', 'O', 'O', 'O']
      case 'continental_8h':
        return ['D', 'D', 'A', 'A', 'N', 'N', 'O', 'O']
      case '3223_8h':
        return ['D', 'D', 'D', 'A', 'A', 'N', 'N', 'O', 'O', 'O']
      case 'dupont_12h':
        return ['D', 'D', 'D', 'D', 'O', 'O', 'O', 'N', 'N', 'N', 'O', 'D', 'D', 'D', 'O', 'O', 'N', 'N', 'N', 'N', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O']
      case '3on3off_12h':
        return ['D', 'D', 'D', 'O', 'O', 'O']
      case '5on5off_12h':
        return ['D', 'D', 'D', 'D', 'D', 'O', 'O', 'O', 'O', 'O']
      case '16h_2on2off':
        return ['D', 'D', 'O', 'O']
      case '16h_6on4off':
        return ['D', 'D', 'D', 'D', 'D', 'D', 'O', 'O', 'O', 'O']
      case '24on48off':
        return ['D', 'O', 'O']
      default:
        return ['D', 'O']
    }
  })()

  const days: CalendarDay[] = []
  for (let i = 0; i < daysInMonth; i++) {
    const date = new Date(year, month, i + 1)
    const code = pattern[i % pattern.length]
    let label = cellLabels.D
    let color = primaryColor
    if (code === 'N') {
      label = cellLabels.N
      color = nightColor
    } else if (code === 'O') {
      label = cellLabels.O
      color = offColor
    } else if (code === 'A') {
      label = cellLabels.A
    }
    days.push({ date, label, code, color })
  }

  return days
}

export default function UploadRotaPage() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const router = useRouter()

  const shiftLengthOptions = useMemo(
    () =>
      [
        { id: '8h' as const, label: t('rotaUpload.shiftLen.8h') },
        { id: '12h' as const, label: t('rotaUpload.shiftLen.12h') },
        { id: '16h' as const, label: t('rotaUpload.shiftLen.16h') },
        { id: 'other' as const, label: t('rotaUpload.shiftLen.other') },
      ] as const,
    [t],
  )

  const patternLabels = useMemo(
    (): Record<PresetPatternId, string> => ({
      '5on2off_8h': t('rotaUpload.pattern.5on2off_8h'),
      '4on3off_8h': t('rotaUpload.pattern.4on3off_8h'),
      continental_8h: t('rotaUpload.pattern.continental_8h'),
      '3223_8h': t('rotaUpload.pattern.3223_8h'),
      '4on4off_12h': t('rotaUpload.pattern.4on4off_12h'),
      '223_12h': t('rotaUpload.pattern.223_12h'),
      dupont_12h: t('rotaUpload.pattern.dupont_12h'),
      '3on3off_12h': t('rotaUpload.pattern.3on3off_12h'),
      '5on5off_12h': t('rotaUpload.pattern.5on5off_12h'),
      '16h_2on2off': t('rotaUpload.pattern.16h_2on2off'),
      '16h_6on4off': t('rotaUpload.pattern.16h_6on4off'),
      '24on48off': t('rotaUpload.pattern.24on48off'),
      custom: t('rotaUpload.pattern.custom'),
    }),
    [t],
  )

  const cellLabels = useMemo(
    () => ({
      D: t('rotaUpload.cell.day'),
      N: t('rotaUpload.cell.night'),
      O: t('rotaUpload.cell.off'),
      A: t('rotaUpload.cell.late'),
    }),
    [t],
  )

  const [selectedShiftLength, setSelectedShiftLength] = useState<ShiftLengthType>('12h')
  const [selectedPatternId, setSelectedPatternId] = useState<PresetPatternId>('4on4off_12h')
  const [primaryShiftColor, setPrimaryShiftColor] = useState('#2D7CFF')
  const [nightShiftColor, setNightShiftColor] = useState('#7B3DFF')
  const [offDayColor, setOffDayColor] = useState('#FFD769')

  const [customTags, setCustomTags] = useState<CustomDayTag[]>([
    { id: 'holiday', label: 'Holiday', color: '#22C55E', icon: '🏝️' },
    { id: 'training', label: 'Training', color: '#F97316', icon: '📚' },
  ])

  const [reminders, setReminders] = useState<ReminderSettings>({
    preShiftMinutes: 60,
    preSleepMinutes: 90,
    preMealMinutes: 30,
  })

  const [photoFileName, setPhotoFileName] = useState<string | null>(null)
  const [importSource, setImportSource] = useState<'none' | 'google' | 'apple' | 'other'>('none')
  const [isSaving, setIsSaving] = useState(false)
  const [showAddTag, setShowAddTag] = useState(false)
  const [newTagLabel, setNewTagLabel] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6366F1')
  const [newTagIcon, setNewTagIcon] = useState('')

  const dayColorInputRef = useRef<HTMLInputElement | null>(null)
  const nightColorInputRef = useRef<HTMLInputElement | null>(null)
  const offColorInputRef = useRef<HTMLInputElement | null>(null)
  const newTagColorRef = useRef<HTMLInputElement | null>(null)

  const rotaMonth = useMemo(
    () =>
      generateMockRotaMonth(
        today.getFullYear(),
        today.getMonth(),
        selectedPatternId,
        primaryShiftColor,
        nightShiftColor,
        offDayColor,
        cellLabels,
      ),
    [selectedPatternId, primaryShiftColor, nightShiftColor, offDayColor, cellLabels],
  )

  const weekDayLabels = useMemo(
    () => [
      t('rotaUpload.calD0'),
      t('rotaUpload.calD1'),
      t('rotaUpload.calD2'),
      t('rotaUpload.calD3'),
      t('rotaUpload.calD4'),
      t('rotaUpload.calD5'),
      t('rotaUpload.calD6'),
    ],
    [t],
  )

  const availablePatterns = patternCatalog[selectedShiftLength]

  const monthTitle = today.toLocaleString(LOCALE_META[language].intl, {
    month: 'long',
    year: 'numeric',
  })

  const handleAddTag = () => {
    if (!newTagLabel.trim()) return
    const id = `${newTagLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
    setCustomTags((prev) => [...prev, { id, label: newTagLabel.trim(), color: newTagColor, icon: newTagIcon || undefined }])
    setNewTagLabel('')
    setNewTagColor('#6366F1')
    setNewTagIcon('')
    setShowAddTag(false)
  }

  const handleDeleteTag = (id: string) => {
    setCustomTags((prev) => prev.filter((tag) => tag.id !== id))
  }

  const handleUploadClick = () => {
    setPhotoFileName('rota-photo.jpg')
    alert(t('rotaUpload.alert.photoLater'))
  }

  const handleImportSelect = (source: 'google' | 'apple' | 'other') => {
    setImportSource(source)
    alert(t('rotaUpload.alert.importLater'))
  }

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      alert(t('rotaUpload.alert.savedLocal'))
      router.push('/rota')
    }, 600)
  }

  const patternSummary = patternLabels[selectedPatternId]

  const reminderChips = (options: number[], selected: number, onSelect: (value: number) => void) => (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option === selected
        return (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              active
                ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm'
                : 'border border-[var(--border-subtle)] bg-[var(--card-subtle)] text-[var(--text-soft)]'
            }`}
          >
            {t('rotaUpload.minChip', { n: option })}
          </button>
        )
      })}
    </div>
  )

  const steps = useMemo(
    () => [
      { id: 1, label: t('rotaUpload.step1') },
      { id: 2, label: t('rotaUpload.step2') },
      { id: 3, label: t('rotaUpload.step3') },
    ],
    [t],
  )

  return (
    <main className="min-h-screen bg-[var(--page-bg)] pb-24">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <div className="px-4 pt-4 pb-3">
          <header className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push('/rota')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--card)] text-[var(--text-main)] shadow-sm hover:-translate-y-0.5 hover:shadow-md transition"
            >
              ←
            </button>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-400">{t('rotaUpload.headerKicker')}</p>
              <h1 className="text-sm font-semibold text-[var(--text-main)]">{t('rotaUpload.title')}</h1>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-[18px] text-slate-300">?</span>
          </header>

          <div className="mt-4 flex items-center justify-center gap-2">
            {steps.map((step, idx) => {
              const active = idx === 1
              return (
                <div key={step.id} className="flex items-center gap-2">
                  <div
                    className={`flex h-7 items-center rounded-full px-3 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                      active
                        ? 'bg-sky-500/10 text-sky-600'
                        : 'bg-[var(--card-subtle)] text-[var(--text-soft)]'
                    }`}
                  >
                    {step.label}
                  </div>
                  {idx < steps.length - 1 && <div className="h-[1px] w-5 bg-slate-200/80" />}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-28">
          <section
            className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-[0_20px_48px_rgba(15,23,42,0.09)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-500">{t('rotaUpload.livePreview')}</span>
                <h2 className="text-sm font-semibold text-[var(--text-main)]">{t('rotaUpload.rotaPreview')}</h2>
              </div>
              <span className="rounded-full bg-[var(--card-subtle)] px-2 py-1 text-[10px] font-medium text-[var(--text-soft)]">{monthTitle}</span>
            </div>
            <div className="mb-3 flex gap-3 text-[10px] text-[var(--text-soft)]">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: primaryShiftColor }} /> {t('rotaUpload.legend.day')}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: nightShiftColor }} /> {t('rotaUpload.legend.night')}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: offDayColor }} /> {t('rotaUpload.legend.off')}</span>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] text-[var(--text-soft)]">
              {weekDayLabels.map((label) => (
                <div key={label} className="font-medium uppercase tracking-[0.2em]">{label.slice(0, 1)}</div>
              ))}
              {rotaMonth.map((day) => (
                <div key={day.date.toISOString()} className="flex flex-col items-center gap-1">
                  <div
                    className="flex h-10 w-10 flex-col items-center justify-center rounded-2xl border text-[11px] font-medium"
                    style={{
                      background: `${day.color}1A`,
                      borderColor: `${day.color}55`,
                      color: 'var(--text-main)',
                    }}
                  >
                    <span>{day.date.getDate()}</span>
                    <span className="text-[9px] text-[var(--text-soft)]">{day.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-[0_20px_48px_rgba(15,23,42,0.09)]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-500">{t('rotaUpload.forShiftWorkers')}</span>
                <h2 className="mt-1 text-sm font-semibold text-[var(--text-main)]">{t('rotaUpload.presetsTitle')}</h2>
              </div>
              <div className="flex items-center gap-2">
                {shiftLengthOptions.map((option) => {
                  const active = option.id === selectedShiftLength
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setSelectedShiftLength(option.id)
                        const patterns = patternCatalog[option.id]
                        setSelectedPatternId(patterns[0])
                      }}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] transition ${
                        active
                          ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm'
                          : 'border border-[var(--border-subtle)] bg-[var(--card-subtle)] text-[var(--text-soft)]'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex snap-x gap-2 overflow-x-auto pb-1">
              {availablePatterns.map((patternId) => {
                const active = patternId === selectedPatternId
                return (
                  <button
                    key={patternId}
                    type="button"
                    onClick={() => setSelectedPatternId(patternId)}
                    className={`min-w-[160px] snap-start rounded-2xl px-4 py-3 text-left text-xs font-semibold transition-all ${
                      active
                        ? 'bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-500 text-white shadow-lg'
                        : 'border border-[var(--border-subtle)] bg-[var(--card-subtle)] text-[var(--text-main)] hover:-translate-y-0.5 hover:shadow-md'
                    }`}
                  >
                    <span>{patternLabels[patternId]}</span>
                    <p className={`mt-1 text-[10px] ${active ? 'text-white/70' : 'text-[var(--text-soft)]'}`}>
                      {t('rotaUpload.patternRotates')}
                    </p>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-[0_20px_48px_rgba(15,23,42,0.09)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-main)]">{t('rotaUpload.coloursTitle')}</h2>
                <p className="text-[11px] text-[var(--text-soft)]">{t('rotaUpload.coloursSubtitle')}</p>
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => dayColorInputRef.current?.click()}
                className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-main)]"
              >
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: primaryShiftColor }} />
                {t('rotaUpload.dayShift')}
              </button>
              <button
                type="button"
                onClick={() => nightColorInputRef.current?.click()}
                className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-main)]"
              >
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: nightShiftColor }} />
                {t('rotaUpload.nightShift')}
              </button>
              <button
                type="button"
                onClick={() => offColorInputRef.current?.click()}
                className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-main)]"
              >
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: offDayColor }} />
                {t('rotaUpload.daysOff')}
              </button>
              <input
                ref={dayColorInputRef}
                type="color"
                className="hidden"
                value={primaryShiftColor}
                onChange={(event) => setPrimaryShiftColor(event.target.value)}
              />
              <input
                ref={nightColorInputRef}
                type="color"
                className="hidden"
                value={nightShiftColor}
                onChange={(event) => setNightShiftColor(event.target.value)}
              />
              <input
                ref={offColorInputRef}
                type="color"
                className="hidden"
                value={offDayColor}
                onChange={(event) => setOffDayColor(event.target.value)}
              />
            </div>

            <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--card-subtle)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-main)]">{t('rotaUpload.customTagsTitle')}</p>
                  <p className="text-[11px] text-[var(--text-soft)]">{t('rotaUpload.customTagsSubtitle')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddTag((prev) => !prev)}
                  className="rounded-full border border-[var(--border-subtle)] bg-[var(--card)] px-3 py-1 text-[11px] font-medium text-[var(--text-main)]"
                >
                  {showAddTag ? t('rotaUpload.close') : t('rotaUpload.addCustomDay')}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {customTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 rounded-full border border-transparent bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
                    style={{ boxShadow: `0 6px 20px ${tag.color}1f` }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span>{tag.icon ? `${tag.icon} ${tag.label}` : tag.label}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTag(tag.id)}
                      className="text-[10px] text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {showAddTag && (
                <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      value={newTagLabel}
                      onChange={(event) => setNewTagLabel(event.target.value)}
                      placeholder={t('rotaUpload.tagLabelPh')}
                      className="flex-1 rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => newTagColorRef.current?.click()}
                      className="flex h-9 w-24 items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] text-xs font-medium text-[var(--text-main)]"
                    >
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: newTagColor }} /> {t('rotaUpload.color')}
                    </button>
                    <input
                      ref={newTagColorRef}
                      type="color"
                      className="hidden"
                      value={newTagColor}
                      onChange={(event) => setNewTagColor(event.target.value)}
                    />
                  </div>
                  <input
                    value={newTagIcon}
                    onChange={(event) => setNewTagIcon(event.target.value)}
                    placeholder={t('rotaUpload.emojiPh')}
                    className="mb-3 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none"
                  />
                  <div className="flex justify-end gap-2 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddTag(false)
                        setNewTagLabel('')
                        setNewTagIcon('')
                        setNewTagColor('#6366F1')
                      }}
                      className="rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 py-1.5 text-[var(--text-soft)]"
                    >
                      {t('rotaUpload.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-1.5 text-white shadow-sm"
                    >
                      {t('rotaUpload.saveTag')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-[0_20px_48px_rgba(15,23,42,0.09)]">
            <h2 className="text-sm font-semibold text-[var(--text-main)]">{t('rotaUpload.uploadSectionTitle')}</h2>
            <p className="mb-4 text-[11px] text-[var(--text-soft)]">{t('rotaUpload.uploadSectionSubtitle')}</p>
            <button
              type="button"
              onClick={handleUploadClick}
              className="w-full rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 py-5 text-center text-xs text-[var(--text-main)] shadow-sm transition hover:border-sky-400/50 hover:text-sky-600"
            >
              <span className="text-2xl">📷</span>
              <span className="mt-1 block font-semibold">{t('rotaUpload.uploadCta')}</span>
              <span className="mt-1 block text-[10px] text-[var(--text-soft)]">{t('rotaUpload.uploadHint')}</span>
              {photoFileName && <span className="mt-2 block text-[10px] text-[var(--text-soft)]">{t('rotaUpload.selectedFile', { name: photoFileName })}</span>}
            </button>

            <div className="mt-5 space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] p-4">
              <p className="text-[11px] font-semibold text-[var(--text-main)]">{t('rotaUpload.importTitle')}</p>
              <div className="flex flex-col gap-2 text-xs">
                {[
                  { id: 'google', label: t('rotaUpload.cal.google') },
                  { id: 'apple', label: t('rotaUpload.cal.apple') },
                  { id: 'other', label: t('rotaUpload.cal.other') },
                ].map((option) => {
                  const active = importSource === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleImportSelect(option.id as 'google' | 'apple' | 'other')}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? 'border-sky-400/60 bg-white shadow-sm'
                          : 'border-[var(--border-subtle)] bg-white/60 hover:border-sky-200'
                      }`}
                    >
                      <span>{option.label}</span>
                      <span className="text-[var(--text-soft)]">{t('rotaUpload.connectArrow')}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-[0_20px_48px_rgba(15,23,42,0.09)]">
            <h2 className="text-sm font-semibold text-[var(--text-main)]">{t('rotaUpload.remindersTitle')}</h2>
            <p className="mb-4 text-[11px] text-[var(--text-soft)]">{t('rotaUpload.remindersSubtitle')}</p>
            <div className="space-y-4 text-xs">
              <div>
                <p className="mb-2 font-semibold text-[var(--text-main)]">{t('rotaUpload.remBeforeShift')}</p>
                {reminderChips(reminderOptions.preShift, reminders.preShiftMinutes, (value) =>
                  setReminders((prev) => ({ ...prev, preShiftMinutes: value })),
                )}
              </div>
              <div>
                <p className="mb-2 font-semibold text-[var(--text-main)]">{t('rotaUpload.remWindDown')}</p>
                {reminderChips(reminderOptions.preSleep, reminders.preSleepMinutes, (value) =>
                  setReminders((prev) => ({ ...prev, preSleepMinutes: value })),
                )}
              </div>
              <div>
                <p className="mb-2 font-semibold text-[var(--text-main)]">{t('rotaUpload.remMeals')}</p>
                {reminderChips(reminderOptions.preMeal, reminders.preMealMinutes, (value) =>
                  setReminders((prev) => ({ ...prev, preMealMinutes: value })),
                )}
              </div>
            </div>
            <p className="mt-4 text-[10px] text-[var(--text-soft)]">{t('rotaUpload.remindersFoot')}</p>
          </section>

          <p className="pb-28 text-center text-[10px] text-[var(--text-soft)]">{t('rotaUpload.pageFoot')}</p>
        </div>

        <div className="sticky bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-gradient-to-t from-[var(--page-bg)] via-[var(--page-bg)]/95 to-transparent px-4 pb-3 pt-2">
          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--card)] px-4 py-3 shadow-[0_16px_32px_rgba(15,23,42,0.12)]">
            <p className="mb-3 text-[11px] text-[var(--text-soft)]">
              {t('rotaUpload.summaryPattern')} {patternSummary} • {t('rotaUpload.summaryStarting')} • {t('rotaUpload.summaryColours')}{' '}
              <span style={{ color: primaryShiftColor }}>{t('rotaUpload.legend.day')}</span>,{' '}
              <span style={{ color: nightShiftColor }}>{t('rotaUpload.legend.night')}</span>, <span style={{ color: offDayColor }}>{t('rotaUpload.legend.off')}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push('/rota')}
                className="flex-1 rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] py-2 text-sm font-semibold text-[var(--text-main)]"
              >
                {t('rotaUpload.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? t('rotaUpload.saving') : t('rotaUpload.saveCta')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
