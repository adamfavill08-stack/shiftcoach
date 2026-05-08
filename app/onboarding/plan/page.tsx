'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ShieldCheck, RefreshCw } from 'lucide-react'
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor'
import { useTranslation } from '@/components/providers/language-provider'
import { createClientComponentClient } from '@/lib/supabase'
import { useNativePurchases } from '@/lib/hooks/useNativePurchases'
import { getPurchasePlatform, isNativePurchaseAvailable } from '@/lib/purchases/native-purchases'
import {
  loadCurrentOfferingPackages,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
} from '@/lib/revenuecat'

type SelectedPlan = 'free' | 'monthly' | 'annual'

async function syncProProfileFromRevenueCatServer(): Promise<boolean> {
  const platform = getPurchasePlatform()
  if (platform !== 'ios' && platform !== 'android') return false

  const supabase = createClientComponentClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const res = await fetch('/api/revenuecat/sync-from-store', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ platform }),
  })
  const json = (await res.json().catch(() => ({}))) as { success?: boolean }
  return Boolean(res.ok && json.success)
}

export default function OnboardingPlanPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const supabase = createClientComponentClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>('annual')
  const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null)
  const [annualPkg, setAnnualPkg] = useState<PurchasesPackage | null>(null)
  const [offeringsWarning, setOfferingsWarning] = useState<string | null>(null)
  const [offeringsLoading, setOfferingsLoading] = useState(false)
  const [savingFree, setSavingFree] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  const { getPlanPriceLabel, storePriceLabelsLoading, isAvailable } = useNativePurchases()
  const monthlyPriceLabel = storePriceLabelsLoading ? null : getPlanPriceLabel('monthly')
  const yearlyPriceLabel = storePriceLabelsLoading ? null : getPlanPriceLabel('yearly')
  const formatPlanPrice = (label: string | null) => {
    if (storePriceLabelsLoading) return '…'
    return label?.trim() ? label : '—'
  }

  useEffect(() => {
    let cancelled = false
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) setUserId(user?.id ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [supabase])

  const refreshOfferings = useCallback(async () => {
    if (!userId || !isNativePurchaseAvailable()) {
      setMonthlyPkg(null)
      setAnnualPkg(null)
      setOfferingsWarning(null)
      setOfferingsLoading(false)
      return
    }
    setOfferingsLoading(true)
    setOfferingsWarning(null)
    try {
      const { monthly, annual, warning } = await loadCurrentOfferingPackages(userId)
      setMonthlyPkg(monthly)
      setAnnualPkg(annual)
      setOfferingsWarning(warning)
    } catch {
      setOfferingsWarning(null)
    } finally {
      setOfferingsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refreshOfferings()
  }, [refreshOfferings])

  const blockInteraction = savingFree || purchasing || restoring
  const paidNeedsOfferings =
    isNativePurchaseAvailable() &&
    (selectedPlan === 'monthly' || selectedPlan === 'annual') &&
    offeringsLoading

  const handleRestore = async () => {
    if (!userId || blockInteraction) return
    setRestoring(true)
    setError(null)
    setInfoMessage(null)
    try {
      const result = await restoreRevenueCatPurchases(userId)
      if (result.errorMessage) {
        setError(result.errorMessage)
        return
      }
      if (result.hasPro) {
        const synced = await syncProProfileFromRevenueCatServer()
        if (!synced) {
          setError(t('onboarding.plan.syncAfterRestoreFailed'))
          return
        }
        window.dispatchEvent(new CustomEvent('subscription-updated'))
        router.push('/dashboard')
        return
      }
      setInfoMessage(t('onboarding.plan.restoreNone'))
    } finally {
      setRestoring(false)
    }
  }

  const handleContinue = async () => {
    if (!selectedPlan || blockInteraction || paidNeedsOfferings) return
    setError(null)
    setInfoMessage(null)

    if (selectedPlan === 'free') {
      setSavingFree(true)
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const res = await fetch('/api/onboarding/plan', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ selection: 'free' }),
        })
        const json = (await res.json().catch(() => ({}))) as {
          error?: string
          success?: boolean
          trial?: {
            granted?: boolean
            reason?: 'granted' | 'already_claimed' | 'already_paid' | null
            trialEndsAt?: string | null
          }
        }
        if (!(res.ok && json.success === true)) {
          throw new Error(json.error || 'Unable to save plan selection')
        }

        if (json.trial?.granted === false && json.trial.reason === 'already_claimed') {
          setInfoMessage('Trial already used. Continuing on free plan.')
        }

        window.dispatchEvent(new CustomEvent('subscription-updated'))
        router.push('/dashboard')
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      } finally {
        setSavingFree(false)
      }
      return
    }

    if (!isNativePurchaseAvailable() || !isAvailable) {
      setError(t('onboarding.plan.purchaseInApp'))
      return
    }

    const pkg = selectedPlan === 'monthly' ? monthlyPkg : annualPkg
    if (!pkg) {
      setError(offeringsWarning || t('onboarding.plan.packagesUnavailable'))
      return
    }

    setPurchasing(true)
    try {
      const outcome = await purchaseRevenueCatPackage(userId, pkg)
      if (!outcome.ok) {
        if (outcome.cancelled) {
          return
        }
        setError(outcome.message)
        return
      }

      const synced = await syncProProfileFromRevenueCatServer()
      if (!synced) {
        setError(
          t('onboarding.plan.syncAfterPurchaseFailed') ||
            'Purchase went through, but we could not confirm your subscription yet. Tap Restore purchases in a moment.',
        )
        return
      }

      window.dispatchEvent(new CustomEvent('subscription-updated'))
      router.push('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setPurchasing(false)
    }
  }

  const continueLabel = () => {
    if (savingFree) return t('onboarding.plan.savingFree')
    if (purchasing) return t('onboarding.plan.openingCheckout')
    if (restoring) return t('upgrade.buttons.restoring')
    if (paidNeedsOfferings) return t('onboarding.plan.loadingPlans')
    return t('onboarding.plan.continue')
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 pt-2 pb-20 text-[var(--text-main)]">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-16 flex flex-col items-center px-2 pt-6 text-center">
          <Image
            src="/onboarding-plan-app-icon.png"
            alt=""
            width={160}
            height={160}
            className="h-40 w-40 rounded-3xl object-cover shadow-[0_14px_44px_-10px_rgba(5,175,197,0.42)] dark:shadow-[0_14px_40px_-12px_rgba(5,175,197,0.25)]"
            priority
            unoptimized
          />
          <h1 className="mt-6 text-xl font-semibold tracking-tight text-[var(--text-main)]">
            {t('onboarding.plan.title')}
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-snug text-[var(--text-soft)]">
            {t('onboarding.plan.subtitle')}
          </p>
        </div>
        <div className="relative z-10 -mx-3 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] shadow-[0_18px_45px_-24px_rgba(15,23,42,0.35)] dark:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.65)]">
          <div className="space-y-3 px-5 py-5">
            <button
              type="button"
              onClick={() => setSelectedPlan('free')}
              disabled={blockInteraction}
              className={`group relative w-full overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-all disabled:opacity-60 ${
                selectedPlan === 'free'
                  ? 'border-[#05afc5]/60 bg-[#e9f7fa] dark:border-[#05afc5]/50 dark:bg-[#05afc5]/14'
                  : 'border-[var(--border-subtle)] bg-[var(--card-subtle)] enabled:hover:border-[#05afc5]/45 enabled:hover:bg-[var(--card)]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                      selectedPlan === 'free'
                        ? 'border-[#2b7fff] bg-white/90 dark:border-[#63b6ff] dark:bg-[var(--card)]'
                        : 'border-[var(--border-subtle)] bg-transparent'
                    }`}
                    aria-hidden
                  >
                    {selectedPlan === 'free' ? <span className="h-2.5 w-2.5 rounded-full bg-[#2b7fff]" /> : null}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[var(--text-main)]">
                      {t('onboarding.plan.freeTitle')}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-soft)]">
                      {t('onboarding.plan.freeSubtitle')}
                    </p>
                  </div>
                </div>
                <p className="shrink-0 text-base font-semibold leading-none text-[var(--text-main)]">
                  {t('onboarding.plan.freePrice')}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlan('monthly')}
              disabled={blockInteraction}
              className={`group relative w-full overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-all disabled:opacity-60 ${
                selectedPlan === 'monthly'
                  ? 'border-[#05afc5]/60 bg-[#e9f7fa] dark:border-[#05afc5]/50 dark:bg-[#05afc5]/14'
                  : 'border-[var(--border-subtle)] bg-[var(--card-subtle)] enabled:hover:border-[#05afc5]/45 enabled:hover:bg-[var(--card)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                      selectedPlan === 'monthly'
                        ? 'border-[#2b7fff] bg-white/90 dark:border-[#63b6ff] dark:bg-[var(--card)]'
                        : 'border-[var(--border-subtle)] bg-transparent'
                    }`}
                    aria-hidden
                  >
                    {selectedPlan === 'monthly' ? <span className="h-2.5 w-2.5 rounded-full bg-[#2b7fff]" /> : null}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[var(--text-main)]">
                      {t('upgrade.buttons.monthly')}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-soft)]">
                      {t('onboarding.plan.proFullAccess')}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right leading-tight">
                  <p className="text-base font-semibold text-[var(--text-main)]">
                    {formatPlanPrice(monthlyPriceLabel)}
                  </p>
                  <p className="text-xs text-[var(--text-soft)]">
                    {t('onboarding.plan.perMonth')}
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlan('annual')}
              disabled={blockInteraction}
              className={`group relative w-full overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-all disabled:opacity-60 ${
                selectedPlan === 'annual'
                  ? 'border-[#05afc5]/60 bg-[#e9f7fa] shadow-[0_3px_12px_-8px_rgba(5,175,197,0.65)] dark:border-[#05afc5]/55 dark:bg-[#05afc5]/14 dark:shadow-[0_3px_20px_-6px_rgba(5,175,197,0.2)]'
                  : 'border-[var(--border-subtle)] bg-[var(--card-subtle)] enabled:hover:border-[#05afc5]/45 enabled:hover:bg-[var(--card)]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full border-2 ${
                      selectedPlan === 'annual'
                        ? 'border-[#2b7fff] bg-white/90 dark:border-[#63b6ff] dark:bg-[var(--card)]'
                        : 'border-[var(--border-subtle)] bg-transparent'
                    }`}
                    aria-hidden
                  >
                    {selectedPlan === 'annual' ? <span className="h-3 w-3 rounded-full bg-[#2b7fff]" /> : null}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[15px] font-semibold text-[var(--text-main)]">
                        {t('upgrade.buttons.annual')}
                      </p>
                      <span className="ml-8 mt-1 rounded-full border border-[#8cc8ff] bg-[#ebf6ff] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#2b7fff] dark:border-[#63b6ff]/65 dark:bg-[#2b7fff]/20 dark:text-[#8fd0ff]">
                        {t('onboarding.plan.saveBadge')}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-soft)]">
                      {t('onboarding.plan.bestValue')}
                    </p>
                  </div>
                </div>
                <div className="text-right leading-tight">
                  <p className="text-base font-semibold text-[var(--text-main)]">
                    {formatPlanPrice(yearlyPriceLabel)}
                  </p>
                  <p className="text-xs text-[var(--text-soft)]">
                    {t('onboarding.plan.perYear')}
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="px-5 pb-2">
            <button
              type="button"
              onClick={() => void handleRestore()}
              disabled={blockInteraction || !isNativePurchaseAvailable() || !isAvailable}
              className="text-center text-sm font-medium text-[#05afc5] underline-offset-2 enabled:hover:underline disabled:cursor-not-allowed disabled:opacity-45"
            >
              {t('upgrade.buttons.restorePurchasesLink')}
            </button>
          </div>

          <div className="px-5 pb-4">
            <button
              type="button"
              onClick={() => void handleContinue()}
              disabled={!selectedPlan || blockInteraction || paidNeedsOfferings}
              className="w-full rounded-xl bg-[#05afc5] px-4 py-3 text-sm font-semibold text-white transition-colors enabled:hover:bg-[#049cb1] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {continueLabel()}
            </button>
          </div>

          <div className="border-t border-[var(--border-subtle)] px-5 py-3">
            <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-soft)]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#2b7fff]" />
                <span>{t('onboarding.plan.secureCheckout')}</span>
              </div>
              <span className="h-4 w-px bg-[var(--border-subtle)]" aria-hidden />
              <div className="flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4 text-[#2b7fff]" />
                <span>{t('onboarding.plan.cancelAnytime')}</span>
              </div>
            </div>
          </div>

          {offeringsWarning && isNativePurchaseAvailable() ? (
            <p className="px-5 pb-2 text-xs text-amber-700 dark:text-amber-300/90">{offeringsWarning}</p>
          ) : null}
          {error ? <p className="px-5 pb-2 text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}
          {infoMessage ? (
            <p className="px-5 pb-2 text-xs text-slate-600 dark:text-[var(--text-soft)]">{infoMessage}</p>
          ) : null}
        </div>
      </div>
    </main>
  )
}

