'use client'

import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { completeAuthFromDeepLink } from '@/lib/auth/completeAuthFromDeepLink'
import { isMobileAuthCallbackUrl } from '@/lib/auth/mobileAuthDeepLink'

export function MobileAuthDeepLinkListener() {
  const router = useRouter()
  const pendingUrls = useRef(new Set<string>())

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let remove: (() => void) | undefined

    const handleUrl = (url: string) => {
      if (!isMobileAuthCallbackUrl(url)) return
      if (pendingUrls.current.has(url)) return
      pendingUrls.current.add(url)
      void (async () => {
        try {
          const result = await completeAuthFromDeepLink(url)
          router.replace(result.navigate)
        } finally {
          pendingUrls.current.delete(url)
        }
      })()
    }

    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) handleUrl(launch.url)
    })

    void App.addListener('appUrlOpen', ({ url }) => {
      handleUrl(url)
    }).then((handle) => {
      remove = () => handle.remove()
    })

    return () => {
      remove?.()
    }
  }, [router])

  return null
}
