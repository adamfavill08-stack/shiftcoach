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
import { ROTA_UPDATED_EVENT, runShiftAgent } from '@/lib/shift-agent/shiftAgent'
import {
  CIRCADIAN_AFTER_ROTA_SHIFT_STATE_EVENT,
  type CircadianAfterRotaDetail,
} from '@/lib/circadian/circadianAgent'
import type { UserShiftState } from '@/lib/shift-agent/types'

const STALE_MS = 6 * 60 * 60 * 1000

export type ShiftStateContextValue = {
  userShiftState: UserShiftState | null
  isLoading: boolean
  error: string | null
  refreshShiftState: (reason?: string) => Promise<UserShiftState | null>
}

const ShiftStateContext = createContext<ShiftStateContextValue | null>(null)

export function ShiftStateProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [userShiftState, setUserShiftState] = useState<UserShiftState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const refreshShiftState = useCallback(
    async (reason = 'manual'): Promise<UserShiftState | null> => {
      if (!user?.id) {
        setUserShiftState(null)
        setError(null)
        return null
      }
      setIsLoading(true)
      setError(null)
      try {
        const state = await runShiftAgent({
          supabase,
          userId: user.id,
          reason,
        })
        if (mounted.current) setUserShiftState(state)
        return state
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'shiftAgent failed'
        if (mounted.current) {
          setError(msg)
          console.error('[ShiftStateProvider]', msg, e)
        }
        return null
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
      setUserShiftState(null)
      setError(null)
    }
  }, [user?.id])

  const stateRef = useRef<UserShiftState | null>(null)
  stateRef.current = userShiftState

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) {
      setUserShiftState(null)
      setError(null)
      return
    }

    const s = stateRef.current
    const stale = !s || Date.now() - s.lastCalculated.getTime() > STALE_MS
    if (stale) {
      void refreshShiftState(s ? 'stale_6h' : 'app_load')
    }
  }, [authLoading, user?.id, refreshShiftState])

  /** Listen for rota saves elsewhere in the app. */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => {
      if (!user?.id) return
      void refreshShiftState('rota_updated_event').then((state) => {
        if (state && typeof window !== 'undefined') {
          const detail: CircadianAfterRotaDetail = {
            reason: 'rota_updated_event',
            userShiftState: state,
          }
          window.dispatchEvent(new CustomEvent(CIRCADIAN_AFTER_ROTA_SHIFT_STATE_EVENT, { detail }))
        }
      })
    }
    window.addEventListener(ROTA_UPDATED_EVENT, handler)
    return () => window.removeEventListener(ROTA_UPDATED_EVENT, handler)
  }, [user?.id, refreshShiftState])

  const value = useMemo(
    () => ({
      userShiftState,
      isLoading: authLoading || isLoading,
      error,
      refreshShiftState,
    }),
    [userShiftState, authLoading, isLoading, error, refreshShiftState],
  )

  return <ShiftStateContext.Provider value={value}>{children}</ShiftStateContext.Provider>
}

export function useShiftState(): ShiftStateContextValue {
  const ctx = useContext(ShiftStateContext)
  if (!ctx) {
    throw new Error('useShiftState must be used within ShiftStateProvider')
  }
  return ctx
}
