'use client'

import { Suspense, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Check } from 'lucide-react'
import { useSubscriptionAccess } from '@/lib/hooks/useSubscriptionAccess'
import { useNativePurchases } from '@/lib/hooks/useNativePurchases'
import { useTranslation } from '@/components/providers/language-provider'

function UpgradePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const { isLoading, isPro, plan } = useSubscriptionAccess()
  const {
    isAvailable,
    isPurchasing,
    isRestoring,
    purchaseSubscription,
    restore,
    getPlanPriceLabel,
    getPlanPriceAmount,
    storeConfigWarning,
    storePriceLabelsLoading,
  } = useNativePurchases()
  const fromOnboarding = searchParams.get('from') === 'onboarding'
  const highlightedPlan = searchParams.get('plan')
  const returnTo = searchParams.get('returnTo') || '/dashboard'

  const proFeatures = useMemo(
    () => [
      t('upgrade.benefits.unlimitedHistory'),
      t('upgrade.benefits.noAds'),
      t('upgrade.benefits.adjustedCalories'),
      t('upgrade.benefits.nextMealWindow'),
      t('upgrade.benefits.shiftLagInsights'),
      t('upgrade.benefits.calorieProfileSetup'),
      t('upgrade.benefits.allBlogArticles'),
    ],
    [t],
  )
  const isAlreadyPro = useMemo(() => !isLoading && (isPro || plan === 'tester'), [isLoading, isPro, plan])
  const isBusy = isPurchasing || isRestoring
  const monthlyPriceLabel = storePriceLabelsLoading ? null : getPlanPriceLabel('monthly')
  const yearlyPriceLabel = storePriceLabelsLoading ? null : getPlanPriceLabel('yearly')
  const monthlyPriceAmount = getPlanPriceAmount('monthly')
  const yearlyPriceAmount = getPlanPriceAmount('yearly')
  const formatPlanPrice = (label: string | null) => {
    if (storePriceLabelsLoading) return '…'
    return label?.trim() ? label : '—'
  }
  const annualSavingsText = useMemo(() => {
    if (
      typeof monthlyPriceAmount === 'number' &&
      typeof yearlyPriceAmount === 'number' &&
      monthlyPriceAmount > 0
    ) {
      const monthlyAnnualized = monthlyPriceAmount * 12
      const pct = Math.max(0, Math.round(((monthlyAnnualized - yearlyPriceAmount) / monthlyAnnualized) * 100))
      return t('upgrade.buttons.annualSavingsDynamic', { percent: pct })
    }
    return t('upgrade.buttons.annualSavings')
  }, [monthlyPriceAmount, yearlyPriceAmount, t])

  const planForContinuePurchase = useMemo((): 'monthly' | 'yearly' => {
    if (highlightedPlan === 'monthly') return 'monthly'
    return 'yearly'
  }, [highlightedPlan])

  const yearlySaveBadge = useMemo(() => {
    if (
      typeof monthlyPriceAmount === 'number' &&
      typeof yearlyPriceAmount === 'number' &&
      monthlyPriceAmount > 0
    ) {
      const monthlyAnnualized = monthlyPriceAmount * 12
      const pct = Math.max(0, Math.round(((monthlyAnnualized - yearlyPriceAmount) / monthlyAnnualized) * 100))
      return t('upgrade.planCard.saveBadge', { percent: pct })
    }
    return t('upgrade.planCard.saveBadgeStatic')
  }, [monthlyPriceAmount, yearlyPriceAmount, t])

  useEffect(() => {
    if (!fromOnboarding || isLoading) return
    if (isAlreadyPro) {
      router.replace(returnTo)
    }
  }, [fromOnboarding, isAlreadyPro, isLoading, returnTo, router])

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 pb-20">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <Link
              href={fromOnboarding ? '/onboarding/plan' : '/settings'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-sky-50 hover:text-slate-900"
              aria-label={fromOnboarding ? 'Back to plan selection' : t('upgrade.backToSettingsAria')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-sm font-semibold tracking-tight text-slate-900">{t('upgrade.pageTitle')}</h1>
            <div className="w-8" />
          </div>

          <div className="space-y-5 px-4 pb-5 pt-4">
            <div
              className="flex items-center justify-center gap-2 rounded-md border border-[#05afc5]/20 bg-[#05afc5]/10 px-3 py-2 dark:border-[#05afc5]/25 dark:bg-[#05afc5]/15"
              role="note"
            >
              <img
                src="/trusted-shield.png"
                alt=""
                width={14}
                height={14}
                className="h-3.5 w-3.5 shrink-0 object-contain"
                aria-hidden
              />
              <p className="text-center text-[11px] font-medium leading-snug tracking-[0.02em] text-slate-600 dark:text-slate-400">
                {t('upgrade.trustedBy')}
              </p>
            </div>

            <section className="rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 px-4 py-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">{t('upgrade.bannerKicker')}</p>
              <h2 className="mt-1 text-xl font-semibold leading-tight">{t('upgrade.bannerTitle')}</h2>
              <p className="mt-2 text-sm text-white/90">
                {t('upgrade.bannerSubtitle')}
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">{t('upgrade.benefitsTitle')}</p>
              <ul className="mt-3 space-y-2">
                {proFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </section>

            {isAlreadyPro ? (
              <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
                <p className="text-base font-semibold text-emerald-800">{t('upgrade.alreadyPro.title')}</p>
                <p className="mt-1 text-sm text-emerald-700">{t('upgrade.alreadyPro.message')}</p>
              </section>
            ) : (
              <section className="space-y-3">
                {storeConfigWarning && isAvailable ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-xs text-amber-900">
                    {storeConfigWarning}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => void purchaseSubscription('monthly')}
                  disabled={isBusy || !isAvailable || isLoading}
                  className={`group relative w-full overflow-hidden rounded-lg border px-3.5 py-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    highlightedPlan === 'monthly'
                      ? 'border-[#05afc5]/60 bg-[#e9f7fa] dark:bg-[#05afc5]/12'
                      : 'border-[var(--border-subtle)] bg-[var(--card-subtle)] enabled:hover:border-[#05afc5]/45 enabled:hover:bg-[var(--card)]'
                  }`}
                >
                  {isPurchasing ? (
                    <p className="py-1 text-center text-sm font-semibold text-[var(--text-main)]">
                      {t('upgrade.buttons.processing')}
                    </p>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                            highlightedPlan === 'monthly'
                              ? 'border-[#2b7fff] bg-white/90'
                              : 'border-[var(--border-subtle)] bg-transparent'
                          }`}
                          aria-hidden
                        >
                          {highlightedPlan === 'monthly' ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-[#2b7fff]" />
                          ) : null}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-[var(--text-main)]">
                            {t('upgrade.planCard.monthlyTitle')}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[var(--text-soft)]">
                            {t('upgrade.planCard.monthlySubtitle')}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right leading-tight">
                        <p className="text-base font-semibold text-black dark:text-[var(--text-main)]">
                          {formatPlanPrice(monthlyPriceLabel)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[var(--text-soft)]">
                          {t('upgrade.planCard.perMonth')}
                        </p>
                      </div>
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void purchaseSubscription('yearly')}
                  disabled={isBusy || !isAvailable || isLoading}
                  className={`group relative w-full overflow-hidden rounded-lg border px-3.5 py-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    highlightedPlan === 'yearly'
                      ? 'border-[#05afc5]/60 bg-[#e9f7fa] shadow-[0_3px_12px_-8px_rgba(5,175,197,0.65)] dark:bg-[#05afc5]/12 dark:border-[#05afc5]/70'
                      : 'border-[var(--border-subtle)] bg-[var(--card-subtle)] enabled:hover:border-[#05afc5]/45 enabled:hover:bg-[var(--card)]'
                  }`}
                >
                  {isPurchasing ? (
                    <p className="py-1 text-center text-sm font-semibold text-[var(--text-main)]">
                      {t('upgrade.buttons.processing')}
                    </p>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`grid h-6 w-6 place-items-center rounded-full border-2 ${
                            highlightedPlan === 'yearly'
                              ? 'border-[#2b7fff] bg-white/90'
                              : 'border-[var(--border-subtle)] bg-transparent'
                          }`}
                          aria-hidden
                        >
                          {highlightedPlan === 'yearly' ? (
                            <span className="h-3 w-3 rounded-full bg-[#2b7fff]" />
                          ) : null}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[15px] font-semibold text-slate-800 dark:text-[var(--text-main)]">
                              {t('upgrade.planCard.yearlyTitle')}
                            </p>
                            <span className="rounded-full border border-[#8cc8ff] bg-[#ebf6ff] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#2b7fff] dark:border-[#63b6ff]/65 dark:bg-[#2b7fff]/20 dark:text-[#8fd0ff]">
                              {yearlySaveBadge}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-[var(--text-soft)]">
                            {t('upgrade.planCard.yearlySubtitle')}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right leading-tight">
                        <p className="text-base font-semibold text-slate-800 dark:text-[var(--text-main)]">
                          {formatPlanPrice(yearlyPriceLabel)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[var(--text-soft)]">
                          {t('upgrade.planCard.perYear')}
                        </p>
                        <p className="mt-1 max-w-[9.5rem] text-[11px] font-medium leading-snug text-slate-500 dark:text-[var(--text-soft)]">
                          {annualSavingsText}
                        </p>
                      </div>
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void purchaseSubscription(planForContinuePurchase)}
                  disabled={isBusy || !isAvailable || isLoading}
                  className="w-full rounded-lg bg-[#05afc5] px-4 py-3 text-sm font-semibold text-white transition-colors enabled:hover:bg-[#049cb1] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPurchasing
                    ? t('upgrade.buttons.processing')
                    : t('upgrade.buttons.continuePurchase')}
                </button>

                <button
                  type="button"
                  onClick={() => void restore()}
                  disabled={isBusy || !isAvailable || isLoading || isPurchasing}
                  className="w-full py-2 text-center text-sm font-medium text-sky-700 underline decoration-sky-700/50 underline-offset-2 transition-colors enabled:hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-sky-400 dark:decoration-sky-400/50 dark:enabled:hover:text-sky-300"
                >
                  {isRestoring ? t('upgrade.buttons.restoring') : t('upgrade.buttons.restorePurchasesLink')}
                </button>

                {!isAvailable ? (
                  <p className="text-center text-xs text-slate-500">
                    {t('upgrade.purchasesUnavailable')}
                  </p>
                ) : null}
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-100 px-4 py-6 pb-20" />}>
      <UpgradePageContent />
    </Suspense>
  )
}
