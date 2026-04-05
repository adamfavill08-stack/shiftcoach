'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { riskScaleBarMarkerFill } from '@/lib/riskScaleBarMarker'

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
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300'
      : level === 'medium'
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/35 dark:text-amber-300'
        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/35 dark:text-rose-300'

  const explainer = risk?.explanation ?? t('detail.bingeRisk.explainerDefault')

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        <header className="flex items-center gap-2 mb-2">
          <Link
            href="/dashboard"
            className="rounded-full border border-[var(--border-subtle)] bg-[var(--card)] p-2 text-[var(--text-soft)] shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
            aria-label={t('detail.common.backToDashboard')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
            {t('detail.bingeRisk.title')}
          </h1>
        </header>

        <section className="flex flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-5 shadow-[0_14px_36px_rgba(0,0,0,0.32)]">
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
                  <div className="bg-emerald-300" />
                  <div className="bg-emerald-400" />
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500" />
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
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  {t('detail.bingeRisk.sectionKicker')}
                </p>
                <p className="text-sm font-semibold text-[var(--text-main)]">{headline}</p>
                <p className="text-[11px] text-[var(--text-soft)]">{explainer}</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${chipClass}`}
              >
                {risk ? levelLabel : t('detail.bingeRisk.noRecentData')}
              </span>
            </div>

            {risk && risk.drivers?.length > 0 && (
              <div className="mt-1">
                <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {t('detail.bingeRisk.driversTitle')}
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

        <section className="flex flex-col gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-4 py-3 text-[11px] text-[var(--text-soft)] shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <span>{t('detail.bingeRisk.factsLine1')}</span>
          <span>{t('detail.bingeRisk.factsLine2')}</span>
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
            {t('detail.bingeRisk.colorsTitle')}
          </p>
          <div className="flex flex-col gap-2 text-[13px] text-[var(--text-soft)]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="font-semibold">{t('detail.bingeRisk.colorLow')}</span>
              <span className="text-[12px] text-[var(--text-muted)]">{t('detail.bingeRisk.colorLowDesc')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="font-semibold">{t('detail.bingeRisk.colorMedium')}</span>
              <span className="text-[12px] text-[var(--text-muted)]">
                {t('detail.bingeRisk.colorMediumDesc')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
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
