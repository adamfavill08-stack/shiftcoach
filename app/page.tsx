'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import SplashPage from '@/app/splash/page'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  // Auto-redirect signed-in users (check subscription status first)
  useEffect(() => {
    if (!loading && user) {
      const checkSubscription = async () => {
        const { checkSubscriptionStatus } = await import('@/lib/subscription/checkSubscription')
        const result = await checkSubscriptionStatus()
        
        // If no access (no plan, expired, canceled), redirect to Select Plan
        if (!result.hasAccess) {
          router.replace('/select-plan')
          return
        }
        
        // Otherwise go to dashboard
        router.replace('/dashboard')
      }
      checkSubscription()
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
