'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { getMyProfile, updateProfile, type Profile } from '@/lib/profile'
import { authedFetch } from '@/lib/supabase/authedFetch'
import { isGuidedTourProfileComplete } from '@/lib/onboarding/profileTourCompleteness'
import { readGuidedHintsLocal, writeGuidedHintsLocal } from '@/lib/onboarding/guidedHintsLocal'

const TOUR_KEYS = {
  settings: 'nav-settings',
  calendar: 'nav-calendar',
  sleep: 'sleep-card',
} as const

type TourStep = 1 | 2 | 3 | 4

type Rect = { top: number; left: number; width: number; height: number }

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

async function persistHints(
  userId: string,
  patch: Partial<{
    onboarding_hints_enabled: boolean | null
    onboarding_hints_completed: boolean
    onboarding_step: number
  }>,
): Promise<boolean> {
  const ok = await updateProfile(patch as Partial<Profile>)
  if (!ok) {
    writeGuidedHintsLocal(patch)
  }
  return ok
}

function useTargetRect(selector: string | null, tick: number) {
  const [rect, setRect] = useState<Rect | null>(null)

  const measure = useCallback(() => {
    if (!selector || typeof document === 'undefined') {
      setRect(null)
      return
    }
    const el = document.querySelector(selector)
    if (!el || !(el instanceof HTMLElement)) {
      setRect(null)
      return
    }
    const r = el.getBoundingClientRect()
    setRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    })
  }, [selector])

  useLayoutEffect(() => {
    measure()
    const el = selector ? document.querySelector(selector) : null
    const ro =
      el && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null
    if (el && ro) ro.observe(el)
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      if (el && ro) ro.disconnect()
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [selector, measure, tick])

  return rect
}

export function GuidedHintsTour({ userId }: { userId: string | null }) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const firstButtonRef = useRef<HTMLButtonElement | null>(null)

  const [hintsEnabled, setHintsEnabled] = useState<boolean | null>(null)
  const [hintsCompleted, setHintsCompleted] = useState(true)
  const [step, setStep] = useState<TourStep | 0>(0)
  /** User opened Home at least once while hints choice was still pending (keeps flow dashboard-first). */
  const [introPrimed, setIntroPrimed] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [rotaDone, setRotaDone] = useState(false)
  const [wearableDone, setWearableDone] = useState(false)
  const [sleepDone, setSleepDone] = useState(false)
  const [layoutTick, setLayoutTick] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  const refreshProfileHints = useCallback(async () => {
    if (!userId) return
    const p = await getMyProfile()
    setProfile(p)
    if (!p) return

    const ls = readGuidedHintsLocal()
    const enabled =
      typeof p.onboarding_hints_enabled === 'boolean'
        ? p.onboarding_hints_enabled
        : ls.onboarding_hints_enabled
    const completed =
      typeof p.onboarding_hints_completed === 'boolean'
        ? p.onboarding_hints_completed
        : ls.onboarding_hints_completed
    const st =
      typeof p.onboarding_step === 'number' && p.onboarding_step >= 0
        ? p.onboarding_step
        : ls.onboarding_step

    const keys = Object.keys(p as object)
    const hasDbColumns = keys.includes('onboarding_hints_completed')

    if (!hasDbColumns) {
      setHintsEnabled(ls.onboarding_hints_enabled)
      setHintsCompleted(ls.onboarding_hints_completed)
      setStep((st >= 1 && st <= 4 ? st : 0) as TourStep | 0)
      return
    }

    setHintsEnabled(typeof enabled === 'boolean' ? enabled : null)
    setHintsCompleted(Boolean(completed))
    setStep((st >= 1 && st <= 4 ? st : 0) as TourStep | 0)
  }, [userId])

  useEffect(() => {
    void refreshProfileHints()
  }, [refreshProfileHints, pathname])

  useEffect(() => {
    const onReset = () => {
      void refreshProfileHints()
    }
    window.addEventListener('guided-hints-reset', onReset)
    return () => window.removeEventListener('guided-hints-reset', onReset)
  }, [refreshProfileHints])

  useEffect(() => {
    if (userId && pathname === '/dashboard' && hintsEnabled === null && !hintsCompleted) {
      setIntroPrimed(true)
    }
  }, [userId, pathname, hintsEnabled, hintsCompleted])

  const showIntroModal = Boolean(
    introPrimed && userId && pathname === '/dashboard' && hintsEnabled === null && !hintsCompleted,
  )

  const onDashboard = pathname === '/dashboard'
  const bottomNavHidden =
    !pathname ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/onboarding') ||
    pathname === '/splash' ||
    pathname === '/' ||
    pathname === '/welcome'
  /** Match BottomNav visibility so steps 1–3 stay visible while user is in Settings / Rota. */
  const tourChromeVisible =
    !bottomNavHidden ||
    (step === 4 && typeof pathname === 'string' && pathname.startsWith('/sleep')) ||
    (step === 3 && typeof pathname === 'string' && pathname.startsWith('/wearables'))
  const tourActive = Boolean(userId && hintsEnabled === true && !hintsCompleted && step >= 1 && step <= 4)
  const tourOverlayVisible = tourActive && tourChromeVisible

  const fetchRota = useCallback(async () => {
    try {
      const to = new Date()
      const from = new Date()
      from.setFullYear(from.getFullYear() - 1)
      const fromStr = from.toISOString().slice(0, 10)
      const toStr = to.toISOString().slice(0, 10)
      const res = await authedFetch(`/api/shifts?from=${fromStr}&to=${toStr}`)
      if (!res.ok) return
      const json = await res.json()
      const items = (json.items ?? json.shifts ?? []) as { shift_label?: string }[]
      const has = items.some((i) => {
        const lab = String(i.shift_label || '').toUpperCase()
        return lab && lab !== 'OFF'
      })
      setRotaDone(has)
    } catch {
      setRotaDone(false)
    }
  }, [])

  const fetchWearable = useCallback(async () => {
    try {
      const res = await authedFetch('/api/wearables/status')
      if (!res.ok) return
      const json = await res.json()
      setWearableDone(Boolean(json.connected))
    } catch {
      setWearableDone(false)
    }
  }, [])

  const fetchSleep = useCallback(async () => {
    try {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 120)
      const fromStr = from.toISOString().slice(0, 10)
      const toStr = to.toISOString().slice(0, 10)
      const res = await authedFetch(`/api/sleep/history?from=${fromStr}&to=${toStr}`)
      if (!res.ok) return
      const json = await res.json()
      const items = json.items ?? []
      setSleepDone(Array.isArray(items) && items.length > 0)
    } catch {
      setSleepDone(false)
    }
  }, [])

  useEffect(() => {
    if (!tourActive) return
    const tick = () => {
      void fetchRota()
      void fetchWearable()
      void fetchSleep()
      void refreshProfileHints()
      setLayoutTick((n) => n + 1)
    }
    tick()
    const id = window.setInterval(tick, 3500)
    return () => window.clearInterval(id)
  }, [tourActive, fetchRota, fetchWearable, fetchSleep, refreshProfileHints])

  const profileDone = useMemo(() => isGuidedTourProfileComplete(profile), [profile])

  useEffect(() => {
    if (!tourActive || step !== 1) return
    if (!profileDone) return
    const next: TourStep = 2
    setStep(next)
    if (userId) void persistHints(userId, { onboarding_step: next })
  }, [tourActive, step, profileDone, userId])

  useEffect(() => {
    if (!tourActive || step !== 2) return
    if (!rotaDone) return
    const next: TourStep = 3
    setStep(next)
    if (userId) void persistHints(userId, { onboarding_step: next })
  }, [tourActive, step, rotaDone, userId])

  useEffect(() => {
    if (!tourActive || step !== 3) return
    if (!wearableDone) return
    const next: TourStep = 4
    setStep(next)
    if (userId) void persistHints(userId, { onboarding_step: next })
  }, [tourActive, step, wearableDone, userId])

  useEffect(() => {
    if (!tourActive || step !== 4) return
    if (!sleepDone) return
    setHintsCompleted(true)
    setStep(0)
    setHintsEnabled(true)
    if (userId) {
      void persistHints(userId, {
        onboarding_hints_completed: true,
        onboarding_step: 0,
        onboarding_hints_enabled: true,
      })
    }
  }, [tourActive, step, sleepDone, userId])

  const targetSelector = useMemo(() => {
    if (!tourActive) return null
    if (step === 1 || step === 3) return `[data-guided-tour="${TOUR_KEYS.settings}"]`
    if (step === 2) return `[data-guided-tour="${TOUR_KEYS.calendar}"]`
    if (step === 4) return `[data-guided-tour="${TOUR_KEYS.sleep}"]`
    return null
  }, [tourActive, step])

  const targetRect = useTargetRect(targetSelector, layoutTick)

  const bubbleLayout = useMemo(() => {
    if (typeof window === 'undefined' || !targetRect) {
      return {
        top: '50%',
        left: '50%',
        width: 340,
        transform: 'translate(-50%, -50%)' as const,
        arrow: 'bottom' as const,
      }
    }
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cardW = Math.min(340, vw - 24)
    const cardH = 200
    const margin = 12
    const preferAbove = targetRect.top > cardH + margin + 72
    const topPx = preferAbove
      ? targetRect.top - cardH - margin
      : targetRect.top + targetRect.height + margin
    const leftPx = clamp(
      targetRect.left + targetRect.width / 2 - cardW / 2,
      margin,
      vw - cardW - margin,
    )
    return {
      top: `${clamp(topPx, margin, vh - cardH - margin)}px`,
      left: `${leftPx}px`,
      width: cardW,
      transform: 'none' as const,
      arrow: preferAbove ? ('bottom' as const) : ('top' as const),
    }
  }, [targetRect])

  const dismissForever = useCallback(async () => {
    if (!userId) return
    setIntroPrimed(false)
    setHintsCompleted(true)
    setHintsEnabled(false)
    setStep(0)
    await persistHints(userId, {
      onboarding_hints_enabled: false,
      onboarding_hints_completed: true,
      onboarding_step: 0,
    })
  }, [userId])

  const acceptIntro = useCallback(async () => {
    if (!userId) return
    setIntroPrimed(false)
    setHintsEnabled(true)
    setHintsCompleted(false)
    const s: TourStep = 1
    setStep(s)
    await persistHints(userId, {
      onboarding_hints_enabled: true,
      onboarding_hints_completed: false,
      onboarding_step: s,
    })
  }, [userId])

  const skipTour = useCallback(async () => {
    await dismissForever()
  }, [dismissForever])

  const completeAfterStep4 = useCallback(async () => {
    if (!userId) return
    setHintsCompleted(true)
    setStep(0)
    await persistHints(userId, {
      onboarding_hints_completed: true,
      onboarding_step: 0,
      onboarding_hints_enabled: true,
    })
  }, [userId])

  const goStep3Skip = useCallback(async () => {
    if (!userId) return
    const next: TourStep = 4
    setStep(next)
    await persistHints(userId, { onboarding_step: next })
  }, [userId])

  useEffect(() => {
    if (!showIntroModal) return
    const id = window.setTimeout(() => firstButtonRef.current?.focus(), 80)
    return () => window.clearTimeout(id)
  }, [showIntroModal])

  useEffect(() => {
    if (!showIntroModal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void dismissForever()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showIntroModal, dismissForever])

  if (!mounted || typeof document === 'undefined' || !userId) return null

  const portalTarget = document.body

  const stepTitle =
    step === 1
      ? t('guidedHints.step1.title')
      : step === 2
        ? t('guidedHints.step2.title')
        : step === 3
          ? t('guidedHints.step3.title')
          : step === 4
            ? t('guidedHints.step4.title')
            : ''
  const stepBody =
    step === 1
      ? t('guidedHints.step1.body')
      : step === 2
        ? t('guidedHints.step2.body')
        : step === 3
          ? t('guidedHints.step3.body')
          : step === 4
            ? t('guidedHints.step4.body')
            : ''

  const introModal =
    showIntroModal ? (
      <div className="fixed inset-0 z-[190] flex items-center justify-center p-5">
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]"
          aria-label={t('guidedHints.closeAria')}
          onClick={() => void dismissForever()}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="guided-hints-intro-title"
          className="relative z-[191] w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)]"
        >
          <h2 id="guided-hints-intro-title" className="text-lg font-semibold text-slate-900">
            {t('guidedHints.intro.title')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{t('guidedHints.intro.body')}</p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">{t('guidedHints.intro.noNote')}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse sm:justify-end">
            <button
              ref={firstButtonRef}
              type="button"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#05afc5] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0499b0] active:bg-[#0489a0]"
              onClick={() => void acceptIntro()}
            >
              {t('guidedHints.intro.yes')}
            </button>
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              onClick={() => void dismissForever()}
            >
              {t('guidedHints.intro.no')}
            </button>
          </div>
        </div>
      </div>
    ) : null

  const showSleepSpotlight = step === 4 && onDashboard

  const tourLayer =
    tourOverlayVisible ? (
      <>
        {targetRect && (step !== 4 || showSleepSpotlight) ? (
          <div
            className="pointer-events-none fixed z-[185] rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.78),0_0_24px_rgba(5,175,197,0.55)]"
            style={{
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
            aria-hidden
          />
        ) : null}

        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="guided-hints-step-title"
          className="fixed z-[186] max-h-[min(70vh,420px)] overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_18px_40px_-18px_rgba(15,23,42,0.35)]"
          style={{
            top: bubbleLayout.top,
            left: bubbleLayout.left,
            width: typeof bubbleLayout.width === 'number' ? `${bubbleLayout.width}px` : bubbleLayout.width,
            transform: bubbleLayout.transform,
          }}
        >
          <div className="relative">
            {targetRect && (
              <div
                className={`pointer-events-none absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border bg-white ${
                  bubbleLayout.arrow === 'bottom'
                    ? '-bottom-1.5 border-t-0 border-l-0 border-slate-200'
                    : '-top-1.5 border-b-0 border-r-0 border-slate-200'
                }`}
                aria-hidden
              />
            )}
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#05afc5]">
                {t('guidedHints.progress', { current: String(step), total: '4' })}
              </p>
              <button
                type="button"
                className="-m-1 rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label={t('guidedHints.closeAria')}
                onClick={() => void skipTour()}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <h3 id="guided-hints-step-title" className="mt-1 text-base font-semibold text-slate-900">
              {stepTitle}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{stepBody}</p>

            {step === 3 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-[#05afc5] px-4 text-sm font-semibold text-white hover:bg-[#0499b0]"
                  onClick={() => router.push('/wearables-setup')}
                >
                  {t('guidedHints.step3.connect')}
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  onClick={() => void goStep3Skip()}
                >
                  {t('guidedHints.step3.skip')}
                </button>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/sleep"
                  className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-[#05afc5] px-4 text-sm font-semibold text-white hover:bg-[#0499b0]"
                >
                  {t('guidedHints.step4.log')}
                </Link>
                <button
                  type="button"
                  className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  onClick={() => void completeAfterStep4()}
                >
                  {t('guidedHints.step4.skip')}
                </button>
              </div>
            ) : null}

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                className="text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-800"
                onClick={() => void skipTour()}
              >
                {t('guidedHints.skipTour')}
              </button>
            </div>
          </div>
        </div>
      </>
    ) : null

  return createPortal(
    <>
      {introModal}
      {tourLayer}
    </>,
    portalTarget,
  )
}
