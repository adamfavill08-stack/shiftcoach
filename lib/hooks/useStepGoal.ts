'use client'

import { useEffect, useState } from 'react'
import { getMyProfile, updateProfile, type Profile } from '@/lib/profile'

export function useStepGoal() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const stepGoal = profile?.step_goal ?? 10000

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      const p = await getMyProfile()
      setProfile(p)
      setIsLoading(false)
    })()
  }, [])

  const updateStepGoal = async (next: number) => {
    setIsSaving(true)
    const clamped = Math.max(1000, Math.min(50000, next))
    
    // Optimistic update
    if (profile) {
      setProfile({ ...profile, step_goal: clamped })
    }

    try {
      const success = await updateProfile({ step_goal: clamped })
      if (!success && profile) {
        // Revert on error
        setProfile(profile)
      }
    } catch (error) {
      console.error('Failed to update step goal:', error)
      if (profile) {
        setProfile(profile)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return { stepGoal, updateStepGoal, isLoading: isLoading || isSaving }
}

