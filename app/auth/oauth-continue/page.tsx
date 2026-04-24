'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/components/providers/language-provider'

export default function OAuthContinuePage() {
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => {
    let cancelled = false

    async function routeAfterOAuth() {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()
      if (cancelled) return
      if (userErr || !user) {
        router.replace(
          `/auth/sign-in?error=${encodeURIComponent(t('auth.oauth.errorSession'))}`
        )
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, height_cm, weight_kg')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cancelled) return

      const isComplete =
        profile != null &&
        Boolean(profile.name) &&
        profile.height_cm != null &&
        profile.weight_kg != null

      router.replace(isComplete ? '/dashboard' : '/onboarding')
    }

    void routeAfterOAuth()
    return () => {
      cancelled = true
    }
  }, [router, t])

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-6 py-12">
      <p className="text-sm text-slate-600">{t('auth.oauth.continuing')}</p>
    </main>
  )
}
