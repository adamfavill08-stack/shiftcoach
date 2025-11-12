// lib/supabase/server.ts
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const DEV_FALLBACK_USER = '333dd216-62fb-49a0-916e-304b84673310' // <- your dev id

export async function getServerSupabaseAndUserId() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options, maxAge: 0 }) } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const userId = user?.id ?? DEV_FALLBACK_USER
  const isDevFallback = !user?.id
  
  if (!user) {
    console.warn('[supabase/server] No auth session, using dev fallback user id:', userId, 'Auth session missing!')
  }

  return { supabase, userId, isDevFallback }
}
