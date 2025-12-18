'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import SplashPage from '@/app/splash/page'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  // Auto-redirect signed-in users to dashboard (bypass splash)
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
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
