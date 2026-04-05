'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useShiftRhythm } from '@/lib/hooks/useShiftRhythm'
import { useTranslation } from '@/components/providers/language-provider'
import { fatigueWindowBarMarkerFill } from '@/lib/riskScaleBarMarker'

function fatigueRiskLevelKey(level: string): string {
  if (level === 'high') return 'detail.fatigueRisk.levelHigh'
  if (level === 'moderate') return 'detail.fatigueRisk.levelModerate'
  return 'detail.fatigueRisk.levelLow'
}

function fatigueRiskConfidenceKey(label: string | undefined): string {
  if (label === 'high') return 'detail.fatigueRisk.confidenceHigh'
  if (label === 'medium') return 'detail.fatigueRisk.confidenceMedium'
  return 'detail.fatigueRisk.confidenceLow'
}

export default function FatigueRiskPage() {
  const { t } = useTranslation()
  const { fatigueRisk, loading } = useShiftRhythm()
  const score = fatigueRisk?.score ?? 20
  const score10 = Math.max(1, Math.min(10, Math.round(score / 10)))
  const levelRaw = fatigueRisk?.level ?? 'low'
  const level = t(fatigueRiskLevelKey(levelRaw))
  const confidenceChip = `${t(fatigueRiskConfidenceKey(fatigueRisk?.confidenceLabel))} ${t('detail.fatigueRisk.confidenceSuffix')}`
  const explanation =
    fatigueRisk?.explanation ?? t('detail.fatigueRisk.fallbackExplanation')
  const drivers =
    fatigueRisk?.drivers?.length
      ? fatigueRisk.drivers
      : [t('detail.fatigueRisk.fallbackDriver')]

  const timeline = useMemo(() => {
    const base = Math.max(12, Math.min(92, score))
    const confidenceBoost = fatigueRisk?.confidenceLabel === 'high' ? 4 : fatigueRisk?.confidenceLabel === 'low' ? -3 : 0
    const highShift = levelRaw === 'high' ? 8 : levelRaw === 'moderate' ? 3 : -4
    const clamp = (n: number) => Math.max(8, Math.min(96, Math.round(n)))
    return [
      { time: '06:00', value: clamp(base - 16 + highShift) },
      { time: '10:00', value: clamp(base - 28 + confidenceBoost) },
      { time: '14:00', value: clamp(base - 22) },
      { time: '18:00', value: clamp(base - 8 + confidenceBoost) },
      { time: '22:00', value: clamp(base + 4 + highShift) },
      { time: '03:00', value: clamp(base + 14 + highShift) },
    ]
  }, [score, fatigueRisk?.confidenceLabel, levelRaw])

  const getRiskColor = (value: number) => {
    if (value < 35) return 'bg-emerald-400'
    if (value < 60) return 'bg-lime-400'
    if (value < 75) return 'bg-amber-400'
    return 'bg-orange-500'
  }

  const nowHour = new Date().getHours()
  const currentPoint = useMemo(() => {
    if (nowHour >= 4 && nowHour < 8) return timeline[0]
    if (nowHour >= 8 && nowHour < 12) return timeline[1]
    if (nowHour >= 12 && nowHour < 16) return timeline[2]
    if (nowHour >= 16 && nowHour < 20) return timeline[3]
    if (nowHour >= 20 || nowHour < 1) return timeline[4]
    return timeline[5]
  }, [nowHour, timeline])
  const scoreLabel = useMemo(() => (loading ? '...' : String(score10)), [loading, score10])
  const markerLeft = `${Math.max(3, Math.min(97, score))}%`
  const windowMarkerFill = fatigueWindowBarMarkerFill(score)
  const levelBadgeClass =
    levelRaw === 'high'
      ? 'bg-orange-100 text-orange-800'
      : levelRaw === 'moderate'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-emerald-100 text-emerald-700'

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 md:p-6">
      <div className="mx-auto max-w-md space-y-4">
        <header className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-full border border-[var(--border-subtle)] bg-[var(--card)] p-2 text-[var(--text-soft)] shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-colors hover:bg-[var(--card-subtle)]"
            aria-label={t('detail.common.backToDashboard')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
            {t('detail.fatigueRisk.title')}
          </h1>
        </header>

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-sm dark:shadow-[0_14px_36px_rgba(0,0,0,0.38)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-end gap-3">
                <p className="text-5xl font-semibold tabular-nums tracking-tight text-[var(--text-main)]">{scoreLabel}</p>
                <span className={`mb-1 rounded-full px-3 py-1 text-sm font-medium ${levelBadgeClass}`}>
                  {level}
                </span>
              </div>
              <p className="mt-3 max-w-[28ch] text-sm leading-6 text-[var(--text-soft)]">{explanation}</p>
            </div>
            <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-soft)]">
              {confidenceChip}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{t('detail.fatigueRisk.currentWindow')}</span>
              <span>{currentPoint.time}</span>
            </div>
            {/* Marker sits outside overflow-hidden so it is not clipped to the thin track */}
            <div className="relative w-full pt-2 pb-2">
              <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--card-subtle)]">
                <div className="h-full w-full bg-gradient-to-r from-emerald-300 via-lime-300 via-60% to-orange-400" />
              </div>
              <div
                className="pointer-events-none absolute left-0 z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_2px_10px_rgba(0,0,0,0.35)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.55)]"
                style={{ left: markerLeft, top: "calc(0.5rem + 6px)", backgroundColor: windowMarkerFill }}
                aria-hidden
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{t('detail.fatigueRisk.axisLow')}</span>
              <span>{t('detail.fatigueRisk.axisHigh')}</span>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-sm dark:shadow-[0_14px_36px_rgba(0,0,0,0.38)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-main)]">
              {t('detail.fatigueRisk.todayCurve')}
            </h2>
            <span className="text-xs text-[var(--text-muted)]">{t('detail.fatigueRisk.liveEstimate')}</span>
          </div>

          <div className="mt-5 flex h-40 items-end gap-3">
            {timeline.map((point) => (
              <div key={point.time} className="flex flex-1 flex-col items-center justify-end gap-2">
                <div className="flex h-28 w-full items-end">
                  <div className={`w-full rounded-t-2xl ${getRiskColor(point.value)}`} style={{ height: `${point.value}%` }} />
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">{point.time}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm leading-6 text-[var(--text-soft)]">{t('detail.fatigueRisk.curveFootnote')}</p>
        </div>

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-sm dark:shadow-[0_14px_36px_rgba(0,0,0,0.38)]">
          <h2 className="text-base font-semibold text-[var(--text-main)]">{t('detail.fatigueRisk.driversTitle')}</h2>
          <div className="mt-4 grid gap-3">
            {drivers.map((driver) => (
              <div key={driver} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-4 py-3 text-sm text-[var(--text-soft)]">
                {driver}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-sm dark:shadow-[0_14px_36px_rgba(0,0,0,0.38)]">
          <h2 className="text-base font-semibold text-[var(--text-main)]">
            {t('detail.fatigueRisk.howToLowerTitle')}
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-[var(--text-soft)]">
            <div>
              <p className="font-medium text-[var(--text-main)]">{t('detail.fatigueRisk.tip1Title')}</p>
              <p>{t('detail.fatigueRisk.tip1Body')}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--text-main)]">{t('detail.fatigueRisk.tip2Title')}</p>
              <p>{t('detail.fatigueRisk.tip2Body')}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--text-main)]">{t('detail.fatigueRisk.tip3Title')}</p>
              <p>{t('detail.fatigueRisk.tip3Body')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
