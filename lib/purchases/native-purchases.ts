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
  type PurchasesOfferings,
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

/**
 * Google Play Billing subscription v2 exposes products as `subscriptionId:basePlanId`.
 * iOS / older Android may use the logical id alone. Match either form.
 */
function storeProductIdMatchesLogicalId(storeIdentifier: string, logicalId: string): boolean {
  return storeIdentifier === logicalId || storeIdentifier.startsWith(`${logicalId}:`)
}

function findPackageByLogicalProductId(
  packages: PurchasesPackage[],
  logicalId: string,
): PurchasesPackage | undefined {
  return packages.find((pkg) => storeProductIdMatchesLogicalId(pkg.product.identifier, logicalId))
}

/** RevenueCat errors use `code` as number or string; PURCHASES_ERROR_CODE is a string enum in typings. */
function purchasesErrorCodeMatches(err: unknown, expected: PURCHASES_ERROR_CODE): boolean {
  const raw = (err as { code?: unknown })?.code
  return raw === expected || String(raw) === String(expected)
}

function formatPurchasesError(error: any, fallback: string): string {
  const code = String(error?.code ?? '')
  const readableCode = String(error?.userInfo?.readableErrorCode ?? '')
  const message = String(error?.message ?? '').trim()
  const underlying = String(error?.underlyingErrorMessage ?? '').trim()

  const primary = message || fallback
  const parts = [primary]
  if (code) parts.push(`code=${code}`)
  if (readableCode) parts.push(`type=${readableCode}`)
  if (underlying && underlying !== message) parts.push(`underlying=${underlying}`)
  return parts.join(' | ')
}

/** Safe copy for alerts; technical detail stays in console. */
export function userFacingPurchasesError(error: unknown, fallback = 'Billing is temporarily unavailable.'): string {
  const e = error as Record<string, unknown> | null
  const rawCode = (e as { code?: unknown })?.code
  const codeNum =
    typeof rawCode === 'number' && Number.isFinite(rawCode)
      ? rawCode
      : typeof rawCode === 'string' && rawCode !== '' && Number.isFinite(Number(rawCode))
        ? Number(rawCode)
        : NaN
  const readable = String(e?.userInfo && typeof e.userInfo === 'object' && 'readableErrorCode' in e.userInfo
    ? (e.userInfo as { readableErrorCode?: string }).readableErrorCode ?? ''
    : '')
  const msg = String(e?.message ?? '').toLowerCase()

  if (
    codeNum === 23 ||
    /\bconfiguration\b/i.test(readable) ||
    /\bconfiguration\b/i.test(String(e?.message ?? ''))
  ) {
    return 'Store setup is incomplete. Confirm RevenueCat offerings, Google Play product IDs, and that you are signed into a tester account.'
  }
  if (purchasesErrorCodeMatches(error, PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR) || /not.?allowed/i.test(msg)) {
    return 'Purchases are not allowed on this device or account.'
  }
  if (purchasesErrorCodeMatches(error, PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR) || /store problem/i.test(readable)) {
    return 'Google Play Store is not available right now. Try again later.'
  }
  if (purchasesErrorCodeMatches(error, PURCHASES_ERROR_CODE.NETWORK_ERROR)) {
    return 'Network error. Check your connection and try again.'
  }
  if (/billing|bff|play store|unable/i.test(msg) && /\b(unavailable|disconnect|billing)\b/i.test(msg)) {
    return 'Google Play Billing is unavailable. Update Play Store or try again later.'
  }
  return fallback
}

export function logRevenueCatOfferings(offerings: PurchasesOfferings, label: string): void {
  try {
    const current = offerings.current
    console.log(`[native-purchases] ${label} — current offering:`, current?.identifier ?? '(none)')
    console.log(`[native-purchases] ${label} — offerings.all keys:`, Object.keys(offerings.all ?? {}))
    const pkgs = current?.availablePackages ?? []
    console.log(`[native-purchases] ${label} — availablePackages count:`, pkgs.length)
    for (const p of pkgs) {
      const id = p.product?.identifier ?? '?'
      console.log(
        `[native-purchases] ${label} — package ${p.identifier} → product ${id} (${p.product?.priceString ?? 'no price'})`,
      )
    }
    if (!current) {
      console.warn(`[native-purchases] ${label} — no current offering. Set an Offering as "current" in RevenueCat.`)
    } else if (pkgs.length === 0) {
      console.warn(`[native-purchases] ${label} — current offering has no packages. Attach products in RevenueCat.`)
    }
  } catch (err) {
    console.warn(`[native-purchases] logRevenueCatOfferings failed (${label})`, err)
  }
}

export type AvailableProductsLoad = {
  products: PurchaseProduct[]
  /** Surface on upgrade UI when storefront did not return prices */
  configWarning: string | null
}

const EXPECTED_PRODUCT_IDS = [PRODUCT_IDS.monthly, PRODUCT_IDS.yearly] as const

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

    const monthlyPkg = findPackageByLogicalProductId(packages, PRODUCT_IDS.monthly)
    const yearlyPkg = findPackageByLogicalProductId(packages, PRODUCT_IDS.yearly)
    const monthlyProduct = monthlyPkg?.product ?? null
    const yearlyProduct = yearlyPkg?.product ?? null

    const missingIds = EXPECTED_PRODUCT_IDS.filter((id) => !findPackageByLogicalProductId(packages, id))
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
    const proEntitlement = result.customerInfo.entitlements?.active?.[PRO_ENTITLEMENT_ID]
    if (!proEntitlement) return []

    return [
      {
        success: true,
        productId: proEntitlement.productIdentifier,
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
