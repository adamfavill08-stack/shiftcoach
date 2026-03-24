/**
 * Native Purchase Service
 * Handles platform detection and provides unified interface for native purchases
 * 
 * For iOS: Uses StoreKit via Capacitor plugin
 * For Android: Uses Google Play Billing via Capacitor plugin
 * For Web: Native purchases are unavailable
 */

import { Capacitor } from '@capacitor/core'

export type PurchasePlatform = 'ios' | 'android' | 'web'

export interface PurchaseProduct {
  id: string
  price: string
  currency: string
  title: string
  description: string
}

export interface PurchaseResult {
  success: boolean
  transactionId?: string
  receipt?: string
  productId?: string
  error?: string
}

/**
 * Detect the current platform
 */
export function getPurchasePlatform(): PurchasePlatform {
  const platform = Capacitor.getPlatform()
  
  if (platform === 'ios') return 'ios'
  if (platform === 'android') return 'android'
  return 'web'
}

/**
 * Check if native purchases are available
 */
export function isNativePurchaseAvailable(): boolean {
  const platform = getPurchasePlatform()
  return platform === 'ios' || platform === 'android'
}

/**
 * Get available products for purchase
 * 
 * Note: This will need to be implemented with the actual Capacitor plugin
 * For now, returns empty array - will be implemented when plugin is installed
 */
export async function getAvailableProducts(): Promise<PurchaseProduct[]> {
  const platform = getPurchasePlatform()
  
  if (platform === 'web') {
    // Web does not support native purchases in this app
    return []
  }
  
  // TODO: Implement with Capacitor in-app purchases plugin
  // This will call the native StoreKit/Play Billing APIs
  console.warn('[native-purchases] Native purchase plugin not yet installed')
  return []
}

/**
 * Purchase a product
 * 
 * @param productId - The product identifier (e.g., 'shiftcoach_monthly')
 * @returns Purchase result with receipt/transaction ID
 */
export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  const platform = getPurchasePlatform()
  
  if (platform === 'web') {
    return {
      success: false,
      error: 'Native purchases not available on web.'
    }
  }
  
  // TODO: Implement with Capacitor in-app purchases plugin
  // This will:
  // 1. Call native purchase API (StoreKit/Play Billing)
  // 2. Return receipt/transaction ID
  // 3. Frontend will send receipt to backend for validation
  
  console.warn('[native-purchases] Native purchase plugin not yet installed')
  return {
    success: false,
    error: 'Native purchase plugin not yet implemented'
  }
}

/**
 * Restore previous purchases
 * Useful for users who reinstalled the app or switched devices
 */
export async function restorePurchases(): Promise<PurchaseResult[]> {
  const platform = getPurchasePlatform()
  
  if (platform === 'web') {
    return []
  }
  
  // TODO: Implement with Capacitor in-app purchases plugin
  // This will restore previous purchases from the store
  
  console.warn('[native-purchases] Native purchase plugin not yet installed')
  return []
}

/**
 * Get current subscription status
 * 
 * Note: This should query RevenueCat API via backend, not native stores
 * Native stores only provide purchase receipts, not subscription status
 */
export async function getSubscriptionStatus(): Promise<{
  isActive: boolean
  productId?: string
  expiresAt?: string
}> {
  // This should be handled by backend API that queries RevenueCat
  // Native stores don't provide subscription status directly
  return {
    isActive: false
  }
}
