import { useState, useCallback } from 'react'

export function useCoachState() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)

  const openCoach = useCallback(() => {
    setIsOpen(true)
    setHasUnread(false)
  }, [])

  const closeCoach = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    hasUnread,
    setHasUnread,
    openCoach,
    closeCoach,
  }
}

