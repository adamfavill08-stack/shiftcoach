'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft, Check } from 'lucide-react'
import { useSubscriptionAccess } from '@/lib/hooks/useSubscriptionAccess'
import { useNativePurchases } from '@/lib/hooks/useNativePurchases'
import { useTranslation } from '@/components/providers/language-provider'

export default function UpgradePage() {
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
  } = useNativePurchases()

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
  const monthlyPriceLabel = getPlanPriceLabel('monthly')
  const yearlyPriceLabel = getPlanPriceLabel('yearly')
  const monthlyPriceAmount = getPlanPriceAmount('monthly')
  const yearlyPriceAmount = getPlanPriceAmount('yearly')
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

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 pb-20">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-slate-100 bg-white shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <Link
              href="/settings"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-sky-50 hover:text-slate-900"
              aria-label={t('upgrade.backToSettingsAria')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-sm font-semibold tracking-tight text-slate-900">{t('upgrade.pageTitle')}</h1>
            <div className="w-8" />
          </div>

          <div className="space-y-5 px-4 pb-5 pt-4">
            <section className="rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 px-4 py-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">{t('upgrade.bannerKicker')}</p>
              <h2 className="mt-1 text-xl font-semibold leading-tight">{t('upgrade.bannerTitle')}</h2>
              <p className="mt-2 text-sm text-white/90">
                {t('upgrade.bannerSubtitle')}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
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
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
                <p className="text-base font-semibold text-emerald-800">{t('upgrade.alreadyPro.title')}</p>
                <p className="mt-1 text-sm text-emerald-700">{t('upgrade.alreadyPro.message')}</p>
              </section>
            ) : (
              <section className="space-y-3">
                <button
                  type="button"
                  onClick={() => void purchaseSubscription('monthly')}
                  disabled={isBusy || !isAvailable || isLoading}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPurchasing
                    ? t('upgrade.buttons.processing')
                    : monthlyPriceLabel
                      ? t('upgrade.buttons.monthlyWithDynamicPrice', { price: monthlyPriceLabel })
                      : t('upgrade.buttons.monthlyWithPrice')}
                </button>

                <button
                  type="button"
                  onClick={() => void purchaseSubscription('yearly')}
                  disabled={isBusy || !isAvailable || isLoading}
                  className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors enabled:hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPurchasing ? (
                    t('upgrade.buttons.processing')
                  ) : (
                    <span className="flex flex-col items-center leading-tight">
                      <span>
                        {yearlyPriceLabel
                          ? t('upgrade.buttons.annualWithDynamicPrice', { price: yearlyPriceLabel })
                          : t('upgrade.buttons.annualWithPrice')}
                      </span>
                      <span className="mt-0.5 text-[11px] font-medium text-white/90">
                        {annualSavingsText}
                      </span>
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void restore()}
                  disabled={isBusy || !isAvailable || isLoading}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRestoring ? t('upgrade.buttons.restoring') : t('upgrade.buttons.restore')}
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
