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

    setShowContent(true)

    if (!user) {
      const timer = setTimeout(() => {
        router.replace('/auth/welcome')
      }, 900)
      return () => clearTimeout(timer)
    }

    const timer = setTimeout(async () => {
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
    }, 4000)

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
          src="/logo.svg"
          alt={t('splash.logoAlt')}
          width={280}
          height={140}
          className="h-20 w-auto max-w-[min(280px,85vw)] object-contain dark:invert"
          priority
          unoptimized
        />
      </div>
    </div>
  )
}

