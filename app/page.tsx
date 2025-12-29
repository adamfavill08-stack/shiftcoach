'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import SplashPage from '@/app/splash/page'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  // Auto-redirect signed-in users (check subscription plan first)
  useEffect(() => {
    if (!loading && user) {
      const checkSubscriptionPlan = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('user_id', user.id)
          .single()
        
        // If no plan selected yet, redirect to Select Plan
        if (!profile?.subscription_plan) {
          router.replace('/select-plan')
          return
        }
        
        // Otherwise go to dashboard
        router.replace('/dashboard')
      }
      checkSubscriptionPlan()
    }
  }, [user, loading, router])

  // Show nothing while checking auth
  if (loading) {
    return null
  }

  // Show splash for non-signed-in users
  if (!user) {
    return <SplashPage />
  }

  return null
}
