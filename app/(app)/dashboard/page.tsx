'use client'

import dynamic from 'next/dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'
import { useShiftRhythm } from '@/lib/hooks/useShiftRhythm'
import { DashboardPager } from '@/components/dashboard/DashboardPager'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import SleepPage from '@/components/dashboard/pages/SleepPage'
import ShiftRhythmCard from '@/components/dashboard/ShiftRhythmCard'
import { ActivitySummary, SleepSummary } from '@/components/dashboard/types'
import type { CircadianOutput } from '@/lib/circadian/calcCircadianPhase'
const ActivityAndStepsPage = dynamic(() => import('@/components/dashboard/pages/ActivityAndStepsPage'), { ssr: false })
const AdjustedCaloriesPage = dynamic(() => import('@/components/dashboard/pages/AdjustedCaloriesPage'), { ssr: false })

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [sleepSummary, setSleepSummary] = useState<SleepSummary | null>(null)
  const [activitySummary, setActivitySummary] = useState<ActivitySummary | null>(null)
  const [circadian, setCircadian] = useState<CircadianOutput | null>(null)

  const {
    total: totalScore,
    refetch: refetchShiftRhythm,
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

  const fetchSleep = useCallback(async (uid: string) => {
    try {
      // Use API route instead of client-side Supabase to work with dev fallback
      const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const today = new Date().toISOString().slice(0, 10)
      
      const res = await fetch(`/api/sleep/history?from=${sevenDaysAgo}&to=${today}`, {
        cache: 'no-store'
      })
      
      if (!res.ok) {
        console.error('[dashboard] sleep fetch failed', res.status)
        setSleepSummary({ average7d: null, message: 'Log sleep to track your rhythm.' })
        return
      }

      const json = await res.json()
      const data = json.items ?? []

    if (!data?.length) {
      setSleepSummary({ average7d: null, message: 'Log sleep to track your rhythm.' })
      return
    }

    // Filter to last 7 days and sort by end_ts descending
    const sevenDaysAgoTs = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).getTime()
    const recentData = data
      .filter((row: any) => {
        const endTs = new Date(row.end_ts).getTime()
        return endTs >= sevenDaysAgoTs
      })
      .sort((a: any, b: any) => {
        return new Date(b.end_ts).getTime() - new Date(a.end_ts).getTime()
      })
      .slice(0, 7)

    if (!recentData.length) {
      setSleepSummary({ average7d: null, message: 'Log sleep to track your rhythm.' })
      return
    }

    const [latest] = recentData
    const durations = recentData.map((row: any) => {
      if (typeof row.sleep_hours === 'number') return row.sleep_hours
      return Math.max(
        0,
        (new Date(row.end_ts).getTime() - new Date(row.start_ts).getTime()) / 3600000,
      )
    })

    const average7d = Math.round((durations.reduce((sum: number, hours: number) => sum + hours, 0) / durations.length) * 10) / 10
    const lastNightDuration =
      latest.sleep_hours ??
      Math.max(
        0,
        (new Date(latest.end_ts).getTime() - new Date(latest.start_ts).getTime()) / 3600000,
      )

    setSleepSummary({
      lastNight: {
        start: latest.start_ts,
        end: latest.end_ts,
        durationHours: Number(lastNightDuration.toFixed(1)),
      },
      average7d,
      message:
        average7d >= 7
          ? 'Sleep timing is supporting your shift.'
          : 'Short stretches can throw rhythm off—aim for 7h tonight.',
    })
    } catch (err: any) {
      console.error('[dashboard] sleep fetch error', err)
      setSleepSummary({ average7d: null, message: 'Log sleep to track your rhythm.' })
    }
  }, [])

  const fetchActivity = useCallback(async () => {
    const res = await fetch('/api/activity/today', { cache: 'no-store' })
    if (!res.ok) {
      console.error('[dashboard] activity fetch failed', res.status)
      setActivitySummary({
        steps: 0,
        goal: 10000,
        activeMinutes: null,
        lastSyncedAt: null,
        source: 'Manual entry',
      })
      return
    }
    const json = await res.json()
    setActivitySummary(json.activity ?? null)
  }, [])

  const fetchCircadian = useCallback(async () => {
    try {
      const res = await fetch('/api/circadian/calculate', { cache: 'no-store' })
      if (!res.ok) {
        console.error('[dashboard] circadian fetch failed', res.status)
        setCircadian(null)
        return
      }
      const json = await res.json()
      setCircadian(json.circadian ?? null)
    } catch (err: any) {
      console.error('[dashboard] circadian fetch error', err)
      setCircadian(null)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const uid = await loadUser()
      if (!uid) return
      setLoading(true)
      await Promise.all([
        fetchSleep(uid),
        fetchActivity(),
        fetchCircadian(),
      ])
      setLoading(false)
    })()
  }, [loadUser, fetchSleep, fetchActivity, fetchCircadian])

  // Refetch sleep and circadian data when window gains focus and there's a refresh flag
  useEffect(() => {
    const handleFocus = () => {
      const sleepRefresh = typeof window !== 'undefined' ? localStorage.getItem('sleepRefresh') : null
      if (sleepRefresh && userId) {
        // Clear the flag
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sleepRefresh')
        }
        // Refetch sleep, circadian, and shift rhythm data
        void fetchSleep(userId)
        void fetchCircadian()
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
        void fetchSleep(userId)
        void fetchCircadian()
        // Force recalculation of shift rhythm score since sleep data changed
        // Call with a small delay to ensure sleep data is saved first
        setTimeout(() => {
          void refetchShiftRhythm(true) // Force recalculation
        }, 500)
      }
    }
    window.addEventListener('sleep-refreshed', handleSleepRefresh)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('sleep-refreshed', handleSleepRefresh)
    }
  }, [userId, fetchSleep, fetchCircadian, refetchShiftRhythm])

  const pages = useMemo(
    () => [
      {
        id: 'rhythm',
        label: 'Rhythm',
        content: (
          <ShiftRhythmCard
            score={totalScore != null ? totalScore * 10 : undefined}
            circadian={circadian}
          />
        ),
      },
      {
        id: 'sleep',
        label: 'Sleep',
        content: <SleepPage />,
      },
      {
        id: 'calories',
        label: 'Calories',
        content: <AdjustedCaloriesPage />,
      },
      {
        id: 'activity',
        label: 'Activity',
        content: <ActivityAndStepsPage />,
      },
    ],
    [totalScore, circadian]
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 pb-6 pt-10 text-center text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Preparing your ShiftCoach dashboard…
      </main>
    )
  }

  return (
    <div className="bg-[#F5F5F7] min-h-screen flex justify-center">
      <div className="w-full max-w-md">
        <main className="min-h-screen pb-6">
          <div id="phone-root" className="pb-4 relative">
            <DashboardHeader />
            <DashboardPager pages={pages} />
          </div>
        </main>
      </div>
    </div>
  )
}


