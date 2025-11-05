"use client"

import { ReactNode, useEffect, useState } from 'react'
import { Bell, MessageCircle } from 'lucide-react'
import { CoachChatModal } from '@/components/coach/CoachChatModal'
import { useCoachState } from '@/lib/hooks/useCoachState'
import { useCoachingState } from '@/lib/hooks/useCoachingState'

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
              <span className="font-semibold text-lg" style={{ color: 'var(--text-main)' }}>ShiftCali</span>
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
              className="relative p-2 rounded-full border backdrop-blur-xl transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border-subtle)',
              }}
              aria-label="Chat with Coach"
            >
              <MessageCircle
                className="w-5 h-5"
                style={{ color: 'var(--text-main)' }}
                strokeWidth={2}
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

