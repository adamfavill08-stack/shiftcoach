import { supabase } from './supabase'

export type Profile = {
  user_id: string
  name: string | null
  sex: 'male' | 'female' | 'other' | null
  height_cm: number | null
  weight_kg: number | null
  goal: 'lose' | 'maintain' | 'gain' | null
  units: 'metric' | 'imperial' | null
  sleep_goal_h: number | null
  water_goal_ml: number | null
  step_goal: number | null
  tz: string | null
  theme?: 'light' | 'dark' | 'system' | null
}

export async function getMyProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  if (error) return null

  return data as Profile
}

export function isComplete(p?: Partial<Profile> | null) {
  if (!p) return false
  return Boolean(p.height_cm && p.weight_kg && p.goal)
}

export async function updateProfile(updates: Partial<Profile>): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', user.id)

  return !error
}

