'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { useTranslation } from '@/components/providers/language-provider'
import { supabase } from '@/lib/supabase'
import { useShiftRhythm } from '@/lib/hooks/useShiftRhythm'
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus'
import { DashboardPager } from '@/components/dashboard/DashboardPager'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import type { CircadianOutput } from '@/lib/circadian/calcCircadianPhase'
import ShiftRhythmCard from '@/components/shift-rhythm/ShiftRhythmCard'

const GOOGLE_FIT_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Google Fit connection was denied.',
  server_not_configured: 'Google Fit is not configured on the server. Check Vercel env vars and redeploy.',
  redirect_uri_mismatch: 'Redirect URI mismatch. Ensure GOOGLE_FIT_REDIRECT_URI in Vercel matches Google Cloud exactly.',
  token_exchange_failed: 'Token exchange failed. Check client secret and that the redirect URI matches.',
  no_access_token: 'Google did not return an access token.',
  missing_code: 'Google did not return an authorization code.',
  google_fit_deprecated: 'Google Fit onboarding is disabled. Use Health Connect on Android or Apple Health on iPhone.',
  unexpected: 'An unexpected error occurred. Check Vercel function logs.',
}

function DashboardContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [googleFitMessage, setGoogleFitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isUsingCachedData, setIsUsingCachedData] = useState(false)
  const { isOnline } = useNetworkStatus()

  const [circadian, setCircadian] = useState<CircadianOutput | null>(null)
  const [socialJetlag, setSocialJetlag] = useState<any>(null)
  const [shiftLag, setShiftLag] = useState<any>(null)

  // Track the last time we did a heavy refetch triggered by focus/refresh events,
  // so we don't repeat work when quickly navigating back from Settings.
  const lastFocusRefetchRef = useRef(0)

  const {
    total: totalScore,
    refetch: refetchShiftRhythm,
    hasData: hasShiftRhythmData,
    sleepDeficit,
    socialJetlag: shiftRhythmSocialJetlag,
    bingeRisk: shiftRhythmBingeRisk,
  } = useShiftRhythm()

  const loadUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      // In development, allow the app to work with server-side dev fallback
      // The API routes will handle authentication on the server
      const isDev = process.env.NODE_ENV !== 'production'
      if (!isDev) {
        router.replace('/auth/sign-in')
        return null
      }
      // In dev, we can still use the app - API routes will use dev fallback user
      // We'll use a placeholder userId for client-side state
      const devUserId = process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user'
      setUserId(devUserId)
      return devUserId
    }
    setUserId(user.id)
    return user.id
  }, [router])

  const fetchSleep = useCallback(async (_uid: string) => {
    // Sleep is now surfaced on dedicated pages; keep this no-op to avoid extra dashboard pages.
    return
  }, [])

  const fetchActivity = useCallback(async () => {
    // Activity is now surfaced on dedicated pages; keep this no-op to avoid extra dashboard pages.
    return
  }, [])

  const [bingeRisk, setBingeRisk] = useState<any>(null)

  const cacheDashboardState = useCallback(
    (partial: { circadian?: CircadianOutput | null; socialJetlag?: any; shiftLag?: any; bingeRisk?: any }) => {
      if (typeof window === 'undefined') return
      const snapshot = {
        circadian,
        socialJetlag,
        shiftLag,
        bingeRisk,
        ...partial,
        cachedAt: new Date().toISOString(),
      }
      window.localStorage.setItem('dashboard:lastKnownState', JSON.stringify(snapshot))
    },
    [circadian, socialJetlag, shiftLag, bingeRisk],
  )

  // Keep the dashboard's social/binge state in sync with the consolidated
  // /api/shift-rhythm response from useShiftRhythm().
  // When offline we intentionally keep cached values instead.
  useEffect(() => {
    if (!isOnline) return

    setSocialJetlag(shiftRhythmSocialJetlag ?? null)
    setBingeRisk(shiftRhythmBingeRisk ?? null)

    cacheDashboardState({
      socialJetlag: shiftRhythmSocialJetlag ?? null,
      bingeRisk: shiftRhythmBingeRisk ?? null,
    })

    setIsUsingCachedData(false)
  }, [isOnline, shiftRhythmSocialJetlag, shiftRhythmBingeRisk, cacheDashboardState])

  const loadCachedDashboardState = useCallback(() => {
    if (typeof window === 'undefined') return false
    const raw = window.localStorage.getItem('dashboard:lastKnownState')
    if (!raw) return false
    try {
      const cached = JSON.parse(raw)
      setCircadian(cached.circadian ?? null)
      setSocialJetlag(cached.socialJetlag ?? null)
      setShiftLag(cached.shiftLag ?? null)
      setBingeRisk(cached.bingeRisk ?? null)
      setIsUsingCachedData(true)
      return true
    } catch {
      return false
    }
  }, [])

  const fetchCircadian = useCallback(async () => {
    try {
      const res = await fetch('/api/circadian/calculate', {
        next: { revalidate: 30 },
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        if (res.status === 503 || json.type === 'network_error') {
          console.warn('[dashboard] circadian fetch - database temporarily unavailable')
          // Don't log as error for network issues - it's expected when DB is down
        } else {
          console.error('[dashboard] circadian fetch failed', res.status, json.error || '')
        }
        setCircadian(null)
        return
      }
      const json = await res.json()
      setCircadian(json.circadian ?? null)
      cacheDashboardState({ circadian: json.circadian ?? null })
      setIsUsingCachedData(false)
    } catch (err: any) {
      // Network errors are expected when DB is unreachable
      if (err?.message?.includes('fetch') || err?.message?.includes('network')) {
        console.warn('[dashboard] circadian fetch - network error (database may be unreachable)')
      } else {
        console.error('[dashboard] circadian fetch error', err)
      }
      setCircadian(null)
      if (!isOnline) {
        loadCachedDashboardState()
      }
    }
  }, [cacheDashboardState, isOnline, loadCachedDashboardState])

  const fetchShiftLag = useCallback(async () => {
    try {
      const res = await fetch('/api/shiftlag', {
        next: { revalidate: 30 },
      })
      if (!res.ok) {
        console.error('[dashboard] shiftlag fetch failed', res.status)
        setShiftLag(null)
        return
      }
      const json = await res.json()
      if (json.error) {
        console.warn('[dashboard] shiftlag error:', json.error)
        setShiftLag(null)
        return
      }
      setShiftLag(json)
      cacheDashboardState({ shiftLag: json })
      setIsUsingCachedData(false)
    } catch (err: any) {
      console.error('[dashboard] shiftlag fetch error', err)
      setShiftLag(null)
      if (!isOnline) {
        loadCachedDashboardState()
      }
    }
  }, [cacheDashboardState, isOnline, loadCachedDashboardState])

  // Show Google Fit callback result and clear URL
  useEffect(() => {
    const error = searchParams.get('googleFitError')
    const connected = searchParams.get('googleFitConnected')
    if (connected === '1') {
      setGoogleFitMessage({ type: 'success', text: 'Google Fit connected. You can sync wearables now.' })
      router.replace('/dashboard', { scroll: false })
      return
    }
    if (error) {
      const text = GOOGLE_FIT_ERROR_MESSAGES[error] ?? `Google Fit error: ${error}`
      setGoogleFitMessage({ type: 'error', text })
      router.replace('/dashboard', { scroll: false })
    }
  }, [searchParams, router])

  useEffect(() => {
    if (!isOnline) {
      loadCachedDashboardState()
    }
    ;(async () => {
      const uid = await loadUser()
      if (!uid) return
      // Show the dashboard shell as soon as the user is known
      setLoading(false)
      // Kick off data fetches in the background so first paint is faster
      void fetchSleep(uid)
      void fetchCircadian()
      void fetchShiftLag()
    })()
  }, [isOnline, loadCachedDashboardState, loadUser, fetchSleep, fetchCircadian, fetchShiftLag])

  // Load activity summary after the main dashboard data so first paint is faster
  useEffect(() => {
    if (!userId) return
    void fetchActivity()
  }, [userId, fetchActivity])

  // Refetch sleep and circadian data when window gains focus and there's a refresh flag
  useEffect(() => {
    const handleFocus = () => {
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
        void fetchCircadian()
        void fetchShiftLag()
        void refetchShiftRhythm() // Refresh shift rhythm score
      }
    }

    // Check immediately in case we just navigated here
    handleFocus()

    // Also listen for focus events
    window.addEventListener('focus', handleFocus)
    
    // Listen for custom sleep refresh event (for same-window updates)
    const handleSleepRefresh = () => {
      if (userId) {
        const now = Date.now()
        if (now - lastFocusRefetchRef.current < 30000) return
        lastFocusRefetchRef.current = now
        void fetchSleep(userId)
        void fetchCircadian()
        // Add delay for ShiftLag to ensure sleep data is saved to database
        setTimeout(() => {
          void fetchShiftLag()
        }, 800)
        // Force recalculation of shift rhythm score since sleep data changed
        setTimeout(() => {
          void refetchShiftRhythm(true) // Force recalculation
        }, 1000)
      }
    }
    
    // Listen for rota events (shifts saved/cleared) to refresh ShiftLag
    const handleRotaUpdate = () => {
      if (userId) {
        const now = Date.now()
        if (now - lastFocusRefetchRef.current < 30000) return
        lastFocusRefetchRef.current = now
        // Add delay to ensure shifts are saved to database
        setTimeout(() => {
          void fetchShiftLag()
          void refetchShiftRhythm(true)
        }, 800)
      }
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
  }, [userId, fetchSleep, fetchCircadian, fetchShiftLag, refetchShiftRhythm])

  const pages = useMemo(
    () => [
      {
        id: 'home',
        label: t('dashboard.homeLabel'),
        content: (
          <ShiftRhythmCard
            score={totalScore != null ? totalScore * 10 : undefined}
            circadian={circadian}
            socialJetlag={socialJetlag}
            shiftLag={shiftLag}
            bingeRisk={bingeRisk}
            hasRhythmData={hasShiftRhythmData}
            sleepDeficit={sleepDeficit}
          />
        ),
      },
    ],
    [totalScore, circadian, socialJetlag, shiftLag, bingeRisk, hasShiftRhythmData, sleepDeficit, t]
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 pb-6 pt-10 text-center text-sm text-slate-500">
        {t('dashboard.loading')}
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-md bg-white">
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
              aria-label="Dismiss"
              className="ml-2 font-medium underline"
              onClick={() => setGoogleFitMessage(null)}
            >
              Dismiss
            </button>
          </div>
        )}
        {!isOnline && (
          <div className="mx-4 mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status" aria-live="polite">
            You are offline. Showing last available dashboard data where possible.
          </div>
        )}
        {isUsingCachedData && (
          <div className="mx-4 mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700" role="status" aria-live="polite">
            Displaying cached guidance until connection is restored.
          </div>
        )}
        <main className="min-h-screen pb-6 bg-white">
          <div id="phone-root" className="pb-4 relative">
            <DashboardHeader />
            <DashboardPager pages={pages} />
          </div>
        </main>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 pb-6 pt-10 text-center text-sm text-slate-500">
          {t('dashboard.loading')}
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}

