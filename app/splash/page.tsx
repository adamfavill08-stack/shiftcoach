'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/components/AuthProvider'
import { useTranslation } from '@/components/providers/language-provider'

export default function SplashPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { user, loading } = useAuth()

  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  useEffect(() => {
    if (loading) return

    // Trigger entrance animation
    setShowContent(true)

    const timer = setTimeout(async () => {
      // After splash, route based on auth + subscription status
      if (user) {
        try {
          const { checkSubscriptionStatus } = await import('@/lib/subscription/checkSubscription')
          const result = await checkSubscriptionStatus()
          if (!result.hasAccess) {
            router.replace('/select-plan')
          } else {
            router.replace('/dashboard')
          }
        } catch (err) {
          console.error('[splash] Subscription check failed, sending to dashboard as fallback', err)
          router.replace('/dashboard')
        }
      } else {
        router.replace('/auth/sign-in')
      }
    }, 4000) // 4 seconds

    return () => clearTimeout(timer)
  }, [user, loading, router])

  return (
    <div className="flex h-[100dvh] min-h-0 w-full max-h-[100dvh] items-center justify-center overflow-hidden bg-[var(--bg)] px-4">
      <div
        className={`flex justify-center transform transition-all duration-500 ease-out ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
      >
        <Image
          src="/scpremium-logo.svg"
          alt={t('splash.logoAlt')}
          width={200}
          height={80}
          className="h-20 w-auto dark:brightness-0 dark:invert"
          priority
        />
      </div>
    </div>
  )
}

