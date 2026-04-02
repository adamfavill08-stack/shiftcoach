'use client'

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { useShiftState } from '@/components/providers/shift-state-provider'
import type { UserShiftState } from '@/lib/shift-agent/types'
import type { CircadianState } from '@/lib/circadian/calculateCircadianScore'
import {
  CIRCADIAN_AFTER_ROTA_SHIFT_STATE_EVENT,
  SLEEP_LOGS_UPDATED_EVENT,
  getMsUntilNextLocalClockTime,
  runCircadianAgent,
} from '@/lib/circadian/circadianAgent'
import type { CircadianAfterRotaDetail } from '@/lib/circadian/circadianAgent'

const STALE_MS = 6 * 60 * 60 * 1000

export type CircadianStateContextValue = {
  circadianState: CircadianState | null
  isLoading: boolean
  error: string | null
  refreshCircadianState: (reason?: string, shiftOverride?: UserShiftState | null) => Promise<void>
}

const CircadianStateContext = createContext<CircadianStateContextValue | null>(null)

export function CircadianStateProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { userShiftState } = useShiftState()
  const userShiftStateRef = useRef(userShiftState)
  userShiftStateRef.current = userShiftState

  const [circadianState, setCircadianState] = useState<CircadianState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const refreshCircadianState = useCallback(
    async (reason = 'manual', shiftOverride?: UserShiftState | null) => {
      if (!user?.id) {
        setCircadianState(null)
        setError(null)
        return
      }
      const shiftContext = shiftOverride !== undefined ? shiftOverride : userShiftStateRef.current
      setIsLoading(true)
      setError(null)
      try {
        const state = await runCircadianAgent({
          supabase,
          userId: user.id,
          userShiftState: shiftContext,
          reason,
        })
        if (mounted.current) setCircadianState(state)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'circadianAgent failed'
        if (mounted.current) {
          setError(msg)
          console.error('[CircadianStateProvider]', msg, e)
        }
      } finally {
        if (mounted.current) setIsLoading(false)
      }
    },
    [user?.id],
  )

  const lastUserIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (user?.id !== lastUserIdRef.current) {
      lastUserIdRef.current = user?.id ?? null
      setCircadianState(null)
      setError(null)
    }
  }, [user?.id])

  const circadianRef = useRef<CircadianState | null>(null)
  circadianRef.current = circadianState

  const shiftCalcMs = userShiftState?.lastCalculated?.getTime() ?? 0

  /** App load, stale (>6h), or whenever the shift agent refreshes (shiftCalcMs tick). */
  useEffect(() => {
    if (authLoading) return
    if (!user?.id) {
      setCircadianState(null)
      setError(null)
      return
    }
    const s = circadianRef.current
    const circadianStale = !s || Date.now() - s.lastCalculated.getTime() > STALE_MS

    if (shiftCalcMs === 0) {
      if (circadianStale) void refreshCircadianState('app_load_awaiting_shift', null)
      return
    }

    if (circadianStale) {
      void refreshCircadianState('stale_6h', userShiftStateRef.current)
      return
    }

    void refreshCircadianState('shift_state_tick', userShiftStateRef.current)
  }, [authLoading, user?.id, shiftCalcMs, refreshCircadianState])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onSleep = () => {
      if (user?.id) void refreshCircadianState('sleep_logs_updated')
    }
    const onAfterRota = (ev: Event) => {
      const detail = (ev as CustomEvent<CircadianAfterRotaDetail>).detail
      if (user?.id && detail?.userShiftState) {
        void refreshCircadianState(detail.reason ?? 'rota_updated_event', detail.userShiftState)
      }
    }
    window.addEventListener(SLEEP_LOGS_UPDATED_EVENT, onSleep)
    window.addEventListener(CIRCADIAN_AFTER_ROTA_SHIFT_STATE_EVENT, onAfterRota)
    return () => {
      window.removeEventListener(SLEEP_LOGS_UPDATED_EVENT, onSleep)
      window.removeEventListener(CIRCADIAN_AFTER_ROTA_SHIFT_STATE_EVENT, onAfterRota)
    }
  }, [user?.id, refreshCircadianState])

  useEffect(() => {
    if (!user?.id || authLoading) return
    let cancelled = false
    let tid: ReturnType<typeof setTimeout> | undefined

    const arm = async () => {
      if (cancelled) return
      const { data } = await supabase.from('profiles').select('tz').eq('user_id', user.id).maybeSingle()
      if (cancelled) return
      const tz = (data?.tz as string | undefined)?.trim() || 'UTC'
      const ms = getMsUntilNextLocalClockTime(new Date(), tz, 6, 30)
      tid = setTimeout(async () => {
        if (cancelled) return
        await refreshCircadianState('daily_0630_local')
        arm()
      }, ms)
    }

    void arm()
    return () => {
      cancelled = true
      if (tid) clearTimeout(tid)
    }
  }, [user?.id, authLoading, refreshCircadianState])

  const value = useMemo(
    () => ({
      circadianState,
      isLoading: authLoading || isLoading,
      error,
      refreshCircadianState,
    }),
    [circadianState, authLoading, isLoading, error, refreshCircadianState],
  )

  return <CircadianStateContext.Provider value={value}>{children}</CircadianStateContext.Provider>
}

export function useCircadianState(): CircadianStateContextValue {
  const ctx = useContext(CircadianStateContext)
  if (!ctx) {
    throw new Error('useCircadianState must be used within CircadianStateProvider')
  }
  return ctx
}
