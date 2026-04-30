'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useShiftRhythm } from '@/lib/hooks/useShiftRhythm'
import { useTranslation } from '@/components/providers/language-provider'
import { authedFetch } from '@/lib/supabase/authedFetch'
import { supabase } from '@/lib/supabase'
import { BodyClockMotivationCard } from '@/components/body-clock/BodyClockMotivationCard'
import { formatFatigueSummary } from '@/lib/fatigue/formatFatigueSummary'
import { getCircadianData } from '@/lib/circadian/circadianCache'
import { isoLocalDate } from '@/lib/shifts'

function formatClockHour(value: number): string {
  const normalized = ((value % 24) + 24) % 24
  const hh = Math.floor(normalized)
  const mm = Math.round((normalized - hh) * 60)
  if (mm === 60) {
    return `${String((hh + 1) % 24).padStart(2, '0')}:00`
  }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function hoursUntil(fromHour: number, toHour: number): number {
  const delta = (((toHour % 24) - (fromHour % 24) + 24) % 24)
  return delta === 0 ? 24 : delta
}

function fatigueTrackColorAt(progressPct: number): string {
  const p = Math.max(0, Math.min(100, progressPct))
  if (p < 33) return '#34C759' // green
  if (p < 66) return '#FF9500' // orange
  return '#FF3B30' // red
}

function fatigueRiskLevelKey(level: string): string {
  if (level === 'high') return 'detail.fatigueRisk.levelHigh'
  if (level === 'moderate') return 'detail.fatigueRisk.levelModerate'
  return 'detail.fatigueRisk.levelLow'
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
  const [rotaContext, setRotaContext] = useState<{ yesterday: string | null; today: string | null }>({
    yesterday: null,
    today: null,
  })
  const [circadianWindowData, setCircadianWindowData] = useState<{
    nextTroughHour?: number
    misalignmentHours?: number
    alignmentScore?: number
  } | null>(null)
  const [nowDate, setNowDate] = useState<Date>(() => new Date())

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
    const loadRotaWindow = async () => {
      try {
        const now = new Date()
        const todayStr = isoLocalDate(now)
        const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        const yesterdayStr = isoLocalDate(y)
        const res = await authedFetch(`/api/shifts?from=${yesterdayStr}&to=${todayStr}`, { cache: 'no-store' })
        if (!res.ok || !active) return
        const json = (await res.json().catch(() => ({}))) as {
          items?: Array<{ date: string; shift_label: string }>
        }
        const items = json.items ?? []
        const yShift = items.find((r) => r.date === yesterdayStr)?.shift_label ?? null
        const tShift = items.find((r) => r.date === todayStr)?.shift_label ?? null
        if (!active) return
        setRotaContext({ yesterday: yShift, today: tShift })
      } catch {
        /* ignore */
      }
    }

    void loadRotaWindow()
    const onRefresh = () => {
      void loadRotaWindow()
    }
    window.addEventListener('rota-saved', onRefresh)
    window.addEventListener('rota-cleared', onRefresh)

    return () => {
      active = false
      window.removeEventListener('rota-saved', onRefresh)
      window.removeEventListener('rota-cleared', onRefresh)
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowDate(new Date())
    }, 60_000)
    return () => window.clearInterval(id)
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
        if (circadianData) {
          if (typeof circadianData.fatigueScore === 'number') {
            setCircadianFatigueFromCache(Math.max(0, Math.min(100, Math.round(circadianData.fatigueScore))))
          }
          setCircadianWindowData({
            nextTroughHour:
              typeof circadianData.nextTroughHour === 'number' ? circadianData.nextTroughHour : undefined,
            misalignmentHours:
              typeof circadianData.misalignmentHours === 'number' ? circadianData.misalignmentHours : undefined,
            alignmentScore:
              typeof circadianData.alignmentScore === 'number' ? circadianData.alignmentScore : undefined,
          })
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
  const fatigueScore = circadianFatigueFromCache ?? fatigueRisk?.score ?? fallbackScore
  const explanation = formatFatigueSummary({ score: fatigueScore, fatigueRisk })

  const nowHourFloat = nowDate.getHours() + nowDate.getMinutes() / 60
  const derivedMisalignment =
    typeof circadianWindowData?.misalignmentHours === 'number'
      ? circadianWindowData.misalignmentHours
      : typeof circadianWindowData?.alignmentScore === 'number'
        ? Math.max(0, Math.min(9, Math.round(((100 - circadianWindowData.alignmentScore) / 11) * 10) / 10))
        : null
  const fallbackNextTrough =
    derivedMisalignment == null
      ? null
      : nowHourFloat - derivedMisalignment < 3.5
        ? 3.5 + derivedMisalignment
        : 27.5 + derivedMisalignment
  const nextHighFatigueHour = circadianWindowData?.nextTroughHour ?? fallbackNextTrough
  const nextHighFatigueLabel = nextHighFatigueHour == null ? null : formatClockHour(nextHighFatigueHour)
  const hoursToHighFatigue = nextHighFatigueHour == null ? null : hoursUntil(nowHourFloat, nextHighFatigueHour)
  const timeProgress = hoursToHighFatigue == null ? fatigueScore / 100 : 1 - Math.min(24, hoursToHighFatigue) / 24
  const windowProgressScore = Math.round(timeProgress * 100)
  const scoreForCard = nextHighFatigueHour == null ? fatigueScore : windowProgressScore
  const scoreDisplay = Math.max(0, Math.min(100, Math.round(scoreForCard)))
  const levelRaw = scoreForCard >= 65 ? 'high' : scoreForCard < 30 ? 'low' : 'moderate'
  const level = t(fatigueRiskLevelKey(levelRaw))
  const scoreLabel = useMemo(() => (loading ? '...' : String(scoreDisplay)), [loading, scoreDisplay])
  const markerProgressPct = Math.max(3, Math.min(97, Math.round(timeProgress * 100)))
  const markerLeft = `${markerProgressPct}%`
  const windowMarkerFill = fatigueTrackColorAt(markerProgressPct)
  const nowClockLabel = formatClockHour(nowHourFloat)

  const whyHighFatigueParagraph = useMemo(() => {
    if (!nextHighFatigueLabel) {
      return t('detail.fatigueRisk.whyNoWindow')
    }
    const y = rotaContext.yesterday
    const todayS = rotaContext.today
    const d0 = fatigueRisk?.drivers?.[0]?.trim()
    let main: string

    if (y === 'NIGHT') {
      main = t('detail.fatigueRisk.whyNightsYesterday', { time: nextHighFatigueLabel })
    } else if (todayS === 'NIGHT' && y !== 'NIGHT') {
      main = t('detail.fatigueRisk.whyNightsToday', { time: nextHighFatigueLabel })
    } else if (y === 'EARLY' || y === 'LATE') {
      const shiftDesc = y === 'EARLY' ? t('detail.fatigueRisk.shiftEarlyDesc') : t('detail.fatigueRisk.shiftLateDesc')
      main = t('detail.fatigueRisk.whyEarlyLateYesterday', { time: nextHighFatigueLabel, shiftDesc })
    } else if (d0 && /night|overnight|late.?to.?early|back.?to.?back|consecutive/i.test(d0)) {
      main = t('detail.fatigueRisk.whyNightsFromSignals', { time: nextHighFatigueLabel })
    } else {
      main = t('detail.fatigueRisk.whyDefault', { time: nextHighFatigueLabel })
    }

    let follow = ''
    if (debtHours >= 1.5) {
      const h = debtHours >= 10 ? String(Math.round(debtHours)) : debtHours.toFixed(1)
      follow += t('detail.fatigueRisk.whySleepDebt', { hours: h })
    }
    if (d0 && y !== 'NIGHT') {
      const short = d0.length > 160 ? `${d0.slice(0, 157)}…` : d0
      follow += t('detail.fatigueRisk.whyDriverFollow', { driver: short })
    }
    return (main + follow).trim()
  }, [nextHighFatigueLabel, rotaContext.yesterday, rotaContext.today, debtHours, fatigueRisk?.drivers, t])

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

    const hoursTo = hoursToHighFatigue
    const windowSoon =
      hoursTo != null && hoursTo <= 3 && fatigueRisk.confidenceLabel !== 'low'

    if (fatigueRisk.level === 'high') {
      return t('detail.fatigueRisk.motivationHigh', { prefix })
    }
    if (fatigueRisk.level === 'moderate') {
      if (windowSoon) {
        return t('detail.fatigueRisk.motivationCurveRise', { prefix })
      }
      return t('detail.fatigueRisk.motivationModerate', { prefix })
    }

    if (windowSoon) {
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
  }, [displayName, fatigueRisk, hoursToHighFatigue, loading, t])

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
            <div className="min-w-0 flex-1">
              <p className="text-5xl font-semibold tabular-nums tracking-tight text-[var(--text-main)]">{scoreLabel}</p>
              <p className="mt-3 max-w-[28ch] text-sm leading-6 text-[var(--text-soft)]">{explanation}</p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${levelBadgeClass}`}>
              {level}
            </span>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{t('detail.fatigueRisk.currentWindow')}</span>
              <span>{nextHighFatigueLabel ? `High around ${nextHighFatigueLabel}` : nowClockLabel}</span>
            </div>
            {/* Marker sits outside overflow-hidden so it is not clipped to the thin track */}
            <div className="relative w-full pt-2 pb-2">
              <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--card-subtle)]">
                <div className="h-full w-full bg-gradient-to-r from-emerald-300 via-orange-400 to-red-500" />
              </div>
              <div
                className="pointer-events-none absolute left-0 z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_2px_10px_rgba(0,0,0,0.35)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.55)]"
                style={{ left: markerLeft, top: "calc(0.5rem + 6px)", backgroundColor: windowMarkerFill }}
                aria-hidden
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{t('detail.fatigueRisk.axisLow')}</span>
              <span>{nextHighFatigueLabel ?? t('detail.fatigueRisk.axisHigh')}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-none">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--text-main)]">{t('detail.fatigueRisk.whyTitle')}</h2>
            <span className="shrink-0 text-xs text-[var(--text-muted)]">{t('detail.fatigueRisk.whySubtitle')}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[var(--text-soft)]">{whyHighFatigueParagraph}</p>
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
