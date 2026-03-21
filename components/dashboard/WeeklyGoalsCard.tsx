'use client'

import { useState } from 'react'
import { useWeeklyGoals } from '@/lib/hooks/useWeeklyGoals'
import { useCoachState } from '@/lib/hooks/useCoachState'

export function WeeklyGoalsCard() {
  const { goals, loading } = useWeeklyGoals()
  const { openCoach } = useCoachState()

  const [showFeedback, setShowFeedback] = useState(false)

  if (loading) {
    return null // Don't show anything while loading
  }

  if (!goals) {
    return null // Don't show card if no goals exist
  }

  // Format week start date nicely
  const weekStartDate = new Date(goals.week_start + 'T00:00:00')
  const weekStartFormatted = weekStartDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  const handleClick = () => {
    // Set context to open coach with goals discussion
    try {
      localStorage.setItem(
        'coach-context',
        JSON.stringify({
          reason: 'weekly_goals',
          weekStart: goals.week_start,
        })
      )
    } catch {}
    // Open the coach chat
    openCoach()
  }

  const handleFeedback = async (sentiment: 'completed' | 'partial' | 'struggled') => {
    setShowFeedback(false)
    const messages = {
      completed: "I mostly hit my goals this week!",
      partial: "I hit some of my goals this week.",
      struggled: "I struggled with my goals this week.",
    }
    const message = messages[sentiment]
    
    // Set context and open coach - the message will be sent through the modal
    try {
      localStorage.setItem(
        'coach-context',
        JSON.stringify({
          reason: 'weekly_goal_feedback',
          weekStart: goals.week_start,
          autoMessage: message, // Signal to modal to auto-send this message
        })
      )
    } catch {}
    
    openCoach()
  }

  return (
    <section
      className="rounded-3xl border px-5 py-4 backdrop-blur-2xl cursor-pointer transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99]"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-soft)',
      }}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs text-white">
            🎯
          </div>
          <div className="flex flex-col">
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              This week&apos;s focus
            </p>
            <p
              className="text-sm font-semibold"
              style={{ color: 'var(--text-main)' }}
            >
              Week starting {weekStartFormatted}
            </p>
          </div>
        </div>
      </div>
      <p
        className="text-sm mb-2"
        style={{ color: 'var(--text-soft)' }}
      >
        Based on your recent sleep, shifts, and recovery, here are a few small focus points:
      </p>
      <div
        className="text-sm leading-relaxed whitespace-pre-line"
        style={{ color: 'var(--text-main)' }}
      >
        {goals.goals}
      </div>

      {/* Feedback buttons */}
      {!showFeedback ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowFeedback(true)
          }}
          className="mt-3 w-full rounded-full border px-3 py-2 text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--card-subtle)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)',
          }}
        >
          How did this week go?
        </button>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-soft)' }}>
            Quick feedback:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleFeedback('completed')
              }}
              className="rounded-full border px-2 py-1.5 text-[11px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderColor: 'rgba(34, 197, 94, 0.3)',
                color: '#16a34a',
              }}
            >
              ✅ Mostly hit
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleFeedback('partial')
              }}
              className="rounded-full border px-2 py-1.5 text-[11px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderColor: 'rgba(245, 158, 11, 0.3)',
                color: '#d97706',
              }}
            >
              😌 Some
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleFeedback('struggled')
              }}
              className="rounded-full border px-2 py-1.5 text-[11px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: '#dc2626',
              }}
            >
              🧡 Struggled
            </button>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowFeedback(false)
            }}
            className="text-[10px] mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
        </div>
      )}

      <p
        className="mt-2 text-[11px]"
        style={{ color: 'var(--text-muted)' }}
      >
        Tap to discuss or adjust these with your coach anytime.
      </p>
    </section>
  )
}

