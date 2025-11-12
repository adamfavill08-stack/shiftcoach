'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Check, ChevronLeft } from 'lucide-react'

const TYPE_OPTIONS = [
  { value: 'holiday', label: 'Holiday', color: '#0EA5E9' },
  { value: 'overtime', label: 'Overtime', color: '#F97316' },
  { value: 'training', label: 'Training', color: '#22C55E' },
  { value: 'personal', label: 'Personal', color: '#A855F7' },
  { value: 'other', label: 'Other', color: '#64748B' },
]

type FormState = {
  startDate: string
  endDate: string
  title: string
  eventType: string
  color: string
  description: string
  allDay: boolean
  startTime: string
  endTime: string
}

export default function NewRotaEventPage() {
  const router = useRouter()
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const [form, setForm] = useState<FormState>({
    startDate: todayIso,
    endDate: todayIso,
    title: '',
    eventType: TYPE_OPTIONS[0].value,
    color: TYPE_OPTIONS[0].color,
    description: '',
    allDay: true,
    startTime: '',
    endTime: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (saving) return
    if (!form.title.trim()) {
      setError('Please add a short title for the event.')
      return
    }

    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError('End date must be on or after start date.')
      return
    }

    setError(null)

    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() ? form.description.trim() : undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      startTime: form.allDay || !form.startTime ? undefined : form.startTime,
      endTime: form.allDay || !form.endTime ? undefined : form.endTime,
      allDay: form.allDay,
      eventType: form.eventType,
      color: form.color || undefined,
    }

    console.log('[rota/event/new] saving event', payload)

    try {
      setSaving(true)
      const res = await fetch('/api/rota/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      let responseText: string | null = null
      let responseJson: any = null
      try {
        responseText = await res.text()
        if (responseText) {
          responseJson = JSON.parse(responseText)
        }
      } catch (err) {
        console.warn('[rota/event/new] failed to parse response', err)
      }

      if (!res.ok) {
        const message =
          (responseJson && (responseJson.error || responseJson.message)) || responseText || 'Could not save this event. Check your connection and try again.'
        console.error('[rota/event/new] save error', res.status, responseText)
        setError(typeof message === 'string' ? message : 'Could not save this event. Check your connection and try again.')
        return
      }

      console.log('[rota/event/new] save success', responseJson)
      router.push('/dashboard?tab=rota')
      router.refresh()
    } catch (err: any) {
      console.error('[rota/event/new] fatal error', err)
      setError(err?.message ?? 'Unexpected error while saving.')
    } finally {
      setSaving(false)
    }
  }

  const selectedType = TYPE_OPTIONS.find((option) => option.value === form.eventType) ?? TYPE_OPTIONS[0]

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
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 shadow-sm transition-transform active:scale-95"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-base font-semibold text-slate-900">Log rota event</h1>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-md transition disabled:opacity-50"
          aria-label="Save event"
        >
          <Check className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 px-3 pb-6">
        <div
          className="mx-auto max-w-md overflow-hidden rounded-3xl"
          style={{
            backgroundColor: 'rgba(255,255,255,0.96)',
            boxShadow: '0 18px 40px rgba(15,23,42,0.10), 0 0 0 1px rgba(148,163,184,0.08)',
          }}
        >
          <div className="space-y-3 px-4 pb-3 pt-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Title</label>
              <input
                className="w-full border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none"
                placeholder="e.g. A/L approved"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </div>

            {form.eventType === 'holiday' ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Start date</label>
                  <input
                    type="date"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                    value={form.startDate}
                    onChange={(e) => {
                      handleChange('startDate', e.target.value)
                      // Auto-update end date if it's before start date
                      if (new Date(e.target.value) > new Date(form.endDate)) {
                        handleChange('endDate', e.target.value)
                      }
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">End date</label>
                  <input
                    type="date"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Date</label>
                <input
                  type="date"
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                  value={form.startDate}
                  onChange={(e) => {
                    handleChange('startDate', e.target.value)
                    handleChange('endDate', e.target.value)
                  }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Event type</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                  value={form.eventType}
                  onChange={(e) => {
                    const nextType = e.target.value
                    const option = TYPE_OPTIONS.find((item) => item.value === nextType)
                    handleChange('eventType', nextType)
                    if (option) {
                      handleChange('color', option.color)
                    }
                    // If switching away from holiday, sync end date with start date
                    if (nextType !== 'holiday' && form.endDate !== form.startDate) {
                      handleChange('endDate', form.startDate)
                    }
                  }}
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="color"
                  aria-label="Event colour"
                  className="h-9 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white"
                  value={form.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Default colour for <span className="font-semibold text-slate-600">{selectedType.label}</span> is applied. Adjust if needed.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2">
              <span className="text-xs font-medium text-slate-600">All day</span>
              <button
                type="button"
                onClick={() => handleChange('allDay', !form.allDay)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  form.allDay ? 'bg-sky-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    form.allDay ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Start time</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400/50 disabled:opacity-50"
                  disabled={form.allDay}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">End time</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400/50 disabled:opacity-50"
                  disabled={form.allDay}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Description (optional)</label>
              <textarea
                className="h-20 w-full resize-none rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                placeholder="Any detail you want to remember"
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600">
                {error}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
