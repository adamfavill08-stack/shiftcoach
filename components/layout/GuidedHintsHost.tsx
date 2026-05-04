'use client'

import { useAuth } from '@/components/AuthProvider'
import { GuidedHintsTour } from '@/components/onboarding/GuidedHintsTour'

export function GuidedHintsHost() {
  const { user } = useAuth()
  return <GuidedHintsTour userId={user?.id ?? null} />
}
