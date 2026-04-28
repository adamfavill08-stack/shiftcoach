/**
 * Native Purchase Service
 * Handles platform detection and provides unified interface for native purchases
 * 
 * For iOS: Uses StoreKit via Capacitor plugin
 * For Android: Uses Google Play Billing via Capacitor plugin
 * For Web: Native purchases are unavailable
 */

import { Capacitor } from '@capacitor/core'
import {
  Purchases,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from '@revenuecat/purchases-capacitor'
import { ensureRevenueCatConfigured } from '@/lib/purchases/revenuecat-client'

export type PurchasePlatform = 'ios' | 'android' | 'web'

export interface PurchaseProduct {
  id: string
  price: string
  /** Optional numeric price in major units (e.g. 2.99) when plugin provides it. */
  priceAmount?: number
  currency: string
  title: string
  description: string
}

export interface PurchaseResult {
  success: boolean
  transactionId?: string
  receipt?: string
  productId?: string
  customerInfo?: CustomerInfo
  error?: string
}

const PRODUCT_IDS = {
  monthly: 'pro_monthly',
  yearly: 'pro_annual',
} as const

const PRO_ENTITLEMENT_ID = 'pro'

function hasProEntitlement(customerInfo: CustomerInfo | null | undefined): boolean {
  if (!customerInfo) return false
  return Boolean(customerInfo.entitlements?.active?.[PRO_ENTITLEMENT_ID])
}

function getAllOfferingPackages(offering: PurchasesOffering | null): PurchasesPackage[] {
  if (!offering) return []
  return offering.availablePackages ?? []
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
 */
export async function getAvailableProducts(appUserId?: string | null): Promise<PurchaseProduct[]> {
  const platform = getPurchasePlatform()
  
  if (platform === 'web') {
    // Web does not support native purchases in this app
    return []
  }

  await ensureRevenueCatConfigured(appUserId)
  const offerings = await Purchases.getOfferings()
  const current = offerings.current ?? null
  const packages = getAllOfferingPackages(current)

  const preferredById = new Map<string, PurchasesPackage>()
  for (const pkg of packages) {
    preferredById.set(pkg.product.identifier, pkg)
  }

  const monthlyProduct = preferredById.get(PRODUCT_IDS.monthly)?.product ?? null
  const yearlyProduct = preferredById.get(PRODUCT_IDS.yearly)?.product ?? null

  const mapped: PurchaseProduct[] = []
  if (monthlyProduct) {
    mapped.push({
      id: monthlyProduct.identifier,
      price: monthlyProduct.priceString,
      priceAmount: monthlyProduct.price,
      currency: monthlyProduct.currencyCode,
      title: monthlyProduct.title,
      description: monthlyProduct.description,
    })
  }
  if (yearlyProduct) {
    mapped.push({
      id: yearlyProduct.identifier,
      price: yearlyProduct.priceString,
      priceAmount: yearlyProduct.price,
      currency: yearlyProduct.currencyCode,
      title: yearlyProduct.title,
      description: yearlyProduct.description,
    })
  }

  return mapped
}

/**
 * Purchase a product
 * 
 * @param productId - The product identifier (e.g., 'shiftcoach_monthly')
 * @returns Purchase result with receipt/transaction ID
 */
export async function purchaseProduct(productId: string, appUserId?: string | null): Promise<PurchaseResult> {
  const platform = getPurchasePlatform()
  
  if (platform === 'web') {
    return {
      success: false,
      error: 'Purchases are only available in the mobile app.',
    }
  }

  try {
    await ensureRevenueCatConfigured(appUserId)
    const offerings = await Purchases.getOfferings()
    const current = offerings.current ?? null
    const packages = getAllOfferingPackages(current)
    const selectedPackage = packages.find((pkg) => pkg.product.identifier === productId)

    if (!selectedPackage) {
      return {
        success: false,
        error: `Product ${productId} is not available in current offerings.`,
      }
    }

    const result = await Purchases.purchasePackage({ aPackage: selectedPackage })
    const proActive = hasProEntitlement(result.customerInfo)

    if (!proActive) {
      return {
        success: false,
        productId: result.productIdentifier ?? productId,
        customerInfo: result.customerInfo,
        error: 'Purchase completed but Pro entitlement is not active yet.',
      }
    }

    return {
      success: true,
      transactionId: result.productIdentifier ?? productId,
      productId: result.productIdentifier ?? productId,
      customerInfo: result.customerInfo,
    }
  } catch (error: any) {
    const code = String(error?.code ?? '')
    const cancelled =
      code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
      error?.userCancelled === true
    if (cancelled) {
      return { success: false, error: 'Purchase cancelled.' }
    }
    return {
      success: false,
      error: error?.message || 'Purchase failed',
    }
  }
}

/**
 * Restore previous purchases
 * Useful for users who reinstalled the app or switched devices
 */
export async function restorePurchases(appUserId?: string | null): Promise<PurchaseResult[]> {
  const platform = getPurchasePlatform()
  
  if (platform === 'web') {
    return []
  }

  try {
    await ensureRevenueCatConfigured(appUserId)
    const result = await Purchases.restorePurchases()
    const proEntitlement = result.customerInfo.entitlements?.active?.[PRO_ENTITLEMENT_ID]
    if (!proEntitlement) return []

    return [
      {
        success: true,
        productId: proEntitlement.productIdentifier,
        customerInfo: result.customerInfo,
      },
    ]
  } catch (error: any) {
    console.error('[native-purchases] restorePurchases failed', error)
    return []
  }
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
