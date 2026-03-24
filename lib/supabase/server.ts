// lib/supabase/server.ts
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { apiUnauthorized } from '@/lib/api/response'

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
  // Security-critical: always resolve identity from the request/session.
  // Never fall back to service-role + fixed user ID.
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
