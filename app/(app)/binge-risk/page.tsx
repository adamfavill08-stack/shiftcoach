'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { authedFetch } from '@/lib/supabase/authedFetch'
import { BodyClockMotivationCard } from '@/components/body-clock/BodyClockMotivationCard'

const RISK_SCORE = 0

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

const factors: Factor[] = [
  { id: 'sleep', icon: '😴', label: 'Sleep Debt', value: 'Low', color: '#34C759', score: 10 },
  { id: 'circadian', icon: '🕐', label: 'Circadian Sync', value: 'On track', color: '#34C759', score: 15 },
  { id: 'stress', icon: '💼', label: 'Shift Stress', value: 'Moderate', color: '#FF9500', score: 45 },
  { id: 'meals', icon: '🍽️', label: 'Meal Timing', value: 'Good', color: '#34C759', score: 20 },
]

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
    const id = window.setTimeout(() => setAnimated(true), 200)
    return () => window.clearTimeout(id)
  }, [])

  const clamp = Math.min(Math.max(score, 0), 100)
  const fillPct = animated ? clamp : 0
  const endAngle = Math.PI - (fillPct / 100) * Math.PI
  const endX = 100 + 90 * Math.cos(endAngle)
  const endY = 100 - 90 * Math.sin(endAngle)
  const largeArc = fillPct > 50 ? 1 : 0

  const getColor = (s: number) => (s < 33 ? '#34C759' : s < 66 ? '#FF9500' : '#FF3B30')
  const getLabel = (s: number) => (s < 33 ? 'Low' : s < 66 ? 'Moderate' : 'High')
  const color = getColor(clamp)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 0' }}>
      <div style={{ position: 'relative', width: 200, height: 110 }}>
        <svg width="200" height="110" viewBox="0 0 200 110">
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {fillPct > 0 ? (
            <path
              d={`M 10 100 A 90 90 0 ${largeArc} 1 ${endX} ${endY}`}
              fill="none"
              stroke={color}
              strokeWidth="14"
              strokeLinecap="round"
              style={{ transition: 'stroke 0.5s' }}
            />
          ) : null}

          {[33, 66].map((pct) => {
            const angle = Math.PI - (pct / 100) * Math.PI
            const x = 100 + 90 * Math.cos(angle)
            const y = 100 - 90 * Math.sin(angle)
            const ix = 100 + 76 * Math.cos(angle)
            const iy = 100 - 76 * Math.sin(angle)
            return <line key={pct} x1={x} y1={y} x2={ix} y2={iy} stroke="var(--card)" strokeWidth="2" />
          })}

          {(() => {
            const angle = Math.PI - (clamp / 100) * Math.PI
            const nx = 100 + 72 * Math.cos(angle)
            const ny = 100 - 72 * Math.sin(angle)
            return (
              <g
                style={{
                  transition: 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transformOrigin: '100px 100px',
                }}
              >
                <line
                  x1="100"
                  y1="100"
                  x2={nx}
                  y2={ny}
                  stroke={color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{
                    transformOrigin: '100px 100px',
                    transform: `rotate(${animated ? 0 : 180}deg)`,
                    transition: 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />
                <circle cx="100" cy="100" r="5" fill={color} />
              </g>
            )
          })()}
        </svg>

        <div
          style={{
            position: 'absolute',
            bottom: -10,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 4px',
          }}
        >
          <span style={{ fontSize: 10, color: '#34C759', fontWeight: 600 }}>Low</span>
          <span style={{ fontSize: 10, color: '#FF9500', fontWeight: 600 }}>Moderate</span>
          <span style={{ fontSize: 10, color: '#FF3B30', fontWeight: 600 }}>High</span>
        </div>
      </div>

      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <div style={{ fontSize: 42, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>{clamp}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color, marginTop: 4 }}>{getLabel(clamp)}</div>
      </div>
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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await authedFetch('/api/shift-rhythm', { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const json = (await res.json().catch(() => ({}))) as { bingeRisk?: BingeRiskPayload | null }
        const nextScore = json?.bingeRisk?.score
        if (!cancelled && typeof nextScore === 'number' && Number.isFinite(nextScore)) {
          setRiskScore(Math.max(0, Math.min(100, Math.round(nextScore))))
        }
      } catch {
        // keep fallback demo score when fetch fails
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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
