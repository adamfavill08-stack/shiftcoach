'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

import { useTranslation } from '@/components/providers/language-provider'
import { useAuth } from '@/components/AuthProvider'
import { authedFetch } from '@/lib/supabase/authedFetch'
import { useShiftRhythm } from '@/lib/hooks/useShiftRhythm'
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus'
import { LoadingIndicator } from '@/components/ui/LoadingIndicator'
import { DashboardPager } from '@/components/dashboard/DashboardPager'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import { ShiftWeekStrip } from '@/components/dashboard/ShiftWeekStrip'
import CircadianCard from '@/components/circadian/CircadianCard'
import type { CircadianOutput } from '@/lib/circadian/calcCircadianPhase'
import type { FatigueRiskResult } from '@/lib/fatigue/calculateFatigueRisk'

const ShiftRhythmCard = dynamic(
  () => import('@/components/shift-rhythm/ShiftRhythmCard'),
  {
    ssr: true,
    loading: () => (
      <div
        className="mx-4 mt-4 min-h-[280px] animate-pulse rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-100 to-white shadow-sm"
        aria-busy="true"
        aria-label="Loading rhythm card"
      />
    ),
  },
)

const GOOGLE_FIT_ERROR_KEYS: Record<string, string> = {
  access_denied: 'dashboard.googleFit.accessDenied',
  server_not_configured: 'dashboard.googleFit.serverNotConfigured',
  redirect_uri_mismatch: 'dashboard.googleFit.redirectUriMismatch',
  token_exchange_failed: 'dashboard.googleFit.tokenExchangeFailed',
  no_access_token: 'dashboard.googleFit.noAccessToken',
  missing_code: 'dashboard.googleFit.missingCode',
  google_fit_deprecated: 'dashboard.googleFit.deprecated',
  unexpected: 'dashboard.googleFit.unexpected',
}

function DashboardContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { user: authUser, loading: authLoading } = useAuth()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [googleFitMessage, setGoogleFitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isUsingCachedData, setIsUsingCachedData] = useState(false)
  const { isOnline } = useNetworkStatus()

  const [circadian, setCircadian] = useState<CircadianOutput | null>(null)
  const [socialJetlag, setSocialJetlag] = useState<any>(null)

  // Track the last time we did a heavy refetch triggered by focus/refresh events,
  // so we don't repeat work when quickly navigating back from Settings.
  const lastFocusRefetchRef = useRef(0)

  const {
    total: totalScore,
    loading: shiftRhythmLoading,
    initialFetchComplete: shiftRhythmInitialFetchComplete,
    refetch: refetchShiftRhythm,
    hasData: hasShiftRhythmData,
    sleepDeficit,
    socialJetlag: shiftRhythmSocialJetlag,
    bingeRisk: shiftRhythmBingeRisk,
    fatigueRisk: shiftRhythmFatigueRisk,
  } = useShiftRhythm()

  const fetchSleep = useCallback(async (_uid: string) => {
    // Sleep is now surfaced on dedicated pages; keep this no-op to avoid extra dashboard pages.
    return
  }, [])

  const fetchActivity = useCallback(async () => {
    // Activity is now surfaced on dedicated pages; keep this no-op to avoid extra dashboard pages.
    return
  }, [])

  const [bingeRisk, setBingeRisk] = useState<any>(null)
  const [fatigueRisk, setFatigueRisk] = useState<FatigueRiskResult | null>(null)

  const cacheDashboardState = useCallback(
    (partial: { circadian?: CircadianOutput | null; socialJetlag?: any; bingeRisk?: any; fatigueRisk?: FatigueRiskResult | null }) => {
      if (typeof window === 'undefined') return
      const snapshot = {
        circadian,
        socialJetlag,
        bingeRisk,
        fatigueRisk,
        ...partial,
        cachedAt: new Date().toISOString(),
      }
      window.localStorage.setItem('dashboard:lastKnownState', JSON.stringify(snapshot))
    },
    [circadian, socialJetlag, bingeRisk, fatigueRisk],
  )

  // Keep the dashboard's social/binge state in sync with the consolidated
  // /api/shift-rhythm response from useShiftRhythm().
  // When offline we intentionally keep cached values instead.
  useEffect(() => {
    if (!isOnline) return

    setSocialJetlag(shiftRhythmSocialJetlag ?? null)
    setBingeRisk(shiftRhythmBingeRisk ?? null)
    setFatigueRisk(shiftRhythmFatigueRisk ?? null)

    cacheDashboardState({
      socialJetlag: shiftRhythmSocialJetlag ?? null,
      bingeRisk: shiftRhythmBingeRisk ?? null,
      fatigueRisk: shiftRhythmFatigueRisk ?? null,
    })

    setIsUsingCachedData(false)
  }, [isOnline, shiftRhythmSocialJetlag, shiftRhythmBingeRisk, shiftRhythmFatigueRisk, cacheDashboardState])

  const loadCachedDashboardState = useCallback(() => {
    if (typeof window === 'undefined') return false
    const raw = window.localStorage.getItem('dashboard:lastKnownState')
    if (!raw) return false
    try {
      const cached = JSON.parse(raw)
      setCircadian(cached.circadian ?? null)
      setSocialJetlag(cached.socialJetlag ?? null)
      setBingeRisk(cached.bingeRisk ?? null)
      setFatigueRisk(cached.fatigueRisk ?? null)
      setIsUsingCachedData(true)
      return true
    } catch {
      return false
    }
  }, [])

  const fetchCircadian = useCallback(async () => {
    try {
      const res = await authedFetch('/api/circadian/calculate', { cache: 'no-store' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        if (res.status === 503 || json.type === 'network_error') {
          console.warn('[dashboard] circadian fetch - database temporarily unavailable')
          // Don't log as error for network issues - it's expected when DB is down
        } else if (res.status === 401 || res.status === 403) {
          // Session cookie may lag behind client session; same handling as useShiftRhythm.
          console.warn('[dashboard] circadian fetch - auth not ready yet', res.status)
        } else {
          console.error('[dashboard] circadian fetch failed', res.status, json.error || '')
        }
        setCircadian(null)
        return
      }
      const json = await res.json()
      const nextCircadian =
        json.status === 'ok' && json.circadian
          ? json.circadian
          : json.status === undefined
            ? (json.circadian ?? null)
            : null
      setCircadian(nextCircadian)
      cacheDashboardState({ circadian: nextCircadian })
      setIsUsingCachedData(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const isNetwork = msg.includes('Failed to fetch') || msg.includes('fetch') || msg.includes('network')
      if (isNetwork) {
        console.warn('[dashboard] circadian fetch - network error (database may be unreachable)')
        const hadCache = loadCachedDashboardState()
        if (!hadCache) setCircadian(null)
        return
      }
      console.error('[dashboard] circadian fetch error', err)
      setCircadian(null)
    }
  }, [cacheDashboardState, loadCachedDashboardState])

  // These callbacks change when dashboard slice state updates (via cacheDashboardState deps).
  // The bootstrap effect must not list them as deps or we loop: fetch → setState → new callback → effect → fetch…
  const fetchCircadianRef = useRef(fetchCircadian)
  const refetchShiftRhythmRef = useRef(refetchShiftRhythm)

  useEffect(() => {
    fetchCircadianRef.current = fetchCircadian
    refetchShiftRhythmRef.current = refetchShiftRhythm
  }, [fetchCircadian, refetchShiftRhythm])

  // Google Fit redirect params — read from the URL on mount only (avoids useSearchParams + Suspense hydration mismatches).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const error = params.get('googleFitError')
    const connected = params.get('googleFitConnected')
    if (connected === '1') {
      setGoogleFitMessage({ type: 'success', text: t('dashboard.googleFit.success') })
      router.replace('/dashboard', { scroll: false })
      return
    }
    if (error) {
      const key = GOOGLE_FIT_ERROR_KEYS[error]
      const text = key
        ? t(key)
        : t('dashboard.googleFit.unknownCode', { code: error })
      setGoogleFitMessage({ type: 'error', text })
      router.replace('/dashboard', { scroll: false })
    }
  }, [router, t])

  useEffect(() => {
    if (authLoading) return

    if (!isOnline) {
      loadCachedDashboardState()
    }

    const isDev = process.env.NODE_ENV !== 'production'
    if (!authUser) {
      if (!isDev) {
        router.replace('/auth/sign-in')
        return
      }
      const devUserId = process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user'
      setUserId(devUserId)
      setLoading(false)
      if (isOnline) void fetchCircadianRef.current()
      return
    }

    setUserId(authUser.id)
    setLoading(false)
    void fetchSleep(authUser.id)
    if (isOnline) {
      void fetchCircadianRef.current()
    }
  }, [authLoading, authUser, isOnline, loadCachedDashboardState, router, fetchSleep])

  // Load activity summary after the main dashboard data so first paint is faster
  useEffect(() => {
    if (!userId) return
    void fetchActivity()
  }, [userId, fetchActivity])

  // Refetch sleep and circadian data when window gains focus and there's a refresh flag
  useEffect(() => {
    const handleFocus = () => {
      if (!isOnline) return
      const sleepRefresh = typeof window !== 'undefined' ? localStorage.getItem('sleepRefresh') : null
      if (sleepRefresh && userId) {
        const now = Date.now()
        if (now - lastFocusRefetchRef.current < 30000) return
        lastFocusRefetchRef.current = now
        // Clear the flag
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sleepRefresh')
        }
        // Refetch sleep, circadian, and shift rhythm data
        void fetchSleep(userId)
        void fetchCircadianRef.current()
        void refetchShiftRhythmRef.current() // Refresh shift rhythm score
      }
    }

    // Check immediately in case we just navigated here
    handleFocus()

    // Also listen for focus events
    window.addEventListener('focus', handleFocus)
    
    // Listen for custom sleep refresh event (for same-window updates)
    const handleSleepRefresh = () => {
      if (!isOnline || !userId) return
      const now = Date.now()
      if (now - lastFocusRefetchRef.current < 30000) return
      lastFocusRefetchRef.current = now
      void fetchSleep(userId)
      void fetchCircadianRef.current()
      // Force recalculation of shift rhythm score since sleep data changed
      setTimeout(() => {
        void refetchShiftRhythmRef.current(true) // Force recalculation
      }, 1000)
    }
    
    // Listen for rota events (shifts saved/cleared) to refresh ShiftLag
    const handleRotaUpdate = () => {
      if (!isOnline || !userId) return
      const now = Date.now()
      if (now - lastFocusRefetchRef.current < 30000) return
      lastFocusRefetchRef.current = now
      // Add delay to ensure shifts are saved to database
      setTimeout(() => {
        void refetchShiftRhythmRef.current(true)
      }, 800)
    }
    
    window.addEventListener('sleep-refreshed', handleSleepRefresh)
    window.addEventListener('rota-saved', handleRotaUpdate)
    window.addEventListener('rota-cleared', handleRotaUpdate)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('sleep-refreshed', handleSleepRefresh)
      window.removeEventListener('rota-saved', handleRotaUpdate)
      window.removeEventListener('rota-cleared', handleRotaUpdate)
    }
  }, [userId, isOnline, fetchSleep])

  const resolvedSocialJetlag = isOnline ? (shiftRhythmSocialJetlag ?? null) : socialJetlag
  const resolvedBingeRisk = isOnline ? (shiftRhythmBingeRisk ?? null) : bingeRisk
  const resolvedFatigueRisk = isOnline ? (shiftRhythmFatigueRisk ?? null) : fatigueRisk

  const pages = useMemo(
    () => [
      {
        id: 'home',
        label: t('dashboard.homeLabel'),
        content: (
          <ShiftRhythmCard
            score={totalScore != null ? totalScore * 10 : undefined}
            socialJetlag={resolvedSocialJetlag}
            bingeRisk={resolvedBingeRisk}
            fatigueRisk={resolvedFatigueRisk}
            isBingeRiskLoading={isOnline ? shiftRhythmLoading : false}
            hasRhythmData={hasShiftRhythmData}
            sleepDeficit={sleepDeficit}
          />
        ),
      },
    ],
    [totalScore, resolvedSocialJetlag, resolvedBingeRisk, resolvedFatigueRisk, isOnline, shiftRhythmLoading, hasShiftRhythmData, sleepDeficit, t]
  )

  const shouldShowDashboardSpinner =
    loading || !shiftRhythmInitialFetchComplete || shiftRhythmLoading

  if (shouldShowDashboardSpinner) {
    return (
      <main className="min-h-screen bg-slate-100 pb-6 pt-10">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center">
          <LoadingIndicator message={t('dashboard.loading')} size="md" />
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div className="w-full max-w-md bg-slate-100">
        {googleFitMessage && (
          <div
            className={`mx-4 mt-2 rounded-lg px-3 py-2 text-sm ${
              googleFitMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
            }`}
          >
            {googleFitMessage.text}
            <button
              type="button"
              aria-label={t('dashboard.dismissAria')}
              className="ml-2 font-medium underline"
              onClick={() => setGoogleFitMessage(null)}
            >
              {t('dashboard.dismiss')}
            </button>
          </div>
        )}
        {!isOnline && (
          <div className="mx-4 mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status" aria-live="polite">
            {t('dashboard.offlineNotice')}
          </div>
        )}
        {isUsingCachedData && (
          <div className="mx-4 mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700" role="status" aria-live="polite">
            {t('dashboard.cachedNotice')}
          </div>
        )}
        <div className="min-h-screen pb-6 bg-slate-100">
          <div id="phone-root" className="pb-4 relative">
            <DashboardHeader />
            <ShiftWeekStrip />
            <CircadianCard showSupportingSections={false} />
            <DashboardPager pages={pages} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <DashboardContent />
}

