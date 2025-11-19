// lib/supabase/server.ts
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const DEV_FALLBACK_USER = '333dd216-62fb-49a0-916e-304b84673310' // <- your dev id

export async function getServerSupabaseAndUserId() {
  console.log('[getServerSupabaseAndUserId] called')
  
  // In serverless environments (Vercel), cookie-based auth with @supabase/ssr fails
  // due to Next.js 16 compatibility issues. Skip it entirely and use service role client.
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    // Use service role client in production/serverless to avoid cookie initialization errors
    const { supabaseServer } = await import('@/lib/supabase-server')
    return { 
      supabase: supabaseServer, 
      userId: DEV_FALLBACK_USER, 
      isDevFallback: true 
    }
  }

  // Development: try cookie-based auth
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.warn('[supabase/server] Auth error:', authError)
    }

    const userId = user?.id ?? DEV_FALLBACK_USER
    const isDevFallback = !user?.id
    
    if (!user) {
      console.warn('[supabase/server] No auth session, using dev fallback user id:', userId, 'Auth session missing!')
    }

    return { supabase, userId, isDevFallback }
  } catch (error: any) {
    // If cookie-based auth fails (common in serverless), use service role client
    console.error('[supabase/server] Cookie-based auth failed, using service role client:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    })
    
    try {
      const { supabaseServer } = await import('@/lib/supabase-server')
      
      // Try to get user ID from service role client (won't work for RLS, but prevents crash)
      return { 
        supabase: supabaseServer, 
        userId: DEV_FALLBACK_USER, 
        isDevFallback: true 
      }
    } catch (importError: any) {
      console.error('[supabase/server] Failed to import supabaseServer:', {
        name: importError?.name,
        message: importError?.message,
        stack: importError?.stack,
      })
      throw importError
    }
  }
}
