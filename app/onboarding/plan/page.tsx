'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ShieldCheck, RefreshCw } from 'lucide-react'
import { useNativePurchases } from '@/lib/hooks/useNativePurchases'

type PlanSelection = 'free' | 'monthly' | 'yearly'

export default function OnboardingPlanPage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<PlanSelection | null>('yearly')
  const [saving, setSaving] = useState<PlanSelection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const {
    getPlanPriceLabel,
    storePriceLabelsLoading,
    isAvailable,
    isPurchasing,
    purchaseSubscription,
  } = useNativePurchases()
  const monthlyPriceLabel = storePriceLabelsLoading ? null : getPlanPriceLabel('monthly')
  const yearlyPriceLabel = storePriceLabelsLoading ? null : getPlanPriceLabel('yearly')
  const formatPlanPrice = (label: string | null) => {
    if (storePriceLabelsLoading) return '…'
    return label?.trim() ? label : '—'
  }

  const handleSelect = async (selection: PlanSelection) => {
    setSaving(selection)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selection }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        throw new Error(json.error || 'Unable to save plan selection')
      }

      if (selection === 'free') {
        window.dispatchEvent(new CustomEvent('subscription-updated'))
        setSaving(null)
        router.push('/welcome')
        return
      }

      if (!isAvailable) {
        router.push(`/upgrade?from=onboarding&plan=${selection}&returnTo=/welcome`)
        setSaving(null)
        return
      }

      const plan = selection === 'monthly' ? 'monthly' : 'yearly'
      const result = await purchaseSubscription(plan)
      if (result.success) {
        setSaving(null)
        router.push('/welcome')
        return
      }

      setError(result.error || 'Purchase did not complete.')
      setSaving(null)
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.')
      setSaving(null)
    }
  }

  const isBusy = saving !== null || isPurchasing

  const handleContinue = async () => {
    if (!selectedPlan || isBusy) return
    await handleSelect(selectedPlan)
  }

  return (
    <main className="min-h-screen px-4 pt-2 pb-20 bg-[#f3f1ed] dark:bg-[var(--bg)]">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-16 flex flex-col items-center px-2 pt-6 text-center">
          <Image
            src="/onboarding-plan-app-icon.png"
            alt=""
            width={160}
            height={160}
            className="h-40 w-40 rounded-3xl object-cover shadow-[0_14px_44px_-10px_rgba(5,175,197,0.42)]"
            priority
            unoptimized
          />
          <h1 className="mt-6 text-xl font-semibold tracking-tight text-slate-900 dark:text-[var(--text-main)]">
            Select your plan
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-snug text-slate-600 dark:text-[var(--text-soft)]">
            Choose one option to continue
          </p>
        </div>
        <div className="relative z-10 -mx-3 overflow-hidden rounded-2xl bg-[var(--card)] shadow-[0_18px_45px_-24px_rgba(15,23,42,0.35)]">
          <div className="space-y-3 px-5 py-5">
            <button
              type="button"
              onClick={() => setSelectedPlan('free')}
              disabled={isBusy}
              className={`group relative w-full overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-all disabled:opacity-60 ${
                selectedPlan === 'free'
                  ? 'border-[#05afc5]/60 bg-[#e9f7fa] dark:bg-[#05afc5]/12'
                  : 'border-[var(--border-subtle)] bg-[var(--card-subtle)] enabled:hover:border-[#05afc5]/45 enabled:hover:bg-[var(--card)]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                      selectedPlan === 'free' ? 'border-[#2b7fff] bg-white/90' : 'border-[var(--border-subtle)] bg-transparent'
                    }`}
                    aria-hidden
                  >
                    {selectedPlan === 'free' ? <span className="h-2.5 w-2.5 rounded-full bg-[#2b7fff]" /> : null}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[var(--text-main)]">Free</p>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-soft)]">
                      Limited features, Upgrade to Pro for full access
                    </p>
                  </div>
                </div>
                <p className="shrink-0 text-base font-semibold leading-none text-black dark:text-[var(--text-main)]">Free</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlan('monthly')}
              disabled={isBusy}
              className={`group relative w-full overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-all disabled:opacity-60 ${
                selectedPlan === 'monthly'
                  ? 'border-[#05afc5]/60 bg-[#e9f7fa] dark:bg-[#05afc5]/12'
                  : 'border-[var(--border-subtle)] bg-[var(--card-subtle)] enabled:hover:border-[#05afc5]/45 enabled:hover:bg-[var(--card)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                      selectedPlan === 'monthly' ? 'border-[#2b7fff] bg-white/90' : 'border-[var(--border-subtle)] bg-transparent'
                    }`}
                    aria-hidden
                  >
                    {selectedPlan === 'monthly' ? <span className="h-2.5 w-2.5 rounded-full bg-[#2b7fff]" /> : null}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[var(--text-main)]">Monthly Pro</p>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-soft)]">Full pro access</p>
                  </div>
                </div>
                <div className="shrink-0 text-right leading-tight">
                  <p className="text-base font-semibold text-black dark:text-[var(--text-main)]">
                    {formatPlanPrice(monthlyPriceLabel)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-[var(--text-soft)]">Per month</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPlan('yearly')}
              disabled={isBusy}
              className={`group relative w-full overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-all disabled:opacity-60 ${
                selectedPlan === 'yearly'
                  ? 'border-[#05afc5]/60 bg-[#e9f7fa] shadow-[0_3px_12px_-8px_rgba(5,175,197,0.65)] dark:bg-[#05afc5]/12 dark:border-[#05afc5]/70'
                  : 'border-[var(--border-subtle)] bg-[var(--card-subtle)] enabled:hover:border-[#05afc5]/45 enabled:hover:bg-[var(--card)]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full border-2 ${
                      selectedPlan === 'yearly' ? 'border-[#2b7fff] bg-white/90' : 'border-[var(--border-subtle)] bg-transparent'
                    }`}
                    aria-hidden
                  >
                    {selectedPlan === 'yearly' ? <span className="h-3 w-3 rounded-full bg-[#2b7fff]" /> : null}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[15px] font-semibold text-slate-800 dark:text-[var(--text-main)]">Annual Pro</p>
                      <span className="ml-8 mt-1 rounded-full border border-[#8cc8ff] bg-[#ebf6ff] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#2b7fff] dark:border-[#63b6ff]/65 dark:bg-[#2b7fff]/20 dark:text-[#8fd0ff]">
                        Save 35%
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-[var(--text-soft)]">Best value</p>
                  </div>
                </div>
                <div className="text-right leading-tight">
                  <p className="text-base font-semibold text-slate-800 dark:text-[var(--text-main)]">
                    {formatPlanPrice(yearlyPriceLabel)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-[var(--text-soft)]">Per year</p>
                </div>
              </div>
            </button>
          </div>

          <div className="px-5 pb-4">
            <button
              type="button"
              onClick={() => void handleContinue()}
              disabled={!selectedPlan || isBusy}
              className="w-full rounded-xl bg-[#05afc5] px-4 py-3 text-sm font-semibold text-white transition-colors enabled:hover:bg-[#049cb1] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isBusy ? 'Please wait...' : 'Continue'}
            </button>
          </div>

          <div className="border-t border-[var(--border-subtle)] px-5 py-3">
            <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-soft)]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#2b7fff]" />
                <span>Secure checkout</span>
              </div>
              <span className="h-4 w-px bg-[var(--border-subtle)]" aria-hidden />
              <div className="flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4 text-[#2b7fff]" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {error ? (
            <p className="px-5 pb-3 text-xs text-rose-500">{error}</p>
          ) : null}
          {isBusy ? (
            <p className="px-5 pb-5 text-xs text-[var(--text-soft)]">
              {saving === 'free'
                ? 'Saving your plan...'
                : isPurchasing
                  ? 'Complete your purchase in the store…'
                  : 'Preparing checkout…'}
            </p>
          ) : null}
        </div>

      </div>
    </main>
  )
}

