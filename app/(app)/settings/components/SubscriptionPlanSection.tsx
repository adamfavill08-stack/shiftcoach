'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useSettings } from '@/lib/hooks/useSettings'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/components/providers/language-provider'

type SubscriptionPlanSectionProps = {
  /** Inline card on profile “Account & billing” tab (no accordion overlay). */
  embedInline?: boolean
}

export function SubscriptionPlanSection({ embedInline = false }: SubscriptionPlanSectionProps) {
  const { t } = useTranslation()
  const { settings, loading } = useSettings()
  const [isOpen, setIsOpen] = useState(false)
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [isCanceling, setIsCanceling] = useState(false)
  const [testerAccount, setTesterAccount] = useState(false)
  const [subscriptionPlatform, setSubscriptionPlatform] = useState<string | null>(null)

  useEffect(() => {
    if (!settings?.user_id) return

    const loadSubscription = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_status, trial_ends_at, subscription_platform')
        .eq('user_id', settings.user_id)
        .maybeSingle()

      if (profile) {
        setSubscriptionPlan(profile.subscription_plan || null)
        setSubscriptionStatus(profile.subscription_status || null)
        setTrialEndsAt(profile.trial_ends_at || null)
        setTesterAccount(profile.subscription_plan === 'tester')
        setSubscriptionPlatform(profile.subscription_platform || null)
      }
    }

    loadSubscription()
  }, [settings?.user_id])

  const getPlanLabel = (plan: string | null) => {
    if (!plan) return t('settings.subscription.plan.free')
    if (plan === 'tester') return t('settings.subscription.plan.tester')
    if (plan === 'free') return t('settings.subscription.plan.free')
    if (plan === 'monthly') return t('settings.subscription.plan.monthly')
    if (plan === 'yearly') return t('settings.subscription.plan.yearly')
    return plan
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return null
    if (status === 'active' || status === 'trialing') {
      return (
        <span className="text-xs px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-medium">
          {t('settings.subscription.status.active')}
        </span>
      )
    }
    if (status === 'canceled') {
      return (
        <span className="text-xs px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-medium">
          {t('settings.subscription.status.canceled')}
        </span>
      )
    }
    return (
      <span className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-medium">
        {status}
      </span>
    )
  }

  const getTrialLabel = () => {
    if (testerAccount) return t('settings.subscription.trial.testerNoBilling')
    if (subscriptionStatus !== 'trialing') return null
    if (!trialEndsAt) return null

    const end = new Date(trialEndsAt)
    const now = new Date()
    if (isNaN(end.getTime())) return null

    const diffMs = end.getTime() - now.getTime()
    if (diffMs <= 0) return t('settings.subscription.trial.ended')

    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (daysLeft === 1) return t('settings.subscription.trial.oneDayLeft')
    return t('settings.subscription.trial.daysLeft', { days: daysLeft })
  }

  const handleCancelSubscription = async () => {
    try {
      setIsCanceling(true)
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
      })
      if (!res.ok) {
        console.error('[SubscriptionPlanSection] Cancel failed', res.status)
        return
      }
      const json = await res.json()
      console.log('[SubscriptionPlanSection] Cancel response', json)

      if (json.platform && json.message) {
        alert(json.message)
      }

      setSubscriptionStatus('canceled')
    } catch (err) {
      console.error('[SubscriptionPlanSection] Cancel error', err)
    } finally {
      setIsCanceling(false)
    }
  }

  const getPlatformLabel = () => {
    if (!subscriptionPlatform) return null
    if (subscriptionPlatform === 'revenuecat_ios') return t('settings.subscription.platform.appStore')
    if (subscriptionPlatform === 'revenuecat_android') return t('settings.subscription.platform.playStore')
    return subscriptionPlatform
  }

  const getCancelInstructions = () => {
    if (!subscriptionPlatform) return null

    if (subscriptionPlatform === 'revenuecat_ios') {
      return t('settings.subscription.cancelIos')
    }

    if (subscriptionPlatform === 'revenuecat_android') {
      return t('settings.subscription.cancelAndroid')
    }

    return null
  }

  const platformLabel = getPlatformLabel()

  const subscriptionDetails = (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 py-1">
          <Image
            src="/subscription-plan-app-icon.png"
            alt={t('settings.subscription.currentPlan')}
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-[10px] shadow-[0_1px_2px_rgba(15,23,42,0.12)]"
            sizes="40px"
          />
          <div className="flex min-w-0 flex-shrink-0 items-center gap-2">
            {subscriptionStatus && !testerAccount && getStatusBadge(subscriptionStatus)}
            <span className="text-sm font-medium text-slate-900">
              {testerAccount ? t('settings.subscription.plan.tester') : getPlanLabel(subscriptionPlan)}
            </span>
          </div>
        </div>
        {platformLabel && !testerAccount && (
          <p className="text-xs text-slate-500">{t('settings.subscription.billedVia', { platform: platformLabel })}</p>
        )}
        {getTrialLabel() && !testerAccount && (
          <p className="text-xs text-slate-500">{getTrialLabel()}</p>
        )}
      </div>

      {!testerAccount && subscriptionPlan && subscriptionPlatform?.startsWith('revenuecat_') && (
        <p className="text-xs text-slate-500 leading-relaxed">{t('settings.subscription.changePlanHint')}</p>
      )}

      {testerAccount ? (
        <p className="text-xs text-slate-500 leading-relaxed">{t('settings.subscription.testerFullAccess')}</p>
      ) : subscriptionPlan ? (
        <div className="space-y-2">
          {subscriptionPlatform?.startsWith('revenuecat_') ? (
            <>
              <div className="rounded-xl border border-amber-200/50 bg-amber-50/50 px-4 py-3">
                <p className="mb-1.5 text-xs font-medium leading-relaxed text-amber-800">
                  {platformLabel ? t('settings.subscription.cancelVia', { platform: platformLabel }) : null}
                </p>
                <p className="text-xs leading-relaxed text-amber-700">{getCancelInstructions()}</p>
              </div>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={isCanceling}
                className="w-full rounded-xl border border-slate-200/80 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCanceling ? t('settings.subscription.processing') : t('settings.subscription.markCanceled')}
              </button>
              <p className="text-xs leading-relaxed text-slate-500">
                {platformLabel ? t('settings.subscription.markCanceledNote', { platform: platformLabel }) : null}
              </p>
            </>
          ) : (
            <p className="text-xs leading-relaxed text-slate-500">{t('settings.subscription.manageInStore')}</p>
          )}
        </div>
      ) : null}
    </div>
  )

  if (loading) {
    if (embedInline) {
      return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="animate-pulse text-xs text-slate-500">{t('settings.subscription.loading')}</div>
        </div>
      )
    }
    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        <div className="px-5 py-4">
          <div className="animate-pulse text-xs text-slate-500">{t('settings.subscription.loading')}</div>
        </div>
      </div>
    )
  }

  if (embedInline) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        {subscriptionDetails}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-colors hover:border-sky-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)]"
      >
        <div className="flex flex-1 items-center gap-3">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-sky-500 shadow-sm">
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1 text-left">
            <h3 className="text-sm font-medium text-slate-900">{t('settings.subscription.sectionTitle')}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {testerAccount ? t('settings.subscription.plan.tester') : getPlanLabel(subscriptionPlan)}
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-300 transition group-hover:text-sky-400" strokeWidth={2} />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition group-hover:text-sky-400" strokeWidth={2} />
        )}
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-20 mx-2 mt-2 rounded-2xl border border-slate-200/50 bg-white/95 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-slate-700/40 dark:bg-slate-800/70 dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          {subscriptionDetails}
        </div>
      )}
    </div>
  )
}
