'use client'

import { Sparkles } from 'lucide-react'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export type MacroTimingInsightProps = {
  message: string | null | undefined
  /** Screen-reader label only (visual title is intentionally omitted). */
  title?: string
  className?: string
}

export function MacroTimingInsight({
  message,
  title = 'Timing insight',
  className = '',
}: MacroTimingInsightProps) {
  if (!message?.trim()) return null

  return (
    <aside
      className={`rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-6 py-5 ${inter.className} ${className}`.trim()}
      aria-label={title}
      aria-live="polite"
    >
      <div className="flex items-center gap-5">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-500 dark:bg-cyan-400"
          aria-hidden
        >
          <Sparkles className="h-5 w-5 text-white" strokeWidth={1.75} />
        </div>
        <p className="min-w-0 flex-1 text-left text-[15px] font-normal leading-[1.55] text-[var(--text-main)]">
          {message}
        </p>
      </div>
    </aside>
  )
}
