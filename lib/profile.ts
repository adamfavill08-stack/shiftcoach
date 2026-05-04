import { supabase } from './supabase'

export type Profile = {
  user_id: string
  name: string | null
  sex: 'male' | 'female' | 'other' | null
  height_cm: number | null
  weight_kg: number | null
  date_of_birth: string | null // ISO date string (YYYY-MM-DD)
  age: number | null // Calculated from date_of_birth
  goal: 'lose' | 'maintain' | 'gain' | null
  units: 'metric' | 'imperial' | null
  sleep_goal_h: number | null
  water_goal_ml: number | null
  step_goal: number | null
  tz: string | null
  region?: 'uk' | 'eu' | 'us' | 'aus' | null
  currency?: 'GBP' | 'EUR' | 'USD' | 'AUD' | null
  avatar_url?: string | null
  theme?: 'light' | 'dark' | 'system' | null
  // New settings fields
  shift_pattern?: 'rotating' | 'mostly_days' | 'mostly_nights' | 'custom' | null
  worker_type?: string | null
  cycle_length?: number | null
  rotation_pattern?: string[] | null
  shift_times?: {
    morning?: { start: string; end: string }
    afternoon?: { start: string; end: string }
    night?: { start: string; end: string }
  } | null
  rotation_anchor_date?: string | null
  rotation_anchor_day?: number | null
  weekend_extension?: string | null
  /** Post–night-shift sleep anchor (HH:MM), for circadian / scheduling */
  post_night_sleep?: string | null
  ideal_sleep_start?: string | null // time format HH:MM
  ideal_sleep_end?: string | null // time format HH:MM
  wake_reminder_enabled?: boolean | null
  wake_reminder_trigger?: 'off' | 'after_night_shift' | 'every_day' | null
  mood_focus_alerts_enabled?: boolean | null
  daily_checkin_reminder?: 'off' | 'morning' | 'evening' | null
  ai_coach_tone?: 'calm' | 'direct' | null
  calorie_adjustment_aggressiveness?: 'gentle' | 'balanced' | 'aggressive' | null
  macro_split_preset?: 'balanced' | 'high_protein' | 'custom' | null
  default_activity_level?: 'low' | 'medium' | 'high' | null
  animations_enabled?: boolean | null
  // RevenueCat fields
  revenuecat_user_id?: string | null
  revenuecat_subscription_id?: string | null
  revenuecat_entitlements?: any | null // JSONB
  subscription_platform?: 'revenuecat_ios' | 'revenuecat_android' | null
  subscription_status?: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | null
  /** Dashboard guided hints: null = not chosen; true = opted in; false = declined / dismissed. */
  onboarding_hints_enabled?: boolean | null
  onboarding_hints_completed?: boolean | null
  onboarding_step?: number | null
}

function inferRegionAndCurrencyFromEnv() {
  // Very lightweight heuristic using server-side environment / timezone.
  // This runs only when creating a new profile.
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    const lowerTz = timezone.toLowerCase()

    if (lowerTz.includes('london') || lowerTz.includes('dublin') || lowerTz.includes('isle_of_man')) {
      return { region: 'uk' as const, currency: 'GBP' as const }
    }
    if (lowerTz.includes('europe') || lowerTz.includes('berlin') || lowerTz.includes('paris')) {
      return { region: 'eu' as const, currency: 'EUR' as const }
    }
    if (lowerTz.includes('america') || lowerTz.includes('chicago') || lowerTz.includes('new_york') || lowerTz.includes('los_angeles')) {
      return { region: 'us' as const, currency: 'USD' as const }
    }
    if (lowerTz.includes('sydney') || lowerTz.includes('melbourne') || lowerTz.includes('auckland')) {
      return { region: 'aus' as const, currency: 'AUD' as const }
    }
  } catch {
    // Fallback below
  }
  // Default: UK
  return { region: 'uk' as const, currency: 'GBP' as const }
}

/** PostgREST errors often stringify as `{}` in the console; use this for logs. */
function summarizeSupabaseError(err: unknown): string {
  if (err == null) return 'null'
  if (typeof err !== 'object') return String(err)
  const o = err as Record<string, unknown>
  const bits = ['code', 'message', 'details', 'hint']
    .map((k) => (o[k] != null && o[k] !== '' ? `${k}=${o[k]}` : null))
    .filter(Boolean)
  if (bits.length) return bits.join(' ')
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

/**
 * Create missing profile row via POST /api/profile (upsert + column retry logic).
 * Prefer this in the browser so schema drift (e.g. missing region/currency) matches updateProfile.
 */
async function bootstrapProfileViaApi(): Promise<Profile | null> {
  if (typeof window === 'undefined') return null
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()
    if (sessionError || !session?.access_token) return null

    const res = await fetch('/api/profile', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ units: 'metric' }),
    })
    const json = (await res.json().catch(() => ({}))) as {
      profile?: Profile
      success?: boolean
      error?: string
      code?: string
    }
    if (!res.ok || !json.success || !json.profile) {
      if (process.env.NODE_ENV === 'development') {
        console.error(
          '[getMyProfile] bootstrapProfileViaApi failed:',
          res.status,
          json?.error ?? json?.code ?? summarizeSupabaseError(json),
        )
      }
      return null
    }
    return json.profile
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getMyProfile] bootstrapProfileViaApi exception:', summarizeSupabaseError(e), e)
    }
    return null
  }
}

/** First non-empty display name from Supabase Auth user_metadata (sign-up / OAuth). */
export function displayNameFromUserMetadata(user: { user_metadata?: Record<string, unknown> } | null): string | null {
  if (!user?.user_metadata) return null
  const meta = user.user_metadata
  for (const key of ['name', 'first_name', 'full_name']) {
    const v = meta[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

export async function getMyProfile(): Promise<Profile | null> {
  const isDev = process.env.NODE_ENV !== 'production'
  try {
    let user = null
    let authError = null
    
    try {
      const authResult = await supabase.auth.getUser()
      user = authResult.data?.user ?? null
      authError = authResult.error ?? null
    } catch (err: any) {
      // Catch AuthSessionMissingError and other auth exceptions
      if (err?.name === 'AuthSessionMissingError' || 
          err?.message?.includes('Auth session missing') ||
          err?.__isAuthError) {
        // Expected error - return null silently
        return null
      }
      // Unexpected error - log it
      if (isDev) console.error('[getMyProfile] Unexpected auth exception:', err)
      return null
    }
    
    if (authError) {
      // Don't log AuthSessionMissingError - it's expected
      if (authError.name !== 'AuthSessionMissingError' && 
          !authError.message?.includes('Auth session missing')) {
        if (isDev) console.error('[getMyProfile] Auth error:', authError)
      }
      return null
    }
    
    if (!user) {
      // Don't log - this is expected when no session
      return null
    }

    if (isDev) console.log('[getMyProfile] Fetching profile for user:', user.id)
    // maybeSingle: no row yet is normal for new users; .single() errors (PGRST116) and skips create below.
    let { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()

    if (error) {
      if (isDev) {
        console.error('[getMyProfile] ========== DATABASE ERROR ==========')
        console.error('[getMyProfile] Error code:', error.code)
        console.error('[getMyProfile] Error message:', error.message)
        console.error('[getMyProfile] Error details:', error.details)
        console.error('[getMyProfile] Error hint:', error.hint)
        console.error('[getMyProfile] This might be an RLS (Row Level Security) issue!')
        console.error('[getMyProfile] Check if RLS policies allow users to SELECT their own profiles')
        console.error('[getMyProfile] ======================================')
      }
      return null
    }

    // If profile row is missing, create one. Browser: server upsert (handles missing columns).
    // Direct insert omits region/currency so older DBs without those columns still accept the row.
    if (!data) {
      let inserted: Profile | null = null

      if (typeof window !== 'undefined') {
        inserted = await bootstrapProfileViaApi()
      }

      if (!inserted) {
        const emptyProfile: Partial<Profile> = {
          user_id: user.id,
          name: null,
          sex: null,
          height_cm: null,
          weight_kg: null,
          date_of_birth: null,
          age: null,
          goal: null,
          units: 'metric',
          sleep_goal_h: null,
          water_goal_ml: null,
          step_goal: null,
          tz: null,
        }

        const { data: ins, error: insertError } = await supabase
          .from('profiles')
          .insert(emptyProfile)
          .select()
          .maybeSingle()

        if (insertError) {
          if (isDev) {
            console.error(
              '[getMyProfile] Failed to create default profile:',
              summarizeSupabaseError(insertError),
            )
          }
          return null
        }
        if (!ins) {
          if (isDev) console.error('[getMyProfile] Insert returned no row (RLS or schema).')
          return null
        }
        inserted = ins as Profile
      }

      data = inserted as any
    }

    // Ensure region/currency are set for legacy profiles only when these
    // columns actually exist in the current schema.
    const profileKeys = data ? Object.keys(data) : []
    const hasRegionColumn = profileKeys.includes('region')
    const hasCurrencyColumn = profileKeys.includes('currency')
    if ((hasRegionColumn && !data.region) || (hasCurrencyColumn && !data.currency)) {
      const inferred = inferRegionAndCurrencyFromEnv()
      const updates: Partial<Profile> = {}
      if (hasRegionColumn && !data.region) updates.region = inferred.region
      if (hasCurrencyColumn && !data.currency) updates.currency = inferred.currency

      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single()

      if (!updateError && updated) {
        data = updated as any
      }
    }

    const authDisplayName = displayNameFromUserMetadata(user)
    if (data && authDisplayName && !String(data.name ?? '').trim()) {
      const { data: patched, error: syncErr } = await supabase
        .from('profiles')
        .update({ name: authDisplayName })
        .eq('user_id', user.id)
        .select()
        .maybeSingle()
      if (!syncErr && patched) {
        data = patched as Profile
      } else {
        data = { ...data, name: authDisplayName } as Profile
      }
    }

    if (isDev) {
      console.log('[getMyProfile] ========== PROFILE FETCHED ==========')
      console.log('[getMyProfile] Has data:', !!data)
      console.log('[getMyProfile] User ID:', data?.user_id)
      console.log('[getMyProfile] Critical fields:')
      console.log('[getMyProfile]   - sex:', data?.sex)
      console.log('[getMyProfile]   - goal:', data?.goal)
      console.log('[getMyProfile]   - weight_kg:', data?.weight_kg, 'Type:', typeof data?.weight_kg)
      console.log('[getMyProfile]   - height_cm:', data?.height_cm, 'Type:', typeof data?.height_cm)
      console.log('[getMyProfile]   - age:', data?.age, 'Type:', typeof data?.age)
      console.log('[getMyProfile]   - region:', data?.region)
      console.log('[getMyProfile]   - currency:', data?.currency)
      console.log('[getMyProfile] All keys:', data ? Object.keys(data) : [])
      console.log('[getMyProfile] ======================================')
    }

    return data as Profile
  } catch (err: any) {
    if (isDev) console.error('[getMyProfile] Unexpected error:', err)
    return null
  }
}

export function isComplete(p?: Partial<Profile> | null) {
  if (!p) return false
  return Boolean(p.height_cm && p.weight_kg && p.goal)
}

export async function updateProfile(updates: Partial<Profile>): Promise<boolean> {
  try {
    // Browser: use server upsert so saves work even when the row is missing or RLS blocks direct updates.
    if (typeof window !== 'undefined') {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user) {
        if (sessionError) console.error('[updateProfile] Session error:', sessionError)
        else console.error('[updateProfile] No session')
        return false
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/profile', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(updates),
      })

      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }
      if (!res.ok || json?.error) {
        console.error('[updateProfile] API error:', res.status, json)
        return false
      }
      return Boolean(json?.success)
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('[updateProfile] No user found')
      return false
    }

    const { error } = await supabase.from('profiles').update(updates).eq('user_id', user.id)
    if (error) {
      console.error('[updateProfile] Supabase error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[updateProfile] Unexpected error:', err)
    return false
  }
}

