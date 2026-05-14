'use client'

import { ChevronRight, Target } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import type { ShiftRelativeNextStepMessage } from '@/lib/sleep/shiftRelativeSleepClassification'

type Props = {
  /** From `ShiftRelativeSleepAnalysis.nextStepMessage` — key is typically `sleepPlan.shiftRelative.nextStep.*`. */
  nextStepMessage: ShiftRelativeNextStepMessage
}

export function RecoveryPlanCard({ nextStepMessage }: Props) {
  const { t } = useTranslation()
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] p-3 shadow-[var(--shadow-soft)] sm:p-4">
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)]"
          aria-hidden
        >
          <Target className="h-5 w-5" strokeWidth={2} style={{ color: 'var(--accent-indigo)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-indigo)' }}>
            {t('sleepLog.section.yourPlan')}
          </p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-[var(--text-main)]">
            {t(nextStepMessage.key, nextStepMessage.params)}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-[var(--text-muted)]" strokeWidth={2} aria-hidden />
      </div>
    </section>
  )
}
