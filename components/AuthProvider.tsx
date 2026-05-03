'use client'

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { usePathname } from 'next/navigation'

import { MobileAuthDeepLinkListener } from '@/components/auth/MobileAuthDeepLinkListener'
import { supabase } from '@/lib/supabase'
import { hydrateNativeAuthFromCookiesIfNeeded } from '@/lib/supabase/nativeSessionHydrate'

import type { User } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type AuthCtx = { user: User | null; loading: boolean }

const Ctx = createContext<AuthCtx>({ user: null, loading: true })

export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // OAuth completes with HTTP-only cookie chunks in the WebView; native client uses localStorage.
  useEffect(() => {
    void hydrateNativeAuthFromCookiesIfNeeded(supabase, supabaseUrl, supabaseAnonKey)
  }, [pathname])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        await hydrateNativeAuthFromCookiesIfNeeded(supabase, supabaseUrl, supabaseAnonKey)
        const { data } = await supabase.auth.getUser()
        if (!mounted) return
        setUser(data.user ?? null)
        setLoading(false)
      } catch (err: any) {
        // Catch AuthSessionMissingError silently - it's expected in some contexts
        if (err?.name === 'AuthSessionMissingError' || 
            err?.message?.includes('Auth session missing') ||
            err?.__isAuthError) {
          // Expected - no session yet
          if (!mounted) return
          setUser(null)
          setLoading(false)
        } else {
          // Unexpected error - log it
          console.error('[AuthProvider] Unexpected auth error:', err)
          if (!mounted) return
          setUser(null)
          setLoading(false)
        }
      }
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null)
    })

    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])

  const value = useMemo(() => ({ user, loading }), [user, loading])

  return (
    <Ctx.Provider value={value}>
      <MobileAuthDeepLinkListener />
      {children}
    </Ctx.Provider>
  )
}

