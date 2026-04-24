import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Profile = {
  user_id: string
  name: string | null
  sex: 'male' | 'female' | 'other' | null
  height_cm: number | null
  weight_kg: number | null
  goal: 'lose' | 'maintain' | 'gain' | null
  units: 'metric' | 'imperial' | null
  sleep_goal_h: number | null
  water_goal_ml: number | null
  tz: string | null
  worker_type: string | null
  cycle_length: number | null
  rotation_pattern: string[] | null
  shift_times: {
    morning?: { start: string; end: string }
    afternoon?: { start: string; end: string }
    night?: { start: string; end: string }
  } | null
  rotation_anchor_date: string | null
  rotation_anchor_day: number | null
  weekend_extension: string | null
  created_at: string | null
  updated_at: string | null
}

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const load = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error loading profile:', error)
      }

      setProfile(data || null)
      setLoading(false)
    }

    load()
  }, [userId])

  const isComplete = profile && profile.name && profile.height_cm && profile.weight_kg

  return { profile, loading, isComplete }
}

