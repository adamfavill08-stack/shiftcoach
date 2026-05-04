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
import {
  formatPurchasesError,
  logRevenueCatOfferings,
  purchasesErrorCodeMatches,
  userFacingPurchasesError,
} from '@/lib/purchases/revenuecat-errors'
import { hasProEntitlement, resolveMonthlyAnnualPackages } from '@/lib/revenuecat'
import { storeProductIdMatchesLogicalId } from '@/lib/revenuecat/parse-offering-prices'

export { userFacingPurchasesError, logRevenueCatOfferings } from '@/lib/purchases/revenuecat-errors'

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

function findPackageByLogicalProductId(
  packages: PurchasesPackage[],
  logicalId: string,
): PurchasesPackage | undefined {
  return packages.find((pkg) => storeProductIdMatchesLogicalId(pkg.product.identifier, logicalId))
}

export type AvailableProductsLoad = {
  products: PurchaseProduct[]
  /** Surface on upgrade UI when storefront did not return prices */
  configWarning: string | null
}

const EXPECTED_PRODUCT_IDS = [PRODUCT_IDS.monthly, PRODUCT_IDS.yearly] as const

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
export async function getAvailableProducts(appUserId?: string | null): Promise<AvailableProductsLoad> {
  const platform = getPurchasePlatform()

  if (platform === 'web') {
    return { products: [], configWarning: null }
  }

  try {
    await ensureRevenueCatConfigured(appUserId)
    const offerings = await Purchases.getOfferings()
    logRevenueCatOfferings(offerings, 'getAvailableProducts')

    const current = offerings.current ?? null
    const packages = getAllOfferingPackages(current)

    const { monthly: monthlyPkg, annual: yearlyPkg } = resolveMonthlyAnnualPackages(packages)
    const monthlyProduct = monthlyPkg?.product ?? null
    const yearlyProduct = yearlyPkg?.product ?? null

    const missingIds = [
      ...(!monthlyPkg ? [PRODUCT_IDS.monthly] : []),
      ...(!yearlyPkg ? [PRODUCT_IDS.yearly] : []),
    ]
    if (missingIds.length > 0) {
      console.warn(
        '[native-purchases] Expected product identifiers not found in current offering:',
        missingIds.join(', '),
        '— RevenueCat Offering must include packages for these Store product IDs.',
      )
    }

    const mapped: PurchaseProduct[] = []
    if (monthlyProduct) {
      mapped.push({
        id: PRODUCT_IDS.monthly,
        price: monthlyProduct.priceString,
        priceAmount: monthlyProduct.price,
        currency: monthlyProduct.currencyCode,
        title: monthlyProduct.title,
        description: monthlyProduct.description,
      })
    }
    if (yearlyProduct) {
      mapped.push({
        id: PRODUCT_IDS.yearly,
        price: yearlyProduct.priceString,
        priceAmount: yearlyProduct.price,
        currency: yearlyProduct.currencyCode,
        title: yearlyProduct.title,
        description: yearlyProduct.description,
      })
    }

    let configWarning: string | null = null
    if (!current) {
      configWarning = 'Subscriptions are still configuring. Check RevenueCat has a current Offering with packages.'
    } else if (mapped.length === 0) {
      configWarning =
        'No subscription prices loaded. Confirm Google Play products and RevenueCat Offering match (' +
        EXPECTED_PRODUCT_IDS.join(', ') +
        ').'
    }

    return { products: mapped, configWarning }
  } catch (error: unknown) {
    console.error('[native-purchases] getAvailableProducts failed', formatPurchasesError(error as Error, String(error)))
    return {
      products: [],
      configWarning: userFacingPurchasesError(error, 'Could not load subscription options.'),
    }
  }
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
    logRevenueCatOfferings(offerings, 'purchaseProduct')
    const current = offerings.current ?? null
    const packages = getAllOfferingPackages(current)
    const selectedPackage = findPackageByLogicalProductId(packages, productId)

    if (!selectedPackage) {
      console.error('[native-purchases] No package for productId', productId, 'offerings snapshot logged above.')
      return {
        success: false,
        error:
          'This plan is not available from the store yet. Check RevenueCat offering packages and Play product IDs.',
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
  } catch (error: unknown) {
    console.error('[native-purchases] purchaseProduct failed', formatPurchasesError(error as Error, 'Purchase failed'))
    const cancelled =
      purchasesErrorCodeMatches(error, PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) ||
      (error as { userCancelled?: boolean })?.userCancelled === true
    if (cancelled) {
      return { success: false, error: 'Purchase cancelled.' }
    }
    return {
      success: false,
      error: userFacingPurchasesError(error, 'Purchase could not complete.'),
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
    if (!hasProEntitlement(result.customerInfo)) return []
    const proEntitlement = result.customerInfo.entitlements?.active?.pro

    return [
      {
        success: true,
        productId: proEntitlement?.productIdentifier ?? 'pro',
        customerInfo: result.customerInfo,
      },
    ]
  } catch (error: unknown) {
    console.error(
      '[native-purchases] restorePurchases failed',
      formatPurchasesError(error as Error, 'Restore failed'),
    )
    console.error('[native-purchases] restore user-facing:', userFacingPurchasesError(error, 'Restore failed'))
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
