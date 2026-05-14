'use client'

import { ChevronRight, Heart } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import type { ShiftRelativeRecoveryState } from '@/lib/sleep/shiftRelativeSleepClassification'

type Props = {
  /** Headline uses `sleepPlan.shiftRelative.recovery.{recoveryState}`. */
  recoveryState: ShiftRelativeRecoveryState
  /** Body copy from `resolveLogSleepRecoveryExplainer` — keys under `sleepPlan.shiftRelative.recoveryExplainer.*`. */
  explainerKey: string
  explainerParams: Record<string, string>
}

export function RecoveryStatusCard({ recoveryState, explainerKey, explainerParams }: Props) {
  const { t } = useTranslation()

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] p-3 shadow-[var(--shadow-soft)] sm:p-4">
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)]"
          aria-hidden
        >
          <Heart className="h-5 w-5" strokeWidth={2} style={{ color: 'var(--accent-blue)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {t('sleepLog.section.recoveryStatus')}
          </p>
          <p className="mt-0.5 text-base font-bold tracking-tight" style={{ color: 'var(--accent-blue)' }}>
            {t(`sleepPlan.shiftRelative.recovery.${recoveryState}`)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-soft)]">{t(explainerKey, explainerParams)}</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-[var(--text-muted)]" strokeWidth={2} aria-hidden />
      </div>
    </section>
  )
}
