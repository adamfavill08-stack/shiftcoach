'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useSettings } from '@/lib/hooks/useSettings'
import { supabase } from '@/lib/supabase'

export function SubscriptionPlanSection() {
  const router = useRouter()
  const { settings, loading } = useSettings()
  const [isOpen, setIsOpen] = useState(false)
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [isCanceling, setIsCanceling] = useState(false)
  const [testerAccount, setTesterAccount] = useState(false)

  useEffect(() => {
    if (!settings?.user_id) return
    
    const loadSubscription = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_status, trial_ends_at')
        .eq('user_id', settings.user_id)
        .single()
      
      if (profile) {
        setSubscriptionPlan(profile.subscription_plan || null)
        setSubscriptionStatus(profile.subscription_status || null)
        setTrialEndsAt(profile.trial_ends_at || null)
        setTesterAccount(profile.subscription_plan === 'tester')
      }
    }
    
    loadSubscription()
  }, [settings?.user_id])

  const getPlanLabel = (plan: string | null) => {
    if (!plan) return 'No plan selected'
    if (plan === 'tester') return 'Tester account'
    if (plan === 'monthly') return 'Monthly subscription'
    if (plan === 'yearly') return 'Yearly subscription'
    return plan
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return null
    if (status === 'active' || status === 'trialing') {
      return (
        <span className="text-xs px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-medium">
          Active
        </span>
      )
    }
    if (status === 'canceled') {
      return (
        <span className="text-xs px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-medium">
          Canceled
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
    if (testerAccount) return 'Tester account – no billing.'
    if (!trialEndsAt) return null

    const end = new Date(trialEndsAt)
    const now = new Date()
    if (isNaN(end.getTime())) return null

    const diffMs = end.getTime() - now.getTime()
    if (diffMs <= 0) return 'Free trial ended.'

    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (daysLeft === 1) return 'On 7‑day free trial – 1 day left.'
    return `On 7‑day free trial – ${daysLeft} days left.`
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
      // Optimistically reflect cancellation in UI
      setSubscriptionStatus('canceled')
    } catch (err) {
      console.error('[SubscriptionPlanSection] Cancel error', err)
    } finally {
      setIsCanceling(false)
    }
  }

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/90 dark:from-slate-900/50 to-white/70 dark:to-slate-900/40 backdrop-blur-sm border border-white/90 dark:border-slate-700/40 shadow-[0_4px_12px_rgba(15,23,42,0.04)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
        <div className="px-5 py-4">
          <div className="animate-pulse text-xs text-slate-500 dark:text-slate-400">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-slate-50/40 dark:bg-slate-800/30 hover:bg-white/70 dark:hover:bg-slate-800/50 transition-colors w-full"
      >
      <div className="flex items-center gap-3 flex-1">
        <div className="h-9 w-9 rounded-xl bg-white/60 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/40 grid place-items-center flex-shrink-0">
          <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">Subscription Plan</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {testerAccount ? 'Tester account' : getPlanLabel(subscriptionPlan)}
          </p>
        </div>
      </div>
      {isOpen ? (
        <ChevronDown className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 transition flex-shrink-0" strokeWidth={2} />
      ) : (
        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 transition flex-shrink-0" strokeWidth={2} />
      )}
    </button>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 mx-2 rounded-2xl bg-white/95 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] p-4 space-y-3 z-20">
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Current plan</span>
              <div className="flex items-center gap-2">
                {subscriptionStatus && !testerAccount && getStatusBadge(subscriptionStatus)}
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {testerAccount ? 'Tester account' : getPlanLabel(subscriptionPlan)}
                </span>
              </div>
            </div>
            {getTrialLabel() && !testerAccount && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {getTrialLabel()}
              </p>
            )}
          </div>

          {!testerAccount && (
            <button
              onClick={() => router.push('/select-plan')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors group"
            >
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {subscriptionPlan ? 'Change plan' : 'Select plan'}
              </span>
              <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 transition" strokeWidth={2} />
            </button>
          )}

          {/* Cancel subscription / tester label */}
          {testerAccount ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tester account – you have full access while you are in the test programme. No billing is active.
            </p>
          ) : subscriptionPlan ? (
            <div className="space-y-1">
              <button
                onClick={handleCancelSubscription}
                disabled={isCanceling}
                className="w-full rounded-xl border border-slate-200/50 dark:border-slate-700/40 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isCanceling ? 'Canceling…' : 'Cancel subscription'}
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Your access will stay active until the end of your current paid period.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

