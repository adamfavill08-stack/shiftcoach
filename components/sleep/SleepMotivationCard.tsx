'use client'

import { Sparkles } from 'lucide-react'
import { Inter } from 'next/font/google'
import { useTranslation } from '@/components/providers/language-provider'

const inter = Inter({ subsets: ['latin'] })

export type SleepMotivationBand =
  | 'no_sleep'
  | 'high_debt'
  | 'moderate_debt'
  | 'ahead'
  | 'strong'
  | 'on_track'
  | 'catch_up'
  | 'low'

const MESSAGE_KEY: Record<SleepMotivationBand, string> = {
  no_sleep: 'sleepSW.motivate.noSleep',
  high_debt: 'sleepSW.motivate.highDebt',
  moderate_debt: 'sleepSW.motivate.moderateDebt',
  ahead: 'sleepSW.motivate.ahead',
  strong: 'sleepSW.motivate.strong',
  on_track: 'sleepSW.motivate.onTrack',
  catch_up: 'sleepSW.motivate.catchUp',
  low: 'sleepSW.motivate.low',
}

export function deriveSleepMotivationBand(args: {
  totalMinutes: number
  adjustedTargetMinutes: number
  sleepDebtMinutes: number | null
}): SleepMotivationBand {
  const { totalMinutes, adjustedTargetMinutes, sleepDebtMinutes } = args

  if (totalMinutes <= 0) return 'no_sleep'

  if (sleepDebtMinutes != null && sleepDebtMinutes >= 120) return 'high_debt'
  if (sleepDebtMinutes != null && sleepDebtMinutes >= 45) return 'moderate_debt'

  const target =
    adjustedTargetMinutes > 0 ? adjustedTargetMinutes : Math.round(7.5 * 60)
  if (target <= 0) return 'on_track'

  const ratio = totalMinutes / target
  if (totalMinutes >= target && ratio >= 1) return 'ahead'
  if (ratio >= 0.92) return 'strong'
  if (ratio >= 0.8) return 'on_track'
  if (ratio >= 0.65) return 'catch_up'
  return 'low'
}

type Props = {
  profileFirstName: string | null
  band: SleepMotivationBand
}

export function SleepMotivationCard({ profileFirstName, band }: Props) {
  const { t } = useTranslation()
  const name =
    profileFirstName && profileFirstName.trim().length > 0
      ? profileFirstName.trim()
      : t('sleepSW.motivate.fallbackName')
  const body = t(MESSAGE_KEY[band], { name })

  return (
    <aside
      className={`rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] px-6 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.24)] ${inter.className}`}
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
          {body}
        </p>
      </div>
    </aside>
  )
}
