'use client'

import { useMemo } from 'react'
import { useLanguage, useTranslation } from '@/components/providers/language-provider'
import { intlLocaleForApp } from '@/lib/i18n/supportedLocales'
import type { SleepType } from '@/lib/sleep/types'
import { formatSleepChartAxisLabel, type SleepBarPoint } from '@/lib/sleep/utils'
import { SleepDayTotalHero } from './SleepDayTotalHero'
import { SleepStatsCard } from './SleepStatsCard'

type ShiftSleepOverviewCardProps = {
  totalMinutes: number
  /** Full duration of latest primary sleep for the hero (optional; avoids civil-day slices from 7-day API). */
  heroTotalMinutes?: number | null
  /** Civil YMD for hero date line when `heroTotalMinutes` is set. */
  heroDateKey?: string | null
  /** When true with hero minutes, top line is post-shift copy; otherwise show wake date. */
  heroPostShiftAfterNight?: boolean
  targetMinutes: number
  primaryMinutes: number
  napMinutes: number
  dominantType: SleepType | null
  hasWearableConnection?: boolean
  lastSyncAt?: number | null
  isWearableSyncing?: boolean
  sleepDebtMinutes?: number | null
  circadianAlignment?: 'good' | 'ok' | 'poor' | null
  actionError?: string | null
  onLogSleep: () => void
  onSyncWearable?: () => Promise<void> | void
  editLogsHref: string
  sevenDayBars: SleepBarPoint[]
  highlightDateKey?: string | null
  /** IANA zone used by /api/sleep/7days; axis labels must match bucket math. */
  chartTimeZone?: string | null
}

/** Decimal hours for chart labels (locale-aware 7 vs 7,5). */
function formatSleepChartHoursDecimal(intlLocale: string, totalMinutes: number) {
  const n = Math.max(0, totalMinutes) / 60
  return new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(n)
}

function barClasses(minutes: number, targetMinutes: number) {
  if (minutes <= 0) {
    return 'bg-[var(--card-subtle)] border border-[var(--border-subtle)]'
  }
  if (targetMinutes <= 0) return 'bg-sky-500/85 dark:bg-sky-400/80'
  const r = minutes / targetMinutes
  if (r < 0.6) return 'bg-amber-500/90 dark:bg-amber-500/75'
  if (r < 1) return 'bg-sky-500/90 dark:bg-sky-400/80'
  if (r <= 1.15) return 'bg-emerald-500/90 dark:bg-emerald-500/75'
  return 'bg-indigo-500/85 dark:bg-indigo-400/75'
}

const CHART_H = 128

export function ShiftSleepOverviewCard({
  totalMinutes,
  heroTotalMinutes = null,
  heroDateKey = null,
  heroPostShiftAfterNight = false,
  targetMinutes,
  primaryMinutes,
  napMinutes,
  dominantType,
  hasWearableConnection = false,
  lastSyncAt = null,
  isWearableSyncing = false,
  sleepDebtMinutes = null,
  circadianAlignment = null,
  actionError = null,
  onLogSleep,
  onSyncWearable,
  editLogsHref,
  sevenDayBars,
  highlightDateKey = null,
  chartTimeZone = null,
}: ShiftSleepOverviewCardProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const intlLocale = useMemo(() => intlLocaleForApp(language), [language])

  const maxBarMinutes = Math.max(
    targetMinutes,
    ...sevenDayBars.map((b) => b.totalMinutes),
    60,
  )
  const chartSummary = useMemo(
    () =>
      sevenDayBars
        .map((b) =>
          t('sleepCard.chartSummarySegment', {
            date: b.dateKey,
            hours: t('sleepCard.chartHoursLabel', {
              n: formatSleepChartHoursDecimal(intlLocale, b.totalMinutes),
            }),
          }),
        )
        .join('; '),
    [sevenDayBars, t, intlLocale],
  )

  const showTargetGuide = targetMinutes > 0
  const targetLineBottomPx = showTargetGuide
    ? Math.round(Math.min(1, targetMinutes / maxBarMinutes) * CHART_H)
    : 0
  const targetHoursText = t('sleepCard.chartHoursLabel', {
    n: formatSleepChartHoursDecimal(intlLocale, targetMinutes),
  })
  const chartAriaLabel = useMemo(() => {
    const base = t('sleepCard.ariaChart', { summary: chartSummary })
    if (targetMinutes <= 0) return base
    const hours = t('sleepCard.chartHoursLabel', {
      n: formatSleepChartHoursDecimal(intlLocale, targetMinutes),
    })
    return `${base} ${t('sleepCard.ariaChartTarget', { hours })}`
  }, [t, chartSummary, targetMinutes, intlLocale])

  const summaryDateKey =
    highlightDateKey && sevenDayBars.some((b) => b.dateKey === highlightDateKey)
      ? highlightDateKey
      : (sevenDayBars[sevenDayBars.length - 1]?.dateKey ?? highlightDateKey ?? '')

  const heroMinutes =
    typeof heroTotalMinutes === 'number' && heroTotalMinutes > 0 ? heroTotalMinutes : totalMinutes
  const heroSummaryDateKey =
    typeof heroTotalMinutes === 'number' &&
    heroTotalMinutes > 0 &&
    heroDateKey &&
    heroDateKey.trim()
      ? heroDateKey.trim()
      : summaryDateKey

  return (
    <div className="flex w-full flex-col gap-3">
      <section className="relative bg-[var(--bg)] px-0 py-1">
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-full space-y-1.5 text-left" role="img" aria-label={chartAriaLabel}>
            <div className="flex w-full gap-2">
              {showTargetGuide ? (
                <div className="relative h-[128px] w-11 shrink-0 pt-2" aria-hidden>
                  <span
                    className="absolute right-0 text-[10px] font-semibold tabular-nums leading-none text-emerald-600 dark:text-emerald-400"
                    style={{
                      bottom: `${targetLineBottomPx}px`,
                      transform: 'translateY(50%)',
                    }}
                  >
                    {targetHoursText}
                  </span>
                </div>
              ) : null}
              <div className="relative min-w-0 flex-1">
                <div className="relative flex h-[128px] w-full items-end justify-center gap-2 px-0.5 pt-2 sm:gap-3">
                  {showTargetGuide ? (
                    <div
                      className="pointer-events-none absolute left-0.5 right-0.5 z-0 border-t-2 border-dotted border-emerald-500 dark:border-emerald-400"
                      style={{ bottom: `${targetLineBottomPx}px` }}
                      aria-hidden
                    />
                  ) : null}
                  {sevenDayBars.map((day) => {
                    const hPx =
                      day.totalMinutes <= 0
                        ? 3
                        : Math.max(8, Math.round((day.totalMinutes / maxBarMinutes) * CHART_H))
                    const isHi = highlightDateKey != null && day.dateKey === highlightDateKey
                    return (
                      <div
                        key={day.dateKey}
                        className="relative z-[1] flex h-full min-h-0 flex-1 flex-col items-center justify-end"
                      >
                        <div
                          className={`mx-auto w-[22px] max-w-[22px] shrink-0 rounded-t-md transition-[height] duration-300 ${barClasses(day.totalMinutes, targetMinutes)} ${
                            isHi
                              ? 'ring-2 ring-sky-500/80 ring-offset-2 ring-offset-[var(--bg)] dark:ring-sky-400/70'
                              : ''
                          }`}
                          style={{ height: hPx }}
                          title={t('sleepCard.barTotalTitle', {
                            date: day.dateKey,
                            h: formatSleepChartHoursDecimal(intlLocale, day.totalMinutes),
                          })}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
              {showTargetGuide ? <div className="w-11 shrink-0" aria-hidden /> : null}
            </div>
            <div className="flex w-full gap-2">
              {showTargetGuide ? <div className="w-11 shrink-0" aria-hidden /> : null}
              <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-0.5 sm:gap-3">
                {sevenDayBars.map((day) => {
                  const label =
                    chartTimeZone && chartTimeZone.trim()
                      ? formatSleepChartAxisLabel(day.dateKey, chartTimeZone)
                      : new Date(`${day.dateKey}T12:00:00`).toLocaleDateString(intlLocale, {
                          day: 'numeric',
                        })
                  return (
                    <div key={day.dateKey} className="flex min-w-0 flex-1 justify-center">
                      <span className="text-center text-[10px] font-medium tabular-nums leading-none text-[var(--text-muted)]">
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>
              {showTargetGuide ? <div className="w-11 shrink-0" aria-hidden /> : null}
            </div>
          </div>
        </div>
      </section>

      {heroSummaryDateKey ? (
        <SleepDayTotalHero
          dateKey={heroSummaryDateKey}
          totalMinutes={heroMinutes}
          intlLocale={intlLocale}
          chartTimeZone={chartTimeZone}
          headingOverride={
            typeof heroTotalMinutes === 'number' &&
            heroTotalMinutes > 0 &&
            heroPostShiftAfterNight
              ? t('sleepType.post_shift_sleep')
              : null
          }
        />
      ) : null}

      <SleepStatsCard
        totalMinutes={totalMinutes}
        targetMinutes={targetMinutes}
        primaryMinutes={primaryMinutes}
        napMinutes={napMinutes}
        dominantType={dominantType}
        hasWearableConnection={hasWearableConnection}
        lastSyncAt={lastSyncAt}
        isWearableSyncing={isWearableSyncing}
        sleepDebtMinutes={sleepDebtMinutes}
        circadianAlignment={circadianAlignment}
        actionError={actionError}
        onLogSleep={onLogSleep}
        onSyncWearable={onSyncWearable}
        editLogsHref={editLogsHref}
      />
    </div>
  )
}
