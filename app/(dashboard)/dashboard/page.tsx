'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'
import { useShiftRhythm } from '@/lib/hooks/useShiftRhythm'
import { DashboardPager } from '@/components/dashboard/DashboardPager'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import type { CircadianOutput } from '@/lib/circadian/calcCircadianPhase'
import ShiftRhythmCard from '@/components/shift-rhythm/ShiftRhythmCard'

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
    } catch (err: any) {
      // Network errors are expected when DB is unreachable
      if (err?.message?.includes('fetch') || err?.message?.includes('network')) {
        console.warn('[dashboard] circadian fetch - network error (database may be unreachable)')
      } else {
        console.error('[dashboard] circadian fetch error', err)
      }
      setCircadian(null)
    }
  }, [])

  const [bingeRisk, setBingeRisk] = useState<any>(null)

  const fetchShiftRhythm = useCallback(async () => {
    try {
      const res = await fetch('/api/shift-rhythm', {
        next: { revalidate: 30 },
      })
      if (!res.ok) {
        console.error('[dashboard] shift-rhythm fetch failed', res.status)
        setSocialJetlag(null)
        setBingeRisk(null)
        return
      }
      const json = await res.json()
      setSocialJetlag(json.socialJetlag ?? null)
      const bingeRiskValue = json.bingeRisk ?? null
      setBingeRisk(bingeRiskValue)
    } catch (err: any) {
      console.error('[dashboard] shift-rhythm fetch error', err)
      setSocialJetlag(null)
      setBingeRisk(null)
    }
  }, [])

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
    } catch (err: any) {
      console.error('[dashboard] shiftlag fetch error', err)
      setShiftLag(null)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const uid = await loadUser()
      if (!uid) return
      // Show the dashboard shell as soon as the user is known
      setLoading(false)
      // Kick off data fetches in the background so first paint is faster
      void fetchSleep(uid)
      void fetchCircadian()
      void fetchShiftRhythm()
      void fetchShiftLag()
    })()
  }, [loadUser, fetchSleep, fetchCircadian, fetchShiftRhythm, fetchShiftLag])

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
        void fetchShiftRhythm()
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
        void fetchShiftRhythm()
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
          void fetchShiftRhythm()
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
  }, [userId, fetchSleep, fetchCircadian, fetchShiftRhythm, fetchShiftLag, refetchShiftRhythm])

  const pages = useMemo(
    () => [
      {
        id: 'home',
        label: 'Home',
        content: (
          <ShiftRhythmCard
            score={totalScore != null ? totalScore * 10 : undefined}
            circadian={circadian}
            socialJetlag={socialJetlag}
            shiftLag={shiftLag}
            bingeRisk={bingeRisk}
            hasRhythmData={hasShiftRhythmData}
          />
        ),
      },
    ],
    [totalScore, circadian, socialJetlag, shiftLag, bingeRisk, hasShiftRhythmData]
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 pb-6 pt-10 text-center text-sm text-slate-500">
        Preparing your ShiftCoach dashboard…
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-md bg-white">
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

