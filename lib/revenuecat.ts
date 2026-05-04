/**
 * RevenueCat (Capacitor) helpers: offerings, package pick, purchase, restore.
 * Uses Google Play Billing / StoreKit via @revenuecat/purchases-capacitor.
 */
'use client'

import { Capacitor } from '@capacitor/core'
import {
  Purchases,
  PURCHASES_ERROR_CODE,
  PACKAGE_TYPE,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from '@revenuecat/purchases-capacitor'
import { ensureRevenueCatConfigured } from '@/lib/purchases/revenuecat-client'
import { storeProductIdMatchesLogicalId } from '@/lib/revenuecat/parse-offering-prices'
import {
  logRevenueCatOfferings,
  purchasesErrorCodeMatches,
  userFacingPurchasesError,
} from '@/lib/purchases/revenuecat-errors'

export const RC_PRO_ENTITLEMENT_ID = 'pro'

/** Play / App Store product ids used when RevenueCat packages are CUSTOM. */
export const RC_LOGICAL_MONTHLY_PRODUCT_ID = 'pro_monthly'
export const RC_LOGICAL_ANNUAL_PRODUCT_ID = 'pro_annual'

export function isPurchaseCancelledError(error: unknown): boolean {
  return (
    purchasesErrorCodeMatches(error, PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) ||
    (error as { userCancelled?: boolean })?.userCancelled === true
  )
}

export function hasProEntitlement(info: CustomerInfo | null | undefined): boolean {
  if (!info) return false
  return Boolean(info.entitlements?.active?.[RC_PRO_ENTITLEMENT_ID])
}

function getCurrentPackages(offerings: PurchasesOfferings): PurchasesPackage[] {
  const current = offerings.current ?? null
  return current?.availablePackages ?? []
}

/**
 * Pick monthly + annual packages from the current offering.
 * Prefers RevenueCat PACKAGE_TYPE; falls back to store product id match.
 */
export function resolveMonthlyAnnualPackages(packages: PurchasesPackage[]): {
  monthly: PurchasesPackage | undefined
  annual: PurchasesPackage | undefined
} {
  let monthly = packages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY)
  let annual = packages.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL)

  if (!monthly) {
    monthly = packages.find((p) =>
      storeProductIdMatchesLogicalId(p.product.identifier, RC_LOGICAL_MONTHLY_PRODUCT_ID),
    )
  }
  if (!annual) {
    annual = packages.find((p) =>
      storeProductIdMatchesLogicalId(p.product.identifier, RC_LOGICAL_ANNUAL_PRODUCT_ID),
    )
  }

  return { monthly, annual }
}

export type LoadOfferingPackagesResult = {
  offerings: PurchasesOfferings | null
  monthly: PurchasesPackage | null
  annual: PurchasesPackage | null
  warning: string | null
}

export async function loadCurrentOfferingPackages(
  supabaseUserId: string | null,
): Promise<LoadOfferingPackagesResult> {
  const platform = Capacitor.getPlatform()
  if (platform === 'web') {
    return { offerings: null, monthly: null, annual: null, warning: null }
  }

  try {
    await ensureRevenueCatConfigured(supabaseUserId)
    const offerings = await Purchases.getOfferings()
    logRevenueCatOfferings(offerings, 'loadCurrentOfferingPackages')
    const pkgs = getCurrentPackages(offerings)
    const { monthly, annual } = resolveMonthlyAnnualPackages(pkgs)

    let warning: string | null = null
    if (!offerings.current) {
      warning =
        'Subscriptions are still configuring. Set a current Offering with Monthly and Annual packages in RevenueCat.'
    } else if (!monthly || !annual) {
      warning =
        'Could not find both Monthly and Annual packages. Check RevenueCat package types or product ids (pro_monthly, pro_annual).'
    }

    return {
      offerings,
      monthly: monthly ?? null,
      annual: annual ?? null,
      warning,
    }
  } catch (e) {
    console.error('[lib/revenuecat] loadCurrentOfferingPackages', e)
    return {
      offerings: null,
      monthly: null,
      annual: null,
      warning: userFacingPurchasesError(e, 'Could not load subscription options.'),
    }
  }
}

export type PurchaseRcPackageOutcome =
  | { ok: true; customerInfo: CustomerInfo }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; message: string }

export async function purchaseRevenueCatPackage(
  supabaseUserId: string | null,
  pkg: PurchasesPackage,
): Promise<PurchaseRcPackageOutcome> {
  const platform = Capacitor.getPlatform()
  if (platform === 'web') {
    return { ok: false, cancelled: false, message: 'Purchases are only available in the mobile app.' }
  }

  try {
    await ensureRevenueCatConfigured(supabaseUserId)
    const result = await Purchases.purchasePackage({ aPackage: pkg })
    if (!hasProEntitlement(result.customerInfo)) {
      return {
        ok: false,
        cancelled: false,
        message: 'Purchase completed but Pro is not active yet. Try Restore purchases in a moment.',
      }
    }
    return { ok: true, customerInfo: result.customerInfo }
  } catch (error: unknown) {
    if (isPurchaseCancelledError(error)) {
      return { ok: false, cancelled: true }
    }
    return {
      ok: false,
      cancelled: false,
      message: userFacingPurchasesError(error, 'Purchase could not complete.'),
    }
  }
}

export type RestoreRcOutcome = {
  hasPro: boolean
  customerInfo: CustomerInfo | null
  errorMessage: string | null
}

export async function restoreRevenueCatPurchases(
  supabaseUserId: string | null,
): Promise<RestoreRcOutcome> {
  const platform = Capacitor.getPlatform()
  if (platform === 'web') {
    return { hasPro: false, customerInfo: null, errorMessage: null }
  }

  try {
    await ensureRevenueCatConfigured(supabaseUserId)
    const result = await Purchases.restorePurchases()
    const active = hasProEntitlement(result.customerInfo)
    return {
      hasPro: active,
      customerInfo: result.customerInfo,
      errorMessage: null,
    }
  } catch (error: unknown) {
    console.error('[lib/revenuecat] restoreRevenueCatPurchases', error)
    return {
      hasPro: false,
      customerInfo: null,
      errorMessage: userFacingPurchasesError(error, 'Could not restore purchases.'),
    }
  }
}
