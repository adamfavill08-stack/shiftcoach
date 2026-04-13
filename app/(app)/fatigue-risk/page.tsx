'use client'

import { useEffect, useMemo, useState, type ComponentType } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronLeft, Clock, HeartPulse, Moon, Sparkles, Sunrise } from 'lucide-react'
import { useShiftRhythm } from '@/lib/hooks/useShiftRhythm'
import { useTranslation } from '@/components/providers/language-provider'
import { authedFetch } from '@/lib/supabase/authedFetch'
import { BodyClockMotivationCard } from '@/components/body-clock/BodyClockMotivationCard'
import { fatigueWindowBarMarkerFill } from '@/lib/riskScaleBarMarker'
import { cn } from '@/lib/utils'

type DriverCategory = 'sleep' | 'circadian' | 'shift' | 'timing' | 'physiology' | 'general'

function categorizeFatigueDriver(text: string): DriverCategory {
  const d = text.toLowerCase()
  if (/sleep|debt|rest|recovery|nap|quality|insufficient/i.test(d)) return 'sleep'
  if (/circadian|misalignment|body clock|jetlag|alignment/i.test(d)) return 'circadian'
  if (/shift|night|turnaround|back-to-back|late-to-early|consecutive/i.test(d)) return 'shift'
  if (/biological|window|timing|02:00|06:00|low window|trough/i.test(d)) return 'timing'
  if (/physiology|hrv|heart|strain|wearable/i.test(d)) return 'physiology'
  return 'general'
}

const DRIVER_VISUAL: Record<
  DriverCategory,
  {
    Icon: ComponentType<{ className?: string; strokeWidth?: number }>
    bar: string
    iconWrap: string
    rowBg: string
    rowBorder: string
  }
> = {
  sleep: {
    Icon: Moon,
    bar: 'bg-cyan-500 dark:bg-cyan-400',
    iconWrap: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-200',
    rowBg: 'bg-gradient-to-br from-cyan-50/90 to-white dark:from-cyan-950/25 dark:to-[var(--card-subtle)]',
    rowBorder: 'border-cyan-200/70 dark:border-cyan-800/50',
  },
  circadian: {
    Icon: Sunrise,
    bar: 'bg-amber-500 dark:bg-amber-400',
    iconWrap: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200',
    rowBg: 'bg-gradient-to-br from-amber-50/90 to-white dark:from-amber-950/25 dark:to-[var(--card-subtle)]',
    rowBorder: 'border-amber-200/70 dark:border-amber-800/50',
  },
  shift: {
    Icon: Sparkles,
    bar: 'bg-violet-500 dark:bg-violet-400',
    iconWrap: 'bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-200',
    rowBg: 'bg-gradient-to-br from-violet-50/90 to-white dark:from-violet-950/25 dark:to-[var(--card-subtle)]',
    rowBorder: 'border-violet-200/70 dark:border-violet-800/50',
  },
  timing: {
    Icon: Clock,
    bar: 'bg-orange-500 dark:bg-orange-400',
    iconWrap: 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-200',
    rowBg: 'bg-gradient-to-br from-orange-50/90 to-white dark:from-orange-950/25 dark:to-[var(--card-subtle)]',
    rowBorder: 'border-orange-200/70 dark:border-orange-800/50',
  },
  physiology: {
    Icon: HeartPulse,
    bar: 'bg-rose-500 dark:bg-rose-400',
    iconWrap: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200',
    rowBg: 'bg-gradient-to-br from-rose-50/90 to-white dark:from-rose-950/25 dark:to-[var(--card-subtle)]',
    rowBorder: 'border-rose-200/70 dark:border-rose-800/50',
  },
  general: {
    Icon: Sparkles,
    bar: 'bg-slate-400 dark:bg-slate-500',
    iconWrap: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    rowBg: 'bg-[var(--card-subtle)]',
    rowBorder: 'border-[var(--border-subtle)]',
  },
}

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
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [openDriverIndex, setOpenDriverIndex] = useState<number | null>(null)
  /** Inline “how to lower” tips inside the open driver panel only (single place for this content). */
  const [lowerTipsOpen, setLowerTipsOpen] = useState(false)

  useEffect(() => {
    setLowerTipsOpen(false)
  }, [openDriverIndex])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authedFetch('/api/profile', { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const j = (await res.json().catch(() => ({}))) as { profile?: { name?: string | null } }
        const raw = j?.profile?.name
        if (typeof raw === 'string' && raw.trim()) {
          const first = raw.trim().split(/\s+/)[0]
          if (first && !cancelled) setDisplayName(first)
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])
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

  const fatigueMotivationMessage = useMemo(() => {
    const prefix = displayName ? `${displayName}, ` : ''
    if (loading && !fatigueRisk) {
      return t('detail.fatigueRisk.motivationLoading', { prefix })
    }
    if (!fatigueRisk && !loading) {
      return t('detail.fatigueRisk.motivationNoData', { prefix })
    }
    if (!fatigueRisk) {
      return t('detail.fatigueRisk.motivationLoading', { prefix })
    }

    const timelineIdx = timeline.findIndex((p) => p.time === currentPoint.time)
    let laterBars = timelineIdx >= 0 ? timeline.slice(timelineIdx + 1) : []
    if (timelineIdx === 5) {
      laterBars = [timeline[0]]
    }
    const laterPeak =
      laterBars.length > 0 ? Math.max(...laterBars.map((p) => p.value)) : currentPoint.value
    const curveRises =
      laterBars.length > 0 && laterPeak >= currentPoint.value + 8 && fatigueRisk.confidenceLabel !== 'low'

    if (fatigueRisk.level === 'high') {
      return t('detail.fatigueRisk.motivationHigh', { prefix })
    }
    if (fatigueRisk.level === 'moderate') {
      if (curveRises) {
        return t('detail.fatigueRisk.motivationCurveRise', { prefix })
      }
      return t('detail.fatigueRisk.motivationModerate', { prefix })
    }

    if (curveRises) {
      return t('detail.fatigueRisk.motivationCurveRise', { prefix })
    }
    if (fatigueRisk.confidenceLabel === 'low') {
      return t('detail.fatigueRisk.motivationConfidenceLow', { prefix })
    }

    const rawDriver = fatigueRisk.drivers?.[0] ?? ''
    const cat = rawDriver ? categorizeFatigueDriver(rawDriver) : 'general'
    if (cat === 'sleep') {
      return t('detail.fatigueRisk.motivationDriverSleep', { prefix })
    }
    if (cat === 'circadian') {
      return t('detail.fatigueRisk.motivationDriverCircadian', { prefix })
    }
    if (cat === 'shift') {
      return t('detail.fatigueRisk.motivationDriverShift', { prefix })
    }
    if (cat === 'timing') {
      return t('detail.fatigueRisk.motivationDriverTiming', { prefix })
    }
    if (cat === 'physiology') {
      return t('detail.fatigueRisk.motivationDriverPhysiology', { prefix })
    }
    return t('detail.fatigueRisk.motivationLow', { prefix })
  }, [
    currentPoint.time,
    currentPoint.value,
    displayName,
    fatigueRisk,
    loading,
    t,
    timeline,
  ])

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
            className="rounded-full border border-[var(--border-subtle)] bg-[var(--card)] p-2 text-[var(--text-soft)] shadow-none transition-colors hover:bg-[var(--card-subtle)]"
            aria-label={t('detail.common.backToDashboard')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
            {t('detail.fatigueRisk.title')}
          </h1>
        </header>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-none">
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

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-none">
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

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-none">
          <h2 className="text-base font-semibold text-[var(--text-main)]">{t('detail.fatigueRisk.driversTitle')}</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">{t('detail.fatigueRisk.driversIntro')}</p>
          <div className="mt-4 grid gap-3">
            {drivers.map((driver, index) => {
              const cat = categorizeFatigueDriver(driver)
              const vis = DRIVER_VISUAL[cat]
              const Icon = vis.Icon
              const isOpen = openDriverIndex === index
              return (
                <div
                  key={`${driver}-${index}`}
                  className={cn(
                    'overflow-hidden rounded-lg border transition-[box-shadow] duration-200',
                    vis.rowBorder,
                    vis.rowBg,
                    isOpen && 'ring-2 ring-[var(--border-subtle)]/80 dark:ring-slate-600/40',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenDriverIndex(isOpen ? null : index)}
                    className={cn(
                      'grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-0 px-3 py-3 text-left transition-colors',
                      'hover:bg-white/50 dark:hover:bg-white/5 active:bg-white/70 dark:active:bg-white/10',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]',
                    )}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? t('detail.fatigueRisk.driverCollapseAria') : t('detail.fatigueRisk.driverExpandAria')}
                  >
                    <div className="flex items-center gap-2.5" aria-hidden>
                      <div className={cn('h-10 w-1 shrink-0 self-center rounded-full', vis.bar)} />
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                          vis.iconWrap,
                        )}
                      >
                        <Icon className="h-5 w-5" strokeWidth={2} />
                      </div>
                    </div>
                    <p className="min-w-0 text-sm font-medium leading-snug text-[var(--text-main)]">{driver}</p>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 shrink-0 text-[var(--text-muted)] transition-transform duration-200',
                        isOpen && 'rotate-180 text-cyan-600 dark:text-cyan-400',
                      )}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </button>
                  <div
                    className={cn(
                      'grid transition-[grid-template-rows] duration-200 ease-out',
                      isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div
                        className={cn(
                          'border-t px-4 py-4 text-left',
                          'border-cyan-200/80 bg-[#E0F7FA]',
                          'dark:border-cyan-800/50 dark:bg-cyan-950/40',
                        )}
                      >
                        <div className="space-y-3">
                          <p className="text-[13px] leading-relaxed text-[#006064] dark:text-cyan-100/95">
                            {t('detail.fatigueRisk.driverFooterHint')}
                          </p>
                          <button
                            type="button"
                            onClick={() => setLowerTipsOpen((o) => !o)}
                            aria-expanded={lowerTipsOpen}
                            className={cn(
                              'flex w-full items-center justify-between gap-2 rounded-lg py-2 text-left transition-colors',
                              'text-[13px] font-semibold text-[#006064] hover:bg-cyan-100/60 dark:text-cyan-100/95 dark:hover:bg-cyan-900/30',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#E0F7FA] dark:focus-visible:ring-offset-cyan-950/40',
                            )}
                          >
                            <span>{t('detail.fatigueRisk.howToLowerTitle')}</span>
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 shrink-0 transition-transform duration-200',
                                lowerTipsOpen && 'rotate-180',
                              )}
                              strokeWidth={2}
                              aria-hidden
                            />
                          </button>
                          <div
                            className={cn(
                              'grid transition-[grid-template-rows] duration-200 ease-out',
                              lowerTipsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                            )}
                          >
                            <div className="min-h-0 overflow-hidden">
                              <div className="space-y-3 border-t border-cyan-300/50 pt-3 text-[13px] leading-relaxed dark:border-cyan-700/50">
                                <div>
                                  <p className="font-semibold text-[#004d52] dark:text-cyan-50">
                                    {t('detail.fatigueRisk.tip1Title')}
                                  </p>
                                  <p className="mt-1 text-[#006064] dark:text-cyan-100/90">{t('detail.fatigueRisk.tip1Body')}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-[#004d52] dark:text-cyan-50">
                                    {t('detail.fatigueRisk.tip2Title')}
                                  </p>
                                  <p className="mt-1 text-[#006064] dark:text-cyan-100/90">{t('detail.fatigueRisk.tip2Body')}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-[#004d52] dark:text-cyan-50">
                                    {t('detail.fatigueRisk.tip3Title')}
                                  </p>
                                  <p className="mt-1 text-[#006064] dark:text-cyan-100/90">{t('detail.fatigueRisk.tip3Body')}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <BodyClockMotivationCard message={fatigueMotivationMessage} />

        <div
          className="px-2 pb-2 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]">
            {t('detail.common.disclaimerBrand')}
          </p>
          <p className="text-[11px] leading-relaxed">{t('detail.common.disclaimerLine1')}</p>
          <p className="mt-1 text-[11px] leading-relaxed">{t('detail.common.disclaimerLine2')}</p>
        </div>
      </div>
    </div>
  )
}
