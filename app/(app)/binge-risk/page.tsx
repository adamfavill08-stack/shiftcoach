'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { authedFetch } from '@/lib/supabase/authedFetch'
import { BodyClockMotivationCard } from '@/components/body-clock/BodyClockMotivationCard'
import { riskScaleBarMarkerFill } from '@/lib/riskScaleBarMarker'

const RISK_SCORE = 5

type Factor = {
  id: string
  icon: string
  label: string
  value: string
  color: string
  score: number
}

type QuickAction = {
  icon: string
  text: string
}

type WhyCardItem = {
  icon: string
  title: string
  desc: string
}

type BingeRiskPayload = {
  score?: number
  level?: 'low' | 'medium' | 'high'
}

type ShiftRhythmApiPayload = {
  bingeRisk?: BingeRiskPayload | null
  socialJetlag?: {
    category?: 'low' | 'moderate' | 'high'
    currentMisalignmentHours?: number
  } | null
  sleepDeficit?: {
    weeklyDeficit?: number
    category?: 'surplus' | 'low' | 'medium' | 'high'
  } | null
}

const quickActions: QuickAction[] = [
  { icon: '🥜', text: 'Protein snack before home' },
  { icon: '🚪', text: 'Set kitchen closed time' },
  { icon: '🎮', text: 'Non-food reward after work' },
  { icon: '😴', text: 'Prioritise solid sleep' },
]

const whyCards: WhyCardItem[] = [
  {
    icon: '🧬',
    title: 'Hormones',
    desc: 'Less sleep = more ghrelin (hunger) and less leptin (fullness).',
  },
  {
    icon: '🕓',
    title: 'Circadian Mismatch',
    desc: 'Eating at 3–4am when your body expects sleep stores more fat.',
  },
  {
    icon: '⚡',
    title: 'Stress & Reward',
    desc: 'Long shifts with no breaks make food the easiest reward.',
  },
  {
    icon: '🏪',
    title: 'Environment',
    desc: 'Vending machines and energy drinks are always available on nights.',
  },
]

function RiskGauge({ score }: { score: number }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setAnimated(true), 120)
    return () => window.clearTimeout(id)
  }, [])

  const clamp = Math.min(Math.max(score, 0), 100)
  const scorePct = animated ? clamp : 0
  const markerFill = riskScaleBarMarkerFill(clamp)
  const riskLevel = clamp < 33 ? 'Low' : clamp < 66 ? 'Moderate' : 'High'
  const bubbleClass =
    clamp < 33
      ? 'bg-emerald-100 text-emerald-800'
      : clamp < 66
        ? 'bg-amber-100 text-amber-800'
        : 'bg-orange-100 text-orange-800'

  return (
    <div style={{ padding: '8px 6px 2px' }}>
      <div style={{ position: 'relative', margin: '0 auto', width: '100%', maxWidth: 250, paddingTop: 36 }}>
        <div
          className={`absolute top-0 -translate-x-1/2 rounded-lg px-2.5 py-0.5 text-center leading-none shadow-sm ${bubbleClass}`}
          style={{ left: `${scorePct}%`, transition: 'left 0.45s ease' }}
        >
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.05 }} className="tabular-nums">
            {Math.round(clamp)}
          </p>
          <span className={`absolute -bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 ${bubbleClass}`} />
        </div>

        <div className="relative">
          <div className="h-3 w-full overflow-hidden rounded-full">
            <div className="grid h-full w-full grid-cols-3">
              <div className="bg-emerald-300" />
              <div className="bg-emerald-400" />
              <div className="bg-red-500" />
            </div>
          </div>
          <span
            className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white box-border"
            style={{ left: `${scorePct}%`, backgroundColor: markerFill, transition: 'left 0.45s ease' }}
            aria-hidden
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, padding: '0 2px' }}>
        <span style={{ fontSize: 11, color: '#34C759', fontWeight: 700 }}>Low</span>
        <span style={{ fontSize: 11, color: '#FF9500', fontWeight: 700 }}>Moderate</span>
        <span style={{ fontSize: 11, color: '#FF3B30', fontWeight: 700 }}>High</span>
      </div>
      <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 26, fontWeight: 700, color: 'var(--text-main)' }}>
        {Math.round(clamp)}
      </p>
      <p style={{ margin: '2px 0 0', textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{riskLevel}</p>
    </div>
  )
}

function FactorBar({ factor, delay }: { factor: Factor; delay: number }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setAnimated(true), delay)
    return () => window.clearTimeout(id)
  }, [delay])

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{factor.icon}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-main)' }}>{factor.label}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: factor.color }}>{factor.value}</span>
      </div>
      <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            background: factor.color,
            borderRadius: 3,
            width: animated ? `${factor.score}%` : '0%',
            transition: `width 0.9s cubic-bezier(0.34, 1.2, 0.64, 1) ${delay}ms`,
          }}
        />
      </div>
    </div>
  )
}

function ActionPill({ item }: { item: QuickAction }) {
  const [tapped, setTapped] = useState(false)
  return (
    <button
      onClick={() => setTapped(!tapped)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: tapped ? '#007AFF' : 'var(--card-subtle)',
        border: 'none',
        borderRadius: 12,
        padding: '12px 16px',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'all 0.2s ease',
        transform: tapped ? 'scale(0.98)' : 'scale(1)',
      }}
    >
      <span style={{ fontSize: 20 }}>{item.icon}</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: tapped ? 'white' : 'var(--text-main)' }}>{item.text}</span>
      {tapped ? <span style={{ marginLeft: 'auto', fontSize: 14, color: 'white' }}>✓</span> : null}
    </button>
  )
}

function WhyCard({ card }: { card: WhyCardItem }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      onClick={() => setOpen(!open)}
      style={{
        background: 'var(--card-subtle)',
        borderRadius: 12,
        padding: '14px 16px',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'background 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 24 }}>{card.icon}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)', flex: 1 }}>{card.title}</span>
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
          }}
        >
          ▼
        </span>
      </div>
      {open ? (
        <p style={{ margin: '10px 0 0 34px', fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5 }}>{card.desc}</p>
      ) : null}
    </button>
  )
}

export default function BingeRiskPage() {
  const [tab, setTab] = useState('overview')
  const [riskScore, setRiskScore] = useState<number>(RISK_SCORE)
  const [shiftRhythmData, setShiftRhythmData] = useState<ShiftRhythmApiPayload | null>(null)

  const fetchBingeRisk = useCallback(async () => {
    const parseAndSet = async (res: Response) => {
      const json = (await res.json().catch(() => ({}))) as ShiftRhythmApiPayload
      const nextScore = json?.bingeRisk?.score
      if (typeof nextScore === 'number' && Number.isFinite(nextScore)) {
        setRiskScore(Math.max(0, Math.min(100, Math.round(nextScore))))
      }
      setShiftRhythmData(json)
    }

    try {
      const res = await authedFetch('/api/shift-rhythm', { cache: 'no-store' })
      if (res.ok) {
        await parseAndSet(res)
        return
      }

      // Auth/session can be briefly out of sync on mobile.
      // Retry without bearer header so server-side cookie auth can still work.
      if (res.status === 401 || res.status === 403) {
        const cookieRetry = await fetch('/api/shift-rhythm?force=true', {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        if (cookieRetry.ok) {
          await parseAndSet(cookieRetry)
        }
      }
    } catch {
      // Keep last known risk when fetch fails transiently.
    }
  }, [])

  useEffect(() => {
    fetchBingeRisk()

    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchBingeRisk()
      }
    }
    const onFocus = () => fetchBingeRisk()
    const intervalId = window.setInterval(() => fetchBingeRisk(), 60 * 1000)

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [fetchBingeRisk])

  const factors: Factor[] = useMemo(() => {
    const sleepCategory = shiftRhythmData?.sleepDeficit?.category
    const weeklyDeficit = shiftRhythmData?.sleepDeficit?.weeklyDeficit
    const circadianCategory = shiftRhythmData?.socialJetlag?.category
    const misalignmentHours = shiftRhythmData?.socialJetlag?.currentMisalignmentHours

    const sleepFactor: Factor = (() => {
      if (sleepCategory === 'high') {
        return {
          id: 'sleep',
          icon: '😴',
          label: 'Sleep Debt',
          value: weeklyDeficit ? `High (${weeklyDeficit.toFixed(1)}h)` : 'High',
          color: '#FF3B30',
          score: 85,
        }
      }
      if (sleepCategory === 'medium') {
        return {
          id: 'sleep',
          icon: '😴',
          label: 'Sleep Debt',
          value: weeklyDeficit ? `Moderate (${weeklyDeficit.toFixed(1)}h)` : 'Moderate',
          color: '#FF9500',
          score: 55,
        }
      }
      if (sleepCategory === 'low') {
        return {
          id: 'sleep',
          icon: '😴',
          label: 'Sleep Debt',
          value: weeklyDeficit ? `Low (${weeklyDeficit.toFixed(1)}h)` : 'Low',
          color: '#34C759',
          score: 25,
        }
      }
      return { id: 'sleep', icon: '😴', label: 'Sleep Debt', value: 'Unknown', color: '#94A3B8', score: 40 }
    })()

    const circadianFactor: Factor = (() => {
      if (circadianCategory === 'high') {
        return {
          id: 'circadian',
          icon: '🕐',
          label: 'Circadian Sync',
          value: misalignmentHours != null ? `Off (${misalignmentHours.toFixed(1)}h)` : 'Off track',
          color: '#FF3B30',
          score: 85,
        }
      }
      if (circadianCategory === 'moderate') {
        return {
          id: 'circadian',
          icon: '🕐',
          label: 'Circadian Sync',
          value: misalignmentHours != null ? `Mixed (${misalignmentHours.toFixed(1)}h)` : 'Moderate',
          color: '#FF9500',
          score: 55,
        }
      }
      if (circadianCategory === 'low') {
        return {
          id: 'circadian',
          icon: '🕐',
          label: 'Circadian Sync',
          value: misalignmentHours != null ? `On track (${misalignmentHours.toFixed(1)}h)` : 'On track',
          color: '#34C759',
          score: 20,
        }
      }
      return { id: 'circadian', icon: '🕐', label: 'Circadian Sync', value: 'Unknown', color: '#94A3B8', score: 40 }
    })()

    const stressFactor: Factor =
      riskScore >= 70
        ? { id: 'stress', icon: '💼', label: 'Shift Stress', value: 'High', color: '#FF3B30', score: 78 }
        : riskScore >= 35
          ? { id: 'stress', icon: '💼', label: 'Shift Stress', value: 'Moderate', color: '#FF9500', score: 55 }
          : { id: 'stress', icon: '💼', label: 'Shift Stress', value: 'Low', color: '#34C759', score: 25 }

    const mealsFactor: Factor =
      riskScore >= 70
        ? { id: 'meals', icon: '🍽️', label: 'Meal Timing', value: 'Needs work', color: '#FF3B30', score: 75 }
        : riskScore >= 35
          ? { id: 'meals', icon: '🍽️', label: 'Meal Timing', value: 'Okay', color: '#FF9500', score: 50 }
          : { id: 'meals', icon: '🍽️', label: 'Meal Timing', value: 'Good', color: '#34C759', score: 25 }

    return [sleepFactor, circadianFactor, stressFactor, mealsFactor]
  }, [shiftRhythmData, riskScore])

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'factors', label: 'Factors' },
    { id: 'actions', label: 'Actions' },
  ]

  return (
    <div
      style={{
        fontFamily: "-apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif",
        background: 'var(--bg)',
        minHeight: '100vh',
        maxWidth: '100%',
        margin: '0 auto',
        paddingBottom: 80,
      }}
    >
      <div
        style={{
          background: 'var(--bg)',
          padding: '16px 20px 0',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 1px 0 var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Link
            href="/dashboard"
            className="rounded-full border border-[var(--border-subtle)] bg-[var(--card)] p-2 text-[var(--text-soft)] shadow-none transition-colors hover:bg-[var(--card-subtle)]"
            aria-label="Back to dashboard"
            style={{ textDecoration: 'none' }}
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1
            className="text-xl font-semibold tracking-tight text-[var(--text-main)]"
            style={{ margin: 0 }}
          >
            Binge Risk
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-subtle)' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                padding: '10px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? '#007AFF' : 'var(--text-muted)',
                borderBottom: tab === t.id ? '2px solid #007AFF' : '2px solid transparent',
                transition: 'all 0.2s',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {tab === 'overview' ? (
          <>
            <div style={{ background: 'var(--card)', borderRadius: 12, padding: '20px 20px 24px', marginBottom: 12 }}>
              <RiskGauge score={riskScore} />
            </div>

            <div style={{ background: 'var(--card)', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
              <p
                style={{
                  margin: '0 0 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                What your score means
              </p>
              {[
                { dot: '#34C759', label: 'Low', desc: 'Balanced, stable pattern' },
                { dot: '#FF9500', label: 'Medium', desc: 'Watch your triggers' },
                { dot: '#FF3B30', label: 'High', desc: 'Extra support & planning needed' },
              ].map((r) => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', width: 54 }}>{r.label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>{r.desc}</span>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--card)', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
              <p
                style={{
                  margin: '0 0 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                How ShiftCoach helps
              </p>
              {[
                { icon: '😴', text: 'Nudges you toward enough sleep for your shifts' },
                { icon: '🕐', text: 'Plans protein-focused meals when you are most alert' },
                { icon: '🚨', text: 'Flags danger windows on your dashboard' },
                { icon: '🍱', text: 'Suggests small, regular meals to prevent binges' },
              ].map((item, i) => (
                <div
                  key={`${item.icon}-${i}`}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: i < 3 ? 12 : 0 }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'var(--card-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--text-soft)', lineHeight: 1.4, paddingTop: 8 }}>{item.text}</p>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {tab === 'factors' ? (
          <>
            <div style={{ background: 'var(--card)', borderRadius: 12, padding: '20px', marginBottom: 12 }}>
              <p
                style={{
                  margin: '0 0 20px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Contributing factors
              </p>
              {factors.map((f, i) => (
                <FactorBar key={f.id} factor={f} delay={i * 120 + 200} />
              ))}
            </div>

            <div style={{ background: 'var(--card)', borderRadius: 12, padding: '20px', marginBottom: 12 }}>
              <p
                style={{
                  margin: '0 0 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Why shift workers binge more
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {whyCards.map((c) => (
                  <WhyCard key={c.title} card={c} />
                ))}
              </div>
            </div>
          </>
        ) : null}

        {tab === 'actions' ? (
          <>
            <div style={{ background: 'var(--card)', borderRadius: 12, padding: '20px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22 }}>🌿</span>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>Quick actions</p>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                Tap to mark done. Works best on medium or high risk days.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {quickActions.map((item, i) => (
                  <ActionPill key={`${item.icon}-${i}`} item={item} />
                ))}
              </div>
            </div>

            <BodyClockMotivationCard
              className="mb-3"
              message="The goal is not to be perfect — it is to stack the odds in your favour so binges become rare slips, not your normal pattern."
            />
          </>
        ) : null}

        <div style={{ paddingTop: 8, paddingBottom: 8, textAlign: 'center' }}>
          <p
            style={{
              margin: 0,
              marginBottom: 6,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            SHIFTCOACH
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            A coaching app only and does not replace medical advice. Please speak to a healthcare professional about
            any health concerns.
          </p>
        </div>
      </div>
    </div>
  )
}
