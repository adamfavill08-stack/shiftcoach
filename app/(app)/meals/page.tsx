'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getTodayMealSchedule, type MealSlot } from '@/lib/nutrition/getTodayMealSchedule'
import { BarcodeScannerSheet } from '@/components/BarcodeScannerSheet'

type MealSource = 'manual' | 'ai_estimate' | 'barcode'
type CaptureMode = 'manual' | 'photo' | 'scan'

type LoggedMeal = {
  slotId: string
  name: string
  calories: number
  time: string // HH:mm
  notes?: string
  source?: MealSource
}

function fmtHM(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MealsPage() {
  // TODO: wire these from engine/profile/shift providers
  const adjustedCalories = 2190
  const shiftType: 'day' | 'night' | 'late' | 'off' = 'off'
  const shiftStart: Date | undefined = undefined
  const shiftEnd: Date | undefined = undefined
  const wakeTime = new Date()
  const [wakeLabel, setWakeLabel] = useState<string>('')

  const slots = useMemo<MealSlot[]>(() => getTodayMealSchedule({
    adjustedCalories,
    shiftType,
    shiftStart,
    shiftEnd,
    wakeTime,
  }), [adjustedCalories, shiftType, shiftStart, shiftEnd, wakeTime])

  useEffect(() => {
    // Compute client-side to avoid SSR/client timezone/locale mismatches
    setWakeLabel(fmtHM(wakeTime))
  }, [wakeTime])

  const [activeSlot, setActiveSlot] = useState<MealSlot | null>(null)
  const [editingMeal, setEditingMeal] = useState<LoggedMeal | null>(null)
  const [logged, setLogged] = useState<Record<string, LoggedMeal>>({})
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false)
  const [aiEstimate, setAiEstimate] = useState<{ calories?: number; proteinG?: number; carbsG?: number; fatsG?: number } | null>(null)
  const [caloriesInput, setCaloriesInput] = useState<string>('')
  const [mealNameInput, setMealNameInput] = useState<string>('')
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false)
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null)
  const [captureMode, setCaptureMode] = useState<CaptureMode>('manual')

  function openLogModal(slot: MealSlot, existing?: LoggedMeal) {
    setActiveSlot(slot)
    setEditingMeal(existing ?? null)
    setAiEstimate(null)
    setPhotoFile(null)
    if (photoPreviewUrl) { URL.revokeObjectURL(photoPreviewUrl) }
    setPhotoPreviewUrl(null)
    setMealNameInput(existing?.name ?? '')
    setCaloriesInput(String(existing?.calories ?? slot.caloriesTarget))
    setShowBarcodeScanner(false)
    setIsLookingUpBarcode(false)
    setLastScannedBarcode(null)
    setCaptureMode('manual')
  }

  function handleSaveMeal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!activeSlot) return
    const form = new FormData(e.currentTarget)
    const name = String(mealNameInput || form.get('name') || '')
    const calories = Number(caloriesInput || form.get('calories') || activeSlot.caloriesTarget)
    const time = String(form.get('time') || fmtHM(activeSlot.time))
    const notes = String(form.get('notes') || '')
    let source: MealSource = 'manual'
    if (lastScannedBarcode) source = 'barcode'
    else if (aiEstimate) source = 'ai_estimate'

    // TODO: persist to Supabase meals table; for now local state
    setLogged(prev => ({
      ...prev,
      [activeSlot.id]: { slotId: activeSlot.id, name, calories, time, notes, source },
    }))
    setActiveSlot(null)
    setEditingMeal(null)
  }

  function handleMealPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setAiEstimate(null)
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    const url = URL.createObjectURL(file)
    setPhotoPreviewUrl(url)
  }

  async function handleAnalyzePhoto() {
    if (!photoFile) return
    setIsAnalyzingPhoto(true)
    setAiEstimate(null)
    try {
      const formData = new FormData()
      formData.append('image', photoFile)
      const res = await fetch('/api/meal-vision', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Failed to analyze meal')
      const data = await res.json() as { estimate?: { calories?: number; proteinG?: number; carbsG?: number; fatsG?: number } }
      if (data.estimate) {
        setAiEstimate(data.estimate)
        if (data.estimate.calories != null) setCaloriesInput(String(data.estimate.calories))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsAnalyzingPhoto(false)
    }
  }

  async function handleBarcodeDetected(barcode: string) {
    setShowBarcodeScanner(false)
    setIsLookingUpBarcode(true)
    setAiEstimate(null)
    try {
      const res = await fetch('/api/barcode-nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode }),
      })
      if (!res.ok) throw new Error('Barcode lookup failed')
      const data = await res.json() as {
        barcode: string
        food?: { name?: string; brand?: string; calories?: number; proteinG?: number; carbsG?: number; fatsG?: number }
      }
      if (data.food) {
        const { name, calories, proteinG, carbsG, fatsG } = data.food
        if (name) setMealNameInput(name)
        if (calories != null) setCaloriesInput(String(calories))
        setAiEstimate({
          calories: calories ?? aiEstimate?.calories,
          proteinG: proteinG ?? aiEstimate?.proteinG,
          carbsG: carbsG ?? aiEstimate?.carbsG,
          fatsG: fatsG ?? aiEstimate?.fatsG,
        })
        setLastScannedBarcode(barcode)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLookingUpBarcode(false)
    }
  }

  const loggedCalories = Object.values(logged).reduce((a, m) => a + (m.calories || 0), 0)

  return (
    <main
      style={{
        backgroundImage: 'radial-gradient(circle at top, var(--bg-soft), var(--bg))',
      }}
    >
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center gap-2 mb-1">
          <Link
            href="/dashboard"
            className="p-2 rounded-full backdrop-blur-xl border transition-all"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card-subtle)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card)'
            }}
            aria-label="Back"
          >
            ←
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>Today's meals</h1>
            <p className="text-sm" style={{ color: 'var(--text-soft)' }}>Plan and log your meals around your shift and sleep.</p>
          </div>
        </header>

        <div
          className="inline-flex items-center gap-2 rounded-full backdrop-blur-xl border px-3 py-1 text-[11px] w-max"
          style={{
            backgroundColor: 'var(--card-subtle)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-soft)',
          }}
        >
          <span>{shiftType === 'off' ? 'Off shift' : `${shiftType} shift`}</span>
          <span>•</span>
          <span suppressHydrationWarning>Wake: {wakeLabel}</span>
        </div>

        {/* Hero calories */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-2"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--text-soft)' }}>Today's adjusted calories</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-semibold" style={{ color: 'var(--text-main)' }}>{adjustedCalories}</p>
            <span className="text-sm" style={{ color: 'var(--text-soft)' }}>kcal</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Split across your meals based on your shift and wake time.</p>
        </section>

        {/* Timeline schedule */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-5 flex flex-col gap-4"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Today's meal schedule</p>
            <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Tap a slot to log</p>
          </div>

          {slots.map((slot, i) => {
            const lm = logged[slot.id]
            return (
              <div key={slot.id} className="flex gap-3">
                {/* timeline */}
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-gradient-to-br from-sky-500 to-violet-500" />
                  {i < slots.length - 1 && <div className="mt-1 h-full w-px" style={{ backgroundColor: 'var(--border-subtle)' }} />}
                </div>

                {/* content */}
                <div
                  className="flex-1 rounded-2xl border px-3 py-2.5 flex flex-col gap-1"
                  style={{
                    backgroundColor: 'var(--card-subtle)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-soft)' }}>{slot.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-soft)' }} suppressHydrationWarning>{slot.windowLabel}</p>
                    </div>
                  <div className="text-right">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{slot.caloriesTarget} kcal</p>
                      {lm && (
                        <div className="flex items-center justify-end gap-1">
                          <p className="text-[11px] text-emerald-600">Logged {lm.calories} kcal</p>
                          {lm.source === 'ai_estimate' && (
                            <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-600">AI</span>
                          )}
                        {lm.source === 'barcode' && (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">Scan</span>
                        )}
                        </div>
                      )}
                    </div>
                  </div>

                  {!lm ? (
                    <button
                      type="button"
                      onClick={() => openLogModal(slot)}
                      className="mt-2 inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-medium transition-colors"
                      style={{
                        backgroundColor: 'var(--ring-bg)',
                        color: 'var(--text-soft)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--card)'
                        e.currentTarget.style.color = 'var(--text-main)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--ring-bg)'
                        e.currentTarget.style.color = 'var(--text-soft)'
                      }}
                    >
                      Log this meal
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openLogModal(slot, lm)}
                      className="mt-2 inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-medium transition-colors"
                      style={{
                        backgroundColor: 'var(--ring-bg)',
                        color: 'var(--text-soft)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--card)'
                        e.currentTarget.style.color = 'var(--text-main)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--ring-bg)'
                        e.currentTarget.style.color = 'var(--text-soft)'
                      }}
                    >
                      Edit log
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </section>

        {/* AI/Scan badge hint */}
        <p className="mt-0 -mb-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span className="inline-flex items-center rounded-full bg-sky-50 px-1 py-0 text-[10px] font-semibold text-sky-600">AI</span>
          {" "}= estimated from a photo,{' '}
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-1 py-0 text-[10px] font-semibold text-emerald-600">Scan</span>
          {" "}= from a barcode. You can adjust any values.
        </p>

        {/* Daily totals */}
        <section
          className="rounded-3xl backdrop-blur-2xl border px-5 py-4 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-soft)' }}>Today so far</p>
            <p className="text-sm" style={{ color: 'var(--text-main)' }}>Logged {loggedCalories} / {adjustedCalories} kcal</p>
          </div>
          <div className="text-right text-xs" style={{ color: 'var(--text-soft)' }}>
            Meals logged: {Object.keys(logged).length} / {slots.length}
          </div>
        </section>

        {/* Log modal */}
        {activeSlot && (
          <div
            className="fixed inset-0 z-40 flex items-end justify-center md:items-center backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => { setActiveSlot(null); setEditingMeal(null) }}
          >
            <div
              className="w-full max-w-[430px] rounded-t-3xl md:rounded-3xl backdrop-blur-2xl border px-5 pt-4 pb-6 animate-slide-up"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border-subtle)',
                boxShadow: 'var(--shadow-soft)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Log {activeSlot.label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Target {activeSlot.caloriesTarget} kcal · {activeSlot.windowLabel}</p>
                </div>
                <button
                  onClick={() => { setActiveSlot(null); setEditingMeal(null) }}
                  className="transition-colors text-lg"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveMeal} className="flex flex-col gap-3">
                {/* Capture mode toggle */}
                <div className="flex flex-col gap-2 mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-soft)' }}>Capture mode</p>
                  <div
                    className="inline-flex items-center rounded-full p-1 text-[11px] font-medium"
                    style={{
                      backgroundColor: 'var(--ring-bg)',
                      color: 'var(--text-soft)',
                    }}
                  >
                    {[
                      { id: 'manual', label: 'Manual' },
                      { id: 'photo', label: 'Photo' },
                      { id: 'scan', label: 'Scan' },
                    ].map(({ id, label }) => {
                      const active = captureMode === (id as any)
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setCaptureMode(id as any)}
                          className={("flex-1 rounded-full px-3 py-1.5 transition-all ") + (active ? "shadow-sm" : "")}
                          style={{
                            backgroundColor: active ? 'var(--card)' : 'transparent',
                            color: active ? 'var(--text-main)' : 'var(--text-soft)',
                          }}
                          onMouseEnter={(e) => {
                            if (!active) {
                              e.currentTarget.style.color = 'var(--text-main)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!active) {
                              e.currentTarget.style.color = 'var(--text-soft)'
                            }
                          }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <p className="text-[10px] -mt-2 mb-1" style={{ color: 'var(--text-muted)' }}>Choose how you want to log this meal – type it in, snap a photo, or scan a barcode.</p>

                {/* Photo + AI */}
                {(captureMode === 'photo' || captureMode === 'manual') && (
                  <div className="flex flex-col gap-2 mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-soft)' }}>Meal photo {captureMode === 'photo' && <span className="text-[10px] text-sky-600 ml-1">AI estimate</span>}</p>
                    <div
                      className={("rounded-2xl border px-3 py-3 flex items-center gap-3 ") + (captureMode === 'photo' ? "" : "opacity-80")}
                      style={{
                        backgroundColor: captureMode === 'photo' ? 'var(--card-subtle)' : 'var(--ring-bg)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      {photoPreviewUrl ? (
                        <div className="relative h-16 w-16 overflow-hidden rounded-2xl">
                          <img src={photoPreviewUrl} alt="Meal" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-lg">📷</div>
                      )}
                      <div className="flex-1 flex flex-col gap-1">
                        <p className="text-xs" style={{ color: 'var(--text-main)' }}>Take a quick photo to let AI estimate your calories and macros.</p>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white px-3 py-1.5 text-[11px] font-medium cursor-pointer hover:brightness-110 transition">
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleMealPhotoChange} />
                            Take / upload photo
                          </label>
                          {photoFile && !isAnalyzingPhoto && (
                            <button type="button" onClick={handleAnalyzePhoto} className="text-[11px] font-medium text-sky-600 hover:text-sky-700">Analyze with AI</button>
                          )}
                        </div>
                        {isAnalyzingPhoto && (
                          <p className="text-[11px] text-slate-500">Analyzing your meal… this may take a moment.</p>
                        )}
                        {aiEstimate && !isAnalyzingPhoto && (
                          <div>
                            <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>
                              AI estimate: <span className="font-semibold">{aiEstimate.calories ?? '?'} kcal</span>
                              {aiEstimate.proteinG != null && ` · ${aiEstimate.proteinG}g P`}
                              {aiEstimate.carbsG != null && ` · ${aiEstimate.carbsG}g C`}
                              {aiEstimate.fatsG != null && ` · ${aiEstimate.fatsG}g F`} <span style={{ color: 'var(--text-muted)' }}>(you can edit this)</span>
                            </p>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>AI estimates are approximate. You can adjust them any time.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="flex items-center my-2"><div className="h-px flex-1" style={{ backgroundColor: 'var(--border-subtle)' }} /><span className="mx-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>or</span><div className="h-px flex-1" style={{ backgroundColor: 'var(--border-subtle)' }} /></div>

                {/* Barcode scan row */}
                {(captureMode === 'scan' || captureMode === 'manual') && (
                  <div
                    className="rounded-2xl border px-3 py-3 flex items-center justify-between gap-3"
                    style={{
                      backgroundColor: 'var(--card-subtle)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex flex-col">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>Scan barcode {captureMode === 'scan' && <span className="text-[10px] text-emerald-600 ml-1">AI precise</span>}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>Scan a package to auto-fill calories and macros.</p>
                    </div>
                    <button type="button" onClick={() => setShowBarcodeScanner(true)} className="inline-flex items-center gap-1 rounded-full bg-slate-900 text-white px-3 py-1.5 text-[11px] font-medium hover:brightness-110 active:scale-95 transition-all">
                      <span>📦</span>
                      <span>Scan</span>
                    </button>
                  </div>
                )}

                {isLookingUpBarcode && (
                  <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>Looking up barcode…</p>
                )}

                <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-soft)' }}>
                  Meal name
                  <input
                    name="name"
                    value={mealNameInput}
                    onChange={(e)=>setMealNameInput(e.target.value)}
                    placeholder="e.g. Pre-shift pasta, omelette, yoghurt"
                    className="rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                    style={{
                      backgroundColor: 'var(--card-subtle)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-soft)' }}>
                  Calories (kcal)
                  <input
                    name="calories"
                    type="number"
                    value={caloriesInput}
                    onChange={(e)=>setCaloriesInput(e.target.value)}
                    className="rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                    style={{
                      backgroundColor: 'var(--card-subtle)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-soft)' }}>
                  Time
                  <input
                    name="time"
                    type="time"
                    defaultValue={editingMeal?.time ?? fmtHM(activeSlot.time)}
                    className="rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                    style={{
                      backgroundColor: 'var(--card-subtle)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-soft)' }}>
                  Notes (optional)
                  <textarea
                    name="notes"
                    defaultValue={editingMeal?.notes ?? ''}
                    rows={2}
                    className="rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50 resize-none"
                    style={{
                      backgroundColor: 'var(--card-subtle)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                  />
                </label>

                <button type="submit" className="mt-1 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-medium text-white hover:brightness-110 active:scale-95 transition-all">Save meal</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
