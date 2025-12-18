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
        <span className="text-xs px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-medium">
          Active
        </span>
      )
    }
    if (status === 'canceled') {
      return (
        <span className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-700 font-medium">
          Canceled
        </span>
      )
    }
    return (
      <span className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
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
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-white/90 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
        <div className="px-5 py-4">
          <div className="animate-pulse text-xs text-slate-500">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-white/90 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-transparent to-transparent" />
      <div className="relative z-10">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-white/50 transition-all"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 border border-purple-200/60 shadow-sm">
              <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-[12px] font-semibold text-slate-900 leading-snug">Subscription Plan</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {testerAccount ? 'Tester account' : getPlanLabel(subscriptionPlan)}
              </p>
            </div>
          </div>
          {isOpen ? (
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-purple-500 transition-colors" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-purple-500 transition-colors" />
          )}
        </button>
        {isOpen && (
          <div className="px-5 pb-4 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium text-slate-900">Current plan</span>
                <div className="flex items-center gap-2">
                  {subscriptionStatus && !testerAccount && getStatusBadge(subscriptionStatus)}
                  <span className="text-sm font-semibold text-slate-900">
                    {testerAccount ? 'Tester account' : getPlanLabel(subscriptionPlan)}
                  </span>
                </div>
              </div>
              {getTrialLabel() && !testerAccount && (
                <p className="text-xs text-slate-500">
                  {getTrialLabel()}
                </p>
              )}
            </div>

            {!testerAccount && (
              <button
                onClick={() => router.push('/select-plan')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/60 hover:from-purple-100 hover:to-indigo-100 transition-all group"
              >
                <span className="text-sm font-semibold text-slate-900">
                  {subscriptionPlan ? 'Change plan' : 'Select plan'}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
              </button>
            )}

            {/* Cancel subscription / tester label */}
            {testerAccount ? (
              <p className="text-xs text-slate-500 leading-relaxed">
                Tester account – you have full access while you are in the test programme. No billing is active.
              </p>
            ) : subscriptionPlan ? (
              <div className="space-y-1">
                <button
                  onClick={handleCancelSubscription}
                  disabled={isCanceling}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {isCanceling ? 'Canceling…' : 'Cancel subscription'}
                </button>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Your access will stay active until the end of your current paid period.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

