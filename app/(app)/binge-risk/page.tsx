'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'

type BingeRisk = {
  score: number
  level: 'low' | 'medium' | 'high'
  drivers: string[]
  explanation: string
}

export default function BingeRiskPage() {
  const { t } = useTranslation()
  const [risk, setRisk] = useState<BingeRisk | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/shift-rhythm', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json().catch(() => ({}))
        if (!cancelled && json?.bingeRisk) {
          setRisk(json.bingeRisk as BingeRisk)
        }
      } catch {
        // keep null – page stays readable
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const score = risk?.score ?? 0
  const level = risk?.level ?? 'low'

  const levelLabel = level === 'low' ? 'Low' : level === 'medium' ? 'Medium' : 'High'

  const ringGradientId = 'bingeGaugeGradient'

  const ringFillFraction =
    level === 'low' ? Math.min(1, score / 60) : level === 'medium' ? 0.5 + Math.min(0.3, score / 200) : 0.8

  const ringBg =
    level === 'low'
      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/35 dark:text-emerald-300'
      : level === 'medium'
      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/35 dark:text-amber-300'
      : 'bg-rose-50 text-rose-600 dark:bg-rose-950/35 dark:text-rose-300'

  const chipClass =
    level === 'low'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300'
      : level === 'medium'
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/35 dark:text-amber-300'
      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/35 dark:text-rose-300'

  const headline =
    level === 'low'
      ? 'Cravings in a steady place'
      : level === 'medium'
      ? 'Cravings more likely on tired shifts'
      : 'High risk of big cravings and binges'

  const explainer =
    risk?.explanation ??
    'Based on your recent sleep, shifts and habits, this estimates how likely strong cravings or binges are in the next day or two.'

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center gap-2 mb-2">
          <Link
            href="/dashboard"
            className="rounded-full border border-[var(--border-subtle)] bg-[var(--card)] p-2 text-[var(--text-soft)] shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
            aria-label={t('detail.common.backToDashboard')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">{t('detail.bingeRisk.title')}</h1>
        </header>

        {/* Hero binge risk ring */}
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-5 shadow-[0_14px_36px_rgba(0,0,0,0.32)]">
          <div className="flex items-center justify-center">
            <div className="relative h-40 w-40">
              <svg viewBox="0 0 132 132" className="h-40 w-40">
                <defs>
                  <linearGradient id={ringGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="50%" stopColor="#facc15" />
                    <stop offset="100%" stopColor="#fb7185" />
                  </linearGradient>
                </defs>
                {/* Track */}
                <circle
                  cx="66"
                  cy="66"
                  r="52"
                  stroke="var(--border-subtle)"
                  strokeWidth="8.5"
                  fill="none"
                />
                {/* Progress arc */}
                <circle
                  cx="66"
                  cy="66"
                  r="52"
                  stroke={`url(#${ringGradientId})`}
                  strokeWidth="8.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={(2 * Math.PI * 52) * (1 - ringFillFraction)}
                  transform="rotate(-90 66 66)"
                />
              </svg>
              <div className={`absolute inset-0 flex flex-col items-center justify-center ${ringBg} rounded-full mx-8 my-8`}>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Score
                </span>
                <span className="text-2xl font-semibold tabular-nums text-[var(--text-main)]">
                  {score}
                </span>
                <span className="mt-1 text-[11px] font-medium text-[var(--text-soft)]">
                  {levelLabel} risk
                </span>
              </div>
            </div>
          </div>

          <div className="w-full flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Binge risk on shifts
                </p>
                <p className="text-sm font-semibold text-[var(--text-main)]">
                  {headline}
                </p>
                <p className="text-[11px] text-[var(--text-soft)]">
                  {explainer}
                </p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${chipClass}`}>
                {risk ? levelLabel : 'No recent data'}
              </span>
            </div>

            {risk && risk.drivers?.length > 0 && (
              <div className="mt-1">
                <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Main drivers this week
                </p>
                <div className="flex flex-wrap gap-1">
                  {risk.drivers.slice(0, 4).map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--card-subtle)] px-2 py-0.5 text-[10px] text-[var(--text-soft)]"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Key facts strip */}
        <section className="flex flex-col gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-4 py-3 text-[11px] text-[var(--text-soft)] shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <span>Binge Risk estimates how likely you are to overeat based on sleep, shifts and recent habits.</span>
          <span>Low = stable. Medium = watch your triggers. High = extra support & planning.</span>
        </section>

        {/* Colour scale */}
        <section className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
            What the colours mean
          </p>
          <div className="flex flex-col gap-2 text-[13px] text-[var(--text-soft)]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="font-semibold">Low</span>
              <span className="text-[12px] text-[var(--text-muted)]">Balanced, stable pattern.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="font-semibold">Medium</span>
              <span className="text-[12px] text-[var(--text-muted)]">
                Some red flags – be extra intentional with meals, sleep and caffeine.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="font-semibold">High</span>
              <span className="text-[12px] text-[var(--text-muted)]">
                Your body is running on fumes – plan support and recovery now.
              </span>
            </div>
          </div>
        </section>

        {/* Why shift workers struggle */}
        <section className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🤍</span>
            <p className="text-sm font-semibold text-[var(--text-main)]">Why shift workers binge more</p>
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-[13px] text-[var(--text-soft)]">
            <li>
              <span className="font-semibold">Sleep debt:</span> less sleep = more hunger hormone
              (ghrelin) and less "I&apos;m full" signal (leptin).
            </li>
            <li>
              <span className="font-semibold">Circadian mismatch:</span> eating at 3–4am when your
              body expects sleep makes you crave junk and store more fat.
            </li>
            <li>
              <span className="font-semibold">Stress &amp; emotion:</span> long, busy shifts with
              no breaks make food the easiest reward.
            </li>
            <li>
              <span className="font-semibold">Environment:</span> vending machines, takeaways and
              energy drinks are always available on nights.
            </li>
          </ul>
        </section>

        {/* How Shift Coach helps */}
        <section className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📋</span>
            <p className="text-sm font-semibold text-[var(--text-main)]">How ShiftCoach helps you combat it</p>
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-[13px] text-[var(--text-soft)]">
            <li>
              <span className="font-semibold">Keeps sleep on track:</span> nudges you towards
              enough sleep and better timing for your shifts.
            </li>
            <li>
              <span className="font-semibold">Times meals for your rota:</span> plans
              protein‑focused meals when you&apos;re most alert, not when your body expects sleep.
            </li>
            <li>
              <span className="font-semibold">Flags danger windows:</span> high‑risk nights show up
              on your dashboard so you can plan ahead.
            </li>
            <li>
              <span className="font-semibold">Encourages steady fuel:</span> instead of starving
              then binging, you get small, regular meal suggestions.
            </li>
          </ul>
        </section>

        {/* Practical tips */}
        <section className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🌿</span>
            <p className="text-sm font-semibold text-[var(--text-main)]">
              Quick actions when risk is Medium or High
            </p>
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-[13px] text-[var(--text-soft)]">
            <li>
              Eat a <span className="font-semibold">planned snack</span> (protein + fibre) before
              you get home from a long or night shift.
            </li>
            <li>
              Set a <span className="font-semibold">"kitchen closed" time</span> so you don&apos;t
              default to grazing late at night.
            </li>
            <li>
              Use a <span className="font-semibold">non‑food reward</span> after work: shower,
              music, short walk, call someone, game, etc.
            </li>
            <li>
              On days off, prioritise <span className="font-semibold">one solid sleep</span>{" "}
              instead of lots of tiny naps.
            </li>
          </ul>
          <p className="text-[13px] text-[var(--text-soft)]">
            The goal isn&apos;t to be perfect – it&apos;s to stack the odds in your favour so
            binges become <span className="font-semibold">rare slips</span>, not your normal
            pattern.
          </p>
        </section>

        
        {/* ShiftCoach logo footer */}
        <div className="pt-6 pb-4 flex flex-col items-center gap-1">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            ShiftCoach
          </div>
          <p className="max-w-[260px] text-center text-[10px] text-[var(--text-muted)]">
            {t('detail.common.disclaimer')}
          </p>
        </div>
      </div>
    </main>
  )
}
