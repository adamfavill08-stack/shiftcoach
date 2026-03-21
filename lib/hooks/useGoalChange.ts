'use client'

import { useEffect } from 'react'

/**
 * Hook to listen for goal changes and trigger a callback
 * Used to refresh dependent components when user changes goal in settings
 */
export function useGoalChange(onChange: () => void) {
  useEffect(() => {
    const handleGoalChange = () => {
      onChange()
    }
    
    window.addEventListener('goalChanged', handleGoalChange)
    return () => window.removeEventListener('goalChanged', handleGoalChange)
  }, [onChange])
}

