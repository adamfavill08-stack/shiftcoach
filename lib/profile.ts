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

export async function getMyProfile(): Promise<Profile | null> {
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
      console.error('[getMyProfile] Unexpected auth exception:', err)
      return null
    }
    
    if (authError) {
      // Don't log AuthSessionMissingError - it's expected
      if (authError.name !== 'AuthSessionMissingError' && 
          !authError.message?.includes('Auth session missing')) {
        console.error('[getMyProfile] Auth error:', authError)
      }
      return null
    }
    
    if (!user) {
      // Don't log - this is expected when no session
      return null
    }

    console.log('[getMyProfile] Fetching profile for user:', user.id)
    let { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    
    if (error) {
      console.error('[getMyProfile] ========== DATABASE ERROR ==========')
      console.error('[getMyProfile] Error code:', error.code)
      console.error('[getMyProfile] Error message:', error.message)
      console.error('[getMyProfile] Error details:', error.details)
      console.error('[getMyProfile] Error hint:', error.hint)
      console.error('[getMyProfile] This might be an RLS (Row Level Security) issue!')
      console.error('[getMyProfile] Check if RLS policies allow users to SELECT their own profiles')
      console.error('[getMyProfile] ======================================')
      return null
    }

    // If profile row is missing, create one with inferred region/currency.
    if (!data) {
      const inferred = inferRegionAndCurrencyFromEnv()
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
        region: inferred.region,
        currency: inferred.currency,
      }

      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .insert(emptyProfile)
        .select()
        .single()

      if (insertError) {
        console.error('[getMyProfile] Failed to create default profile:', insertError)
        return null
      }

      data = inserted as any
    }

    // Ensure region/currency are set for legacy profiles.
    if (!data.region || !data.currency) {
      const inferred = inferRegionAndCurrencyFromEnv()
      const updates: Partial<Profile> = {}
      if (!data.region) updates.region = inferred.region
      if (!data.currency) updates.currency = inferred.currency

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

    return data as Profile
  } catch (err: any) {
    console.error('[getMyProfile] Unexpected error:', err)
    return null
  }
}

export function isComplete(p?: Partial<Profile> | null) {
  if (!p) return false
  return Boolean(p.height_cm && p.weight_kg && p.goal)
}

export async function updateProfile(updates: Partial<Profile>): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[updateProfile] No user found')
    return false
  }

  console.log('[updateProfile] Updating profile for user:', user.id, 'with updates:', updates)
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', user.id)
    .select()

  if (error) {
    console.error('[updateProfile] Supabase error:', error)
    return false
  }

  console.log('[updateProfile] Success, updated data:', data)
  return true
}

