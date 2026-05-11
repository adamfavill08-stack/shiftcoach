'use client'

import { useCallback, useEffect, useState } from 'react'
import { deriveSubscriptionAccess, type SubscriptionPlan } from '@/lib/subscription/access'
import { createClientComponentClient } from '@/lib/supabase'

type SubscriptionAccessState = {
  isLoading: boolean
  isPro: boolean
  plan: SubscriptionPlan
  isActive: boolean
}

const DEV_OVERRIDE_USER_IDS = new Set(['333dd216-62fb-49a0-916e-304b84673310'])
const DEV_OVERRIDE_EMAILS = new Set(['adam.favill@outlook.com'])

export function useSubscriptionAccess(): SubscriptionAccessState {
  const supabase = createClientComponentClient()
  const [state, setState] = useState<SubscriptionAccessState>({
    isLoading: true,
    isPro: false,
    plan: 'free',
    isActive: false,
  })

  const load = useCallback(async () => {
    /**
     * Local dev: keep Pro UI unlocked so localhost is not tied to DB `created_at` + 7d grace.
     * Set `NEXT_PUBLIC_STRICT_SUBSCRIPTION=1` in `.env.local` to test paywalls / free tier locally.
     */
    const strictSubscription = process.env.NEXT_PUBLIC_STRICT_SUBSCRIPTION === '1'
    const isDevBuild = process.env.NODE_ENV === 'development'
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    if (!strictSubscription && (isDevBuild || isLocalhost)) {
      setState({ isLoading: false, isPro: true, plan: 'tester', isActive: true })
      return
    }

    const loadFromServerAccess = async (): Promise<boolean> => {
      const accessRes = await fetch('/api/subscription/access', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!accessRes.ok) return false
      const accessJson = await accessRes.json()
      setState({
        isLoading: false,
        isPro: Boolean(accessJson?.isPro),
        plan: (typeof accessJson?.plan === 'string' ? accessJson.plan : 'free') as SubscriptionPlan,
        isActive: Boolean(accessJson?.isActive),
      })
      return true
    }

    const loadFromProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.id) {
        setState({ isLoading: false, isPro: false, plan: 'free', isActive: false })
        return
      }
      const userEmail = user.email?.toLowerCase() ?? null
      if (DEV_OVERRIDE_USER_IDS.has(user.id) || (userEmail && DEV_OVERRIDE_EMAILS.has(userEmail))) {
        setState({ isLoading: false, isPro: true, plan: 'tester', isActive: true })
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select(
          'subscription_plan, subscription_status, trial_ends_at, created_at, revenuecat_entitlements, revenuecat_subscription_id',
        )
        .eq('user_id', user.id)
        .maybeSingle()
      const access = deriveSubscriptionAccess({
        subscriptionStatus: profile?.subscription_status ?? null,
        subscriptionPlan: profile?.subscription_plan ?? null,
        trialEndsAt: profile?.trial_ends_at ?? null,
        profileCreatedAt: profile?.created_at ?? null,
        revenuecatEntitlements: profile?.revenuecat_entitlements ?? null,
        revenuecatSubscriptionId: profile?.revenuecat_subscription_id ?? null,
      })
      setState({
        isLoading: false,
        isPro: access.isPro,
        plan: access.plan,
        isActive: access.isPro,
      })
    }

    try {
      // Primary source: server-derived access from authenticated profile row.
      if (await loadFromServerAccess()) return

      const res = await fetch('/api/revenuecat/status', { cache: 'no-store', credentials: 'include' })
      if (!res.ok) {
        await loadFromProfile()
        return
      }
      const json = await res.json()
      // Route merges app-managed trial + RevenueCat; do not re-derive without trial_ends_at.
      const isPro = Boolean(json?.isActive)
      setState({
        isLoading: false,
        isPro,
        plan: (typeof json?.plan === 'string' ? json.plan : 'free') as SubscriptionPlan,
        isActive: isPro,
      })
    } catch {
      await loadFromProfile()
    }
  }, [supabase])

  useEffect(() => {
    load()
    const onUpdate = () => void load()
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        void load()
      }
    })
    window.addEventListener('subscription-updated', onUpdate)
    return () => {
      window.removeEventListener('subscription-updated', onUpdate)
      authSubscription.unsubscribe()
    }
  }, [load, supabase])

  return state
}
