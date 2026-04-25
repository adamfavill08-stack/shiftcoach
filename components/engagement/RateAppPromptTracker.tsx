'use client'

import { useEffect } from 'react'
import { trackAppOpenForRatingPrompt } from '@/lib/rating/rateAppPrompt'

export function RateAppPromptTracker() {
  useEffect(() => {
    trackAppOpenForRatingPrompt()
  }, [])

  return null
}
