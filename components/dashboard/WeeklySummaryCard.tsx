'use client'

import { useWeeklySummary } from '@/lib/hooks/useWeeklySummary'

export function WeeklySummaryCard() {
  const { summary, loading } = useWeeklySummary()

  if (loading) {
    return null // Don't show anything while loading
  }

  if (!summary) {
    return null // Don't show card if no summary exists
  }

  const preview = summary.summary_text.length > 140
    ? summary.summary_text.slice(0, 140) + '…'
    : summary.summary_text

  // Format week start date nicely
  const weekStartDate = new Date(summary.week_start + 'T00:00:00')
  const weekStartFormatted = weekStartDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <section
      className="rounded-3xl border px-5 py-4 backdrop-blur-2xl"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-xs text-white">
            📊
          </div>
          <div className="flex flex-col">
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              Weekly coach summary
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
        className="text-sm leading-relaxed"
        style={{ color: 'var(--text-soft)' }}
      >
        {preview}
      </p>
      <p
        className="mt-2 text-[11px]"
        style={{ color: 'var(--text-muted)' }}
      >
        Generated from your recent sleep, shifts, and recovery.
      </p>
    </section>
  )
}

