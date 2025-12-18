"use client"

import { ReactNode, useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import Image from 'next/image'
import { CoachChatModal } from '@/components/modals/CoachChatModal'
import { useCoachState } from '@/lib/hooks/useCoachState'
import { useCoachingState } from '@/lib/hooks/useCoachingState'
import { hasSeenGreetingToday } from '@/lib/coach/dailyGreeting'

export function Header({ title, right }: { title?: string; right?: ReactNode }) {
  const [showBadge, setShowBadge] = useState(false)
  const { isOpen, hasUnread, openCoach, closeCoach, setHasUnread } = useCoachState()
  const { state: coachingState } = useCoachingState()

  useEffect(() => {
    const read = () => {
      try {
        const mfLow = localStorage.getItem('mf-low') === '1'
        setShowBadge(mfLow)
        // If mood/focus is low, also show unread on coach
        if (mfLow) {
          setHasUnread(true)
        }
      } catch {}
    }
    read()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'mf-low') read()
    }
    window.addEventListener('storage', onStorage)
    
    // Listen for custom event to open coach chat from other components
    const handleOpenCoach = () => {
      openCoach()
    }
    window.addEventListener('open-coach-chat', handleOpenCoach)
    
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('open-coach-chat', handleOpenCoach)
    }
  }, [setHasUnread, openCoach])

  // Check for RED coaching state and set unread
  useEffect(() => {
    if (coachingState?.status === 'red') {
      setHasUnread(true)
    }
  }, [coachingState?.status, setHasUnread])

  // Check if daily greeting hasn't been shown today and show blue badge
  useEffect(() => {
    const checkDailyGreeting = () => {
      try {
        // Only show badge if greeting hasn't been seen today
        // and there's no other reason to show unread (mood/focus low, red state)
        const mfLow = localStorage.getItem('mf-low') === '1'
        const greetingNotSeen = !hasSeenGreetingToday()
        const shouldShowGreetingBadge = greetingNotSeen && !mfLow && coachingState?.status !== 'red'
        
        if (shouldShowGreetingBadge) {
          setHasUnread(true)
        } else if (greetingNotSeen === false && !mfLow && coachingState?.status !== 'red') {
          // If greeting has been seen and no other reasons, clear the badge
          setHasUnread(false)
        }
      } catch {
        // Ignore errors
      }
    }
    
    checkDailyGreeting()
    
    // Check again when page becomes visible (user might have opened app in another tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDailyGreeting()
      }
    }
    
    // Listen for storage changes (when greeting is marked as seen)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'coach-daily-greeting-date') {
        checkDailyGreeting()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('storage', handleStorageChange)
    
    // Also check periodically (in case storage event doesn't fire in same window)
    const interval = setInterval(checkDailyGreeting, 2000)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [coachingState?.status, setHasUnread])

  // Clear badge when coach modal opens (greeting will be shown and marked as seen)
  useEffect(() => {
    if (isOpen) {
      // The greeting will be marked as seen when the modal loads
      // Clear the badge after a short delay to allow the greeting to be processed
      const timer = setTimeout(() => {
        const mfLow = localStorage.getItem('mf-low') === '1'
        if (hasSeenGreetingToday() && !mfLow && coachingState?.status !== 'red') {
          setHasUnread(false)
        }
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen, coachingState?.status, setHasUnread])

  function openAiCoachFromHeader() {
    try { localStorage.setItem('coach-context', JSON.stringify({ reason: 'mood_focus_low' })) } catch {}
    openCoach()
  }

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full backdrop-blur-2xl"
        style={{
          backgroundImage: 'radial-gradient(circle at top, var(--bg-soft), var(--bg))',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="max-w-md mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500" />
              <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>Shift Coach</span>
            </div>
            {/* Coaching state pill */}
            {coachingState && (
              <div
                className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium backdrop-blur-xl border"
                style={{
                  backgroundColor:
                    coachingState.status === 'red'
                      ? 'rgba(239, 68, 68, 0.15)' // red-500 with opacity
                      : coachingState.status === 'amber'
                      ? 'rgba(245, 158, 11, 0.15)' // amber-500 with opacity
                      : 'rgba(34, 197, 94, 0.15)', // green-500 with opacity
                  borderColor:
                    coachingState.status === 'red'
                      ? 'rgba(239, 68, 68, 0.3)'
                      : coachingState.status === 'amber'
                      ? 'rgba(245, 158, 11, 0.3)'
                      : 'rgba(34, 197, 94, 0.3)',
                  color:
                    coachingState.status === 'red'
                      ? '#dc2626' // red-600
                      : coachingState.status === 'amber'
                      ? '#d97706' // amber-600
                      : '#16a34a', // green-600
                }}
              >
                {coachingState.status === 'red'
                  ? 'Today: Protect your energy'
                  : coachingState.status === 'amber'
                  ? 'Today: Go gentle'
                  : 'Today: Good day to build momentum'}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Chat to Coach icon */}
            <button
              type="button"
              onClick={openCoach}
              className="relative p-2.5 rounded-full border backdrop-blur-xl transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border-subtle)',
              }}
              aria-label="Chat with Coach"
            >
              <Image
                src="/shiftcoach-bubble.svg"
                alt="Shift Coach"
                width={24}
                height={24}
                className="w-6 h-6"
                style={{
                  filter: 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(195deg) brightness(96%) contrast(89%)',
                }}
              />
              {hasUnread && (
                <>
                  {/* solid dot */}
                  <span
                    className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full"
                    style={{
                      background: 'radial-gradient(circle at center, #38bdf8, #0ea5e9)',
                      boxShadow: '0 0 0 2px var(--card)',
                    }}
                  />
                  {/* soft pulsing halo */}
                  <span
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle at center, rgba(56,189,248,0.6), transparent)',
                      animation: 'coachPulse 1.6s ease-out infinite',
                    }}
                  />
                </>
              )}
            </button>

            {/* Notification bell */}
            <button
              aria-label="Notifications"
              onClick={openAiCoachFromHeader}
              className="relative p-2 rounded-full border backdrop-blur-xl transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <Bell className="w-5 h-5" style={{ color: 'var(--text-main)' }} strokeWidth={2} />
              {showBadge && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-gradient-to-br from-rose-500 to-orange-400 shadow-[0_0_0_3px_var(--card)]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Coach Chat Modal */}
      {isOpen && (
        <CoachChatModal onClose={closeCoach} />
      )}
    </>
  )
}

