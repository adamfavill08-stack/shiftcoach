'use client'

import { Inter } from 'next/font/google'
import { useTranslation } from '@/components/providers/language-provider'
import { startOfLocalDayUtcMs } from '@/lib/sleep/utils'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

function formatSleepHeroDate(dateKey: string, intlLocale: string, chartTimeZone: string | null | undefined) {
  const tz = chartTimeZone?.trim()
  if (tz) {
    const ms = startOfLocalDayUtcMs(dateKey, tz)
    if (Number.isFinite(ms)) {
      return new Date(ms).toLocaleDateString(intlLocale, {
        timeZone: tz,
        weekday: 'short',
        month: 'long',
        day: 'numeric',
      })
    }
  }
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(intlLocale, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  })
}

type SleepDayTotalHeroProps = {
  dateKey: string
  totalMinutes: number
  intlLocale: string
  chartTimeZone?: string | null
  /** When set, shown as the top line instead of a formatted calendar date. */
  headingOverride?: string | null
}

export function SleepDayTotalHero({
  dateKey,
  totalMinutes,
  intlLocale,
  chartTimeZone = null,
  headingOverride = null,
}: SleepDayTotalHeroProps) {
  const { t } = useTranslation()
  const safe = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(safe / 60)
  const m = safe % 60
  const topLine =
    typeof headingOverride === 'string' && headingOverride.trim()
      ? headingOverride.trim()
      : formatSleepHeroDate(dateKey, intlLocale, chartTimeZone)
  const ariaDuration = t('sleepCard.durationHM', { h, m })

  return (
    <section
      className="relative w-full overflow-hidden rounded-lg bg-[var(--card)] px-5 py-5"
      role="group"
      aria-label={`${topLine}. ${ariaDuration}. ${t('sleepCard.dayTotalCaption')}`}
    >
      <div
        className={`${inter.className} mx-auto flex w-full max-w-sm flex-col items-center gap-2 text-center sm:gap-2.5`}
      >
        <p className="text-xs font-medium text-[var(--text-muted)] sm:text-sm">{topLine}</p>
        <p className="flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-0.5 sm:gap-x-2">
          <span className="text-4xl font-bold tabular-nums tracking-tight text-[var(--text-main)] sm:text-5xl">
            {h}
          </span>
          <span className="pb-0.5 text-sm font-medium text-[var(--text-soft)] sm:text-base">
            {t('sleepCard.dayTotalHrsShort')}
          </span>
          <span className="text-4xl font-bold tabular-nums tracking-tight text-[var(--text-main)] sm:text-5xl">
            {m}
          </span>
          <span className="pb-0.5 text-sm font-medium text-[var(--text-soft)] sm:text-base">
            {t('sleepCard.dayTotalMinsShort')}
          </span>
        </p>
        <p className="text-sm font-semibold text-[var(--text-soft)] sm:text-base">{t('sleepCard.dayTotalCaption')}</p>
      </div>
    </section>
  )
}
