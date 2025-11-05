'use client'

import { ReactNode, createContext, useContext, useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'

import type { User } from '@supabase/supabase-js'

type AuthCtx = { user: User | null; loading: boolean }

const Ctx = createContext<AuthCtx>({ user: null, loading: true })

export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      setUser(data.user ?? null)
      setLoading(false)
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null)
    })

    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])

  return <Ctx.Provider value={{ user, loading }}>{children}</Ctx.Provider>
}

