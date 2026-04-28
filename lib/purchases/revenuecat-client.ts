'use client'

import { Capacitor } from '@capacitor/core'
import { Purchases } from '@revenuecat/purchases-capacitor'

let isConfigured = false
let configuredAppUserId: string | null = null

function getRevenueCatApiKey(platform: 'ios' | 'android'): string | null {
  if (platform === 'ios') {
    return process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY ?? null
  }
  return process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? null
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

  if (!isConfigured) {
    await Purchases.configure({
      apiKey,
      appUserID: appUserId ?? null,
    })
    isConfigured = true
    configuredAppUserId = appUserId ?? null
    return true
  }

  if (appUserId && configuredAppUserId !== appUserId) {
    await Purchases.logIn({ appUserID: appUserId })
    configuredAppUserId = appUserId
  }

  return true
}
