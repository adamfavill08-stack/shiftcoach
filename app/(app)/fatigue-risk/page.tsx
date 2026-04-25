'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useShiftRhythm } from '@/lib/hooks/useShiftRhythm'
import { useTranslation } from '@/components/providers/language-provider'
import { authedFetch } from '@/lib/supabase/authedFetch'
import { supabase } from '@/lib/supabase'
import { BodyClockMotivationCard } from '@/components/body-clock/BodyClockMotivationCard'
import { fatigueWindowBarMarkerFill } from '@/lib/riskScaleBarMarker'
import { formatFatigueSummary } from '@/lib/fatigue/formatFatigueSummary'
import { getCircadianData } from '@/lib/circadian/circadianCache'

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

function categorizeFatigueDriver(text: string): 'sleep' | 'circadian' | 'shift' | 'timing' | 'physiology' | 'general' {
  const d = text.toLowerCase()
  if (/sleep|debt|rest|recovery|nap|quality|insufficient/i.test(d)) return 'sleep'
  if (/circadian|misalignment|body clock|jetlag|alignment/i.test(d)) return 'circadian'
  if (/shift|night|turnaround|back-to-back|late-to-early|consecutive/i.test(d)) return 'shift'
  if (/biological|window|timing|02:00|06:00|low window|trough/i.test(d)) return 'timing'
  if (/physiology|hrv|heart|strain|wearable/i.test(d)) return 'physiology'
  return 'general'
}

export default function FatigueRiskPage() {
  const { t } = useTranslation()
  const { fatigueRisk, sleepDeficit, loading } = useShiftRhythm()
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [circadianFatigueFromCache, setCircadianFatigueFromCache] = useState<number | null>(null)

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

  useEffect(() => {
    let active = true
    const loadCircadianFatigue = async () => {
      try {
        const { data: auth } = await supabase.auth.getSession()
        const token = auth.session?.access_token
        if (!token) return
        const circadianData = await getCircadianData(token)
        if (!active) return
        if (circadianData && typeof circadianData.fatigueScore === 'number') {
          setCircadianFatigueFromCache(Math.max(0, Math.min(100, Math.round(circadianData.fatigueScore))))
        }
      } catch {
        // Keep fallback sources when circadian cache fetch fails.
      }
    }

    void loadCircadianFatigue()
    const handleRefresh = () => {
      void loadCircadianFatigue()
    }
    window.addEventListener('sleep-refreshed', handleRefresh)
    window.addEventListener('rota-saved', handleRefresh)
    window.addEventListener('rota-cleared', handleRefresh)

    return () => {
      active = false
      window.removeEventListener('sleep-refreshed', handleRefresh)
      window.removeEventListener('rota-saved', handleRefresh)
      window.removeEventListener('rota-cleared', handleRefresh)
    }
  }, [])

  const debtHours = Math.max(0, sleepDeficit?.weeklyDeficit ?? 0)
  const fallbackCategory = sleepDeficit?.category ?? 'medium'
  const fallbackScore = Math.max(
    22,
    Math.min(78, Math.round((fallbackCategory === 'high' ? 68 : fallbackCategory === 'low' ? 28 : 48) + Math.min(14, debtHours * 1.2))),
  )
  const score = circadianFatigueFromCache ?? fatigueRisk?.score ?? fallbackScore
  const scoreDisplay = Math.max(0, Math.min(100, Math.round(score)))
  const levelRaw = score >= 65 ? 'high' : score < 30 ? 'low' : 'moderate'
  const level = t(fatigueRiskLevelKey(levelRaw))
  const confidenceChip = `${t(fatigueRiskConfidenceKey(fatigueRisk?.confidenceLabel))} ${t('detail.fatigueRisk.confidenceSuffix')}`
  const explanation = formatFatigueSummary({ score, fatigueRisk })
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
  const scoreLabel = useMemo(() => (loading ? '...' : String(scoreDisplay)), [loading, scoreDisplay])
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
