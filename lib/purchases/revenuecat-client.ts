'use client'

import { Capacitor } from '@capacitor/core'
import { Purchases } from '@revenuecat/purchases-capacitor'

let isConfigured = false
let configuredAppUserId: string | null = null

/** Align with RevenueCat webhooks / REST (`shiftcoach_{supabaseUserId}`). */
export function toRevenueCatAppUserId(supabaseUserId: string | null | undefined): string | null {
  if (!supabaseUserId) return null
  if (supabaseUserId.startsWith('shiftcoach_')) return supabaseUserId
  return `shiftcoach_${supabaseUserId}`
}

function getRevenueCatApiKey(platform: 'ios' | 'android'): string | null {
  if (platform === 'ios') {
    return process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY ?? null
  }
  return process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? null
}

/** Public SDK keys only — never ship RevenueCat secret keys (sk_) in client bundles. */
function warnIfPublicSdkKeyLooksWrong(platform: 'ios' | 'android', key: string): void {
  const trimmed = key.trim()
  if (trimmed.startsWith('sk_')) {
    console.error(
      '[revenuecat-client] Invalid: secret API key detected. Use the platform public SDK key from RevenueCat only.',
    )
    return
  }
  if (platform === 'android' && !trimmed.startsWith('goog_')) {
    console.warn(
      '[revenuecat-client] Android: expected public SDK key (goog_…). Wrong key causes offerings / billing errors.',
    )
  }
  if (platform === 'ios' && !trimmed.startsWith('appl_')) {
    console.warn('[revenuecat-client] iOS: expected public SDK key (appl_…).')
  }
}

export function getNativePlatform(): 'ios' | 'android' | 'web' {
  const platform = Capacitor.getPlatform()
  if (platform === 'ios') return 'ios'
  if (platform === 'android') return 'android'
  return 'web'
}

export async function ensureRevenueCatConfigured(appUserId?: string | null): Promise<boolean> {
  const platform = getNativePlatform()
  if (platform === 'web') return false

  const apiKey = getRevenueCatApiKey(platform)
  if (!apiKey) {
    throw new Error(
      platform === 'ios'
        ? 'Missing NEXT_PUBLIC_REVENUECAT_IOS_API_KEY'
        : 'Missing NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY',
    )
  }

  warnIfPublicSdkKeyLooksWrong(platform, apiKey)

  const rcAppUserId = toRevenueCatAppUserId(appUserId ?? null)

  if (!isConfigured) {
    await Purchases.configure({
      apiKey,
      appUserID: rcAppUserId,
    })
    isConfigured = true
    configuredAppUserId = rcAppUserId
    return true
  }

  if (rcAppUserId && configuredAppUserId !== rcAppUserId) {
    await Purchases.logIn({ appUserID: rcAppUserId })
    configuredAppUserId = rcAppUserId
  }

  return true
}
