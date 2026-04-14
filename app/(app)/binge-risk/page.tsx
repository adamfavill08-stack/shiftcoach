'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Briefcase, ChevronLeft, Moon, Utensils } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { authedFetch } from '@/lib/supabase/authedFetch'
import { riskScaleBarMarkerFill } from '@/lib/riskScaleBarMarker'
import { cn } from '@/lib/utils'

type BingeRisk = {
  score: number
  level: 'low' | 'medium' | 'high'
  drivers: string[]
  explanation: string
}

type SleepDeficitPayload = {
  weeklyDeficit: number
  category: 'surplus' | 'low' | 'medium' | 'high'
}

type RhythmScorePayload = {
  shift_pattern_score?: number
  meal_timing_score?: number | null
  nutrition_score?: number | null
}

type StrainLevel = 'low' | 'medium' | 'high' | 'unknown'

function inferShiftStrainFromDrivers(drivers?: string[]): StrainLevel | null {
  if (!drivers?.length) return null
  const text = drivers.join(' ').toLowerCase()
  if (/intense shift|very low sleep|high sleep debt/i.test(text)) return 'high'
  if (
    /night shift|post-night|quick shift turnaround|high shift lag|busy shift|elevated activity/i.test(text)
  ) {
    return 'medium'
  }
  if (/shift|turnaround|activity/i.test(text)) return 'low'
  return null
}

function strainFromShiftPattern(
  shiftPattern: number | undefined,
  hasRhythmData: boolean | undefined,
  drivers: string[] | undefined,
): StrainLevel {
  if (typeof shiftPattern === 'number' && hasRhythmData === true) {
    if (shiftPattern >= 58) return 'low'
    if (shiftPattern >= 32) return 'medium'
    return 'high'
  }
  const inferred = inferShiftStrainFromDrivers(drivers)
  if (inferred) return inferred
  return 'unknown'
}

function eatingStabilityFromScores(score: RhythmScorePayload | null): 'stable' | 'watch' | 'irregular' {
  const parts = [score?.meal_timing_score, score?.nutrition_score].filter(
    (x): x is number => typeof x === 'number' && !Number.isNaN(x),
  )
  if (parts.length === 0) return 'stable'
  const avg = parts.reduce((a, b) => a + b, 0) / parts.length
  if (avg >= 62) return 'stable'
  if (avg >= 38) return 'watch'
  return 'irregular'
}

export default function BingeRiskPage() {
  const { t } = useTranslation()
  const [risk, setRisk] = useState<BingeRisk | null>(null)
  const [sleepDeficit, setSleepDeficit] = useState<SleepDeficitPayload | null>(null)
  const [rhythmScore, setRhythmScore] = useState<RhythmScorePayload | null>(null)
  const [hasRhythmData, setHasRhythmData] = useState<boolean | undefined>(undefined)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await authedFetch('/api/shift-rhythm', { cache: 'no-store' })
        if (!res.ok) {
          if (!cancelled) setLoaded(true)
          return
        }
        const json = (await res.json().catch(() => ({}))) as {
          bingeRisk?: BingeRisk
          sleepDeficit?: SleepDeficitPayload | null
          score?: RhythmScorePayload | null
          hasRhythmData?: boolean
        }
        if (cancelled) return
        if (json?.bingeRisk) setRisk(json.bingeRisk)
        setSleepDeficit(json?.sleepDeficit ?? null)
        setRhythmScore(json?.score ?? null)
        if (typeof json?.hasRhythmData === 'boolean') {
          setHasRhythmData(json.hasRhythmData)
        }
      } catch {
        // keep null – page stays readable
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const score = risk?.score ?? 0
  const level = risk?.level ?? 'low'

  const levelLabel =
    level === 'low'
      ? t('detail.bingeRisk.levelLow')
      : level === 'medium'
        ? t('detail.bingeRisk.levelMedium')
        : t('detail.bingeRisk.levelHigh')

  const riskBand =
    level === 'low'
      ? t('detail.bingeRisk.bandLow')
      : level === 'medium'
        ? t('detail.bingeRisk.bandMedium')
        : t('detail.bingeRisk.bandHigh')

  const headline =
    level === 'low'
      ? t('detail.bingeRisk.headlineLow')
      : level === 'medium'
        ? t('detail.bingeRisk.headlineMedium')
        : t('detail.bingeRisk.headlineHigh')

  const scorePct = Math.max(0, Math.min(100, score))
  const markerLeft = `${Math.max(3, Math.min(97, scorePct))}%`
  const markerFill = riskScaleBarMarkerFill(scorePct)

  const chipClass =
    level === 'low'
      ? 'bg-emerald-50/90 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-200'
      : level === 'medium'
        ? 'bg-amber-50/90 text-amber-600 dark:bg-amber-950/20 dark:text-amber-200'
        : 'bg-rose-50/90 text-rose-600 dark:bg-rose-950/20 dark:text-rose-200'

  const { sleepSub, strainSub, eatingSub } = useMemo(() => {
    if (!loaded) {
      return {
        sleepSub: t('detail.bingeRisk.chipLoading'),
        strainSub: t('detail.bingeRisk.chipLoading'),
        eatingSub: t('detail.bingeRisk.chipLoading'),
      }
    }

    let sleepSub = t('detail.bingeRisk.chipSleepNoData')
    if (sleepDeficit) {
      const { weeklyDeficit, category } = sleepDeficit
      if (category === 'surplus' || weeklyDeficit < -0.25) {
        sleepSub = t('detail.bingeRisk.chipSleepSurplus')
      } else if (category === 'low' && weeklyDeficit <= 1) {
        sleepSub = t('detail.bingeRisk.chipSleepBalanced')
      } else if (weeklyDeficit > 0.05) {
        sleepSub = t('detail.bingeRisk.chipSleepDebt', { h: weeklyDeficit.toFixed(1) })
      } else {
        sleepSub = t('detail.bingeRisk.chipSleepBalanced')
      }
    }

    const strain = strainFromShiftPattern(
      rhythmScore?.shift_pattern_score,
      hasRhythmData,
      risk?.drivers,
    )
    let strainSub = t('detail.bingeRisk.chipShiftUnknown')
    if (strain === 'low') strainSub = t('detail.bingeRisk.levelLow')
    else if (strain === 'medium') strainSub = t('detail.bingeRisk.levelMedium')
    else if (strain === 'high') strainSub = t('detail.bingeRisk.levelHigh')

    const eat = eatingStabilityFromScores(rhythmScore)
    let eatingSub = t('detail.bingeRisk.chipEatingStable')
    if (eat === 'watch') eatingSub = t('detail.bingeRisk.chipEatingWatch')
    else if (eat === 'irregular') eatingSub = t('detail.bingeRisk.chipEatingIrregular')

    return { sleepSub, strainSub, eatingSub }
  }, [loaded, sleepDeficit, rhythmScore, hasRhythmData, risk?.drivers, t])

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        <header className="flex items-center gap-2 mb-2">
          <Link
            href="/dashboard"
            className="rounded-full border border-[var(--border-subtle)] bg-[var(--card)] p-2 text-[var(--text-soft)] shadow-none"
            aria-label={t('detail.common.backToDashboard')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
            {t('detail.bingeRisk.title')}
          </h1>
        </header>

        <section className="flex flex-col gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-5 shadow-none">
          <div className="w-full space-y-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {t('detail.bingeRisk.scoreLabel')}
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-3xl font-semibold tabular-nums text-[var(--text-main)]">{score}</span>
                <span className="text-sm font-medium text-[var(--text-soft)]">{riskBand}</span>
              </div>
            </div>
            <div className="relative w-full pb-0.5 pt-1">
              <div className="h-3 w-full overflow-hidden rounded-full">
                <div className="grid h-full w-full grid-cols-3">
                  <div className="bg-emerald-200" />
                  <div className="bg-emerald-300" />
                  <div className="bg-gradient-to-r from-amber-300 to-orange-300" />
                </div>
              </div>
              <span
                className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white box-border"
                style={{ left: markerLeft, backgroundColor: markerFill }}
                aria-hidden
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-medium text-[var(--text-muted)]">
              <span>{t('detail.bingeRisk.axisLow')}</span>
              <span>{t('detail.bingeRisk.axisHigh')}</span>
            </div>
          </div>

          <div className="w-full flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--text-main)]">{headline}</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${chipClass}`}
              >
                {risk ? levelLabel : t('detail.bingeRisk.noRecentData')}
              </span>
            </div>
          </div>

          <div className="flex gap-2 border-t border-[var(--border-subtle)] pt-4">
            <div
              className={cn(
                'flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-teal-50/85 px-2.5 py-2 dark:bg-teal-950/20',
              )}
            >
              <Moon className="h-5 w-5 shrink-0 text-teal-400 dark:text-teal-300" strokeWidth={2} aria-hidden />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold leading-tight text-[var(--text-main)]">
                  {t('detail.bingeRisk.chipSleepLabel')}
                </p>
                <p className="truncate text-[10px] leading-tight text-[var(--text-muted)]">{sleepSub}</p>
              </div>
            </div>
            <div
              className={cn(
                'flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-amber-50/80 px-2.5 py-2 dark:bg-amber-950/18',
              )}
            >
              <Briefcase className="h-5 w-5 shrink-0 text-amber-500 dark:text-amber-300" strokeWidth={2} aria-hidden />
              <div className="min-w-0">
                <p className="text-[10px] leading-tight text-[var(--text-muted)]">
                  {t('detail.bingeRisk.chipShiftLabel')}
                </p>
                <p className="truncate text-[11px] font-semibold leading-tight text-[var(--text-main)]">
                  {strainSub}
                </p>
              </div>
            </div>
            <div
              className={cn(
                'flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-violet-50/85 px-2.5 py-2 dark:bg-violet-950/20',
              )}
            >
              <Utensils className="h-5 w-5 shrink-0 text-violet-400 dark:text-violet-300" strokeWidth={2} aria-hidden />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold leading-tight text-[var(--text-main)]">
                  {t('detail.bingeRisk.chipEatingLabel')}
                </p>
                <p className="truncate text-[10px] leading-tight text-[var(--text-muted)]">{eatingSub}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
            {t('detail.bingeRisk.colorsTitle')}
          </p>
          <div className="flex flex-col gap-2 text-[13px] text-[var(--text-soft)]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 dark:bg-emerald-400" />
              <span className="font-semibold">{t('detail.bingeRisk.colorLow')}</span>
              <span className="text-[12px] text-[var(--text-muted)]">{t('detail.bingeRisk.colorLowDesc')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300 dark:bg-amber-400" />
              <span className="font-semibold">{t('detail.bingeRisk.colorMedium')}</span>
              <span className="text-[12px] text-[var(--text-muted)]">
                {t('detail.bingeRisk.colorMediumDesc')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-300 dark:bg-rose-400" />
              <span className="font-semibold">{t('detail.bingeRisk.colorHigh')}</span>
              <span className="text-[12px] text-[var(--text-muted)]">{t('detail.bingeRisk.colorHighDesc')}</span>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🤍</span>
            <p className="text-sm font-semibold text-[var(--text-main)]">{t('detail.bingeRisk.whyTitle')}</p>
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-[13px] text-[var(--text-soft)]">
            <li>{t('detail.bingeRisk.whyLi1')}</li>
            <li>{t('detail.bingeRisk.whyLi2')}</li>
            <li>{t('detail.bingeRisk.whyLi3')}</li>
            <li>{t('detail.bingeRisk.whyLi4')}</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📋</span>
            <p className="text-sm font-semibold text-[var(--text-main)]">{t('detail.bingeRisk.helpsTitle')}</p>
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-[13px] text-[var(--text-soft)]">
            <li>{t('detail.bingeRisk.helpsLi1')}</li>
            <li>{t('detail.bingeRisk.helpsLi2')}</li>
            <li>{t('detail.bingeRisk.helpsLi3')}</li>
            <li>{t('detail.bingeRisk.helpsLi4')}</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🌿</span>
            <p className="text-sm font-semibold text-[var(--text-main)]">{t('detail.bingeRisk.tipsTitle')}</p>
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-[13px] text-[var(--text-soft)]">
            <li>{t('detail.bingeRisk.tipsLi1')}</li>
            <li>{t('detail.bingeRisk.tipsLi2')}</li>
            <li>{t('detail.bingeRisk.tipsLi3')}</li>
            <li>{t('detail.bingeRisk.tipsLi4')}</li>
          </ul>
          <p className="text-[13px] text-[var(--text-soft)]">{t('detail.bingeRisk.tipsFooter')}</p>
        </section>

        <div className="pt-6 pb-4 flex flex-col items-center gap-1">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t('welcome.logoAlt')}
          </div>
          <p className="max-w-[260px] text-center text-[10px] text-[var(--text-muted)]">
            {t('detail.common.disclaimer')}
          </p>
        </div>
      </div>
    </main>
  )
}
