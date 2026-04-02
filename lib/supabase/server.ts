// lib/supabase/server.ts
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { apiUnauthorized } from '@/lib/api/response'
import { supabaseServer } from '@/lib/supabase-server'

export class UnauthorizedError extends Error {
  override name = 'UnauthorizedError'
  constructor(message?: string) {
    super(message ?? 'Unauthorized')
  }
}

/** Consistent 401 for API routes when session user is missing. */
export function buildUnauthorizedResponse(_message?: string): NextResponse {
  return apiUnauthorized(_message ?? 'Unauthorized')
}

export async function requireServerUser() {
  const { supabase, userId } = await getServerSupabaseAndUserId()
  if (!userId) throw new UnauthorizedError()
  return { supabase, userId }
}

export async function getServerSupabaseAndUserId() {
  /**
   * Wear OS / raw HTTP clients (no cookies): development-only shared key + env user id.
   * Production ignores this branch (NODE_ENV !== 'development').
   * Set SHIFTCOACH_WEAR_DEV_KEY and SHIFTCOACH_WEAR_DEV_USER_ID in .env.local
   * and the same key in Gradle (-PSHIFTCOACH_WEAR_DEV_KEY=... or gradle.properties).
   */
  try {
    const headerList = await headers()
    const wearKey = headerList.get('x-shiftcoach-wear-key')
    if (
      process.env.NODE_ENV === 'development' &&
      wearKey &&
      process.env.SHIFTCOACH_WEAR_DEV_KEY &&
      wearKey === process.env.SHIFTCOACH_WEAR_DEV_KEY
    ) {
      const wearUserId = process.env.SHIFTCOACH_WEAR_DEV_USER_ID?.trim()
      if (wearUserId) {
        return { supabase: supabaseServer, userId: wearUserId, isDevFallback: true }
      }
    }
  } catch {
    // headers() unavailable in rare contexts; fall through to cookies.
  }

  // Bearer token: same user as cookie session, but available immediately after
  // client-side sign-in before Set-Cookie is always present on the next request.
  try {
    const headerList = await headers()
    const authHeader = headerList.get('authorization') ?? ''
    const m = authHeader.match(/^Bearer\s+(.+)$/i)
    const token = m?.[1]?.trim() ?? ''
    if (token) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } },
      )
      const { data: authData, error: authErr } = await supabase.auth.getUser()
      const user = authData?.user ?? null
      if (user && !authErr) {
        return { supabase, userId: user.id, isDevFallback: false }
      }
    }
  } catch {
    // fall through to cookies
  }

  // Security-critical: resolve identity from session cookies by default.
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            try {
              return cookieStore.getAll()
            } catch (error) {
              console.warn('[supabase/server] Cookie getAll error:', error)
              return []
            }
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // Ignore cookie errors in serverless environments (Vercel, etc.)
              // This is expected in some serverless contexts where cookies can't be set
            }
          },
        },
      }
    )

    let user = null

    try {
      const authResult = await supabase.auth.getUser()
      user = authResult.data?.user ?? null
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        if (
          err?.name !== 'AuthSessionMissingError' &&
          !err?.message?.includes('Auth session missing') &&
          !err?.__isAuthError
        ) {
          console.warn('[supabase/server] Unexpected auth error:', err?.message)
        }
      }
    }

    // Keep return shape stable for existing routes.
    return { supabase, userId: user?.id ?? null, isDevFallback: false }
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      if (
        !error?.message?.includes('Auth session missing') &&
        !error?.message?.includes('cookies') &&
        !error?.name?.includes('AuthSessionMissingError')
      ) {
        console.warn('[supabase/server] Cookie-based auth failed:', error?.message)
      }
    }

    // In failure cases, return an unauthenticated context; routes should reject/handle it.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: (_cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {} } }
    )
    return { supabase, userId: null, isDevFallback: false }
  }
}
