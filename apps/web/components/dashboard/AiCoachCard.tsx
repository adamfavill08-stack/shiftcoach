'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { CoachChatModal } from '@/components/modals/CoachChatModal'

export function AiCoachCard({
  headline,
  subtitle,
  href = '/coach',
}: {
  headline: string
  subtitle: string
  href?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Coach card - nested glass style */}
      <div
        className="rounded-3xl backdrop-blur-2xl border border-slate-200/50 dark:border-slate-700/40 px-3 py-3 bg-white/60 dark:bg-slate-800/50"
      >
        <section
          className="rounded-2xl backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 px-4 py-3 flex items-center justify-between gap-3 transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] bg-white/75 dark:bg-slate-900/45"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">💡</div>
            <div className="flex flex-col">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-600 dark:text-slate-400">AI Coach</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{headline}</p>
              <p className="text-xs mt-1 leading-relaxed text-slate-600 dark:text-slate-400">{subtitle}</p>
            </div>
          </div>

          <div className="relative">
            {/* optional soft glow */}
            {/* <div className="absolute inset-0 -z-10 bg-sky-400/20 blur-xl rounded-full" /> */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open AI Coach"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-none hover:brightness-110 active:scale-95 transition-all duration-150"
            >
              <MessageCircle className="w-5 h-5 text-white" />
            </button>
          </div>
        </section>
      </div>

      {/* Chat modal */}
      {open && (
        <CoachChatModal onClose={() => setOpen(false)} />
      )}
    </>
  )
}
