import { PURCHASES_ERROR_CODE, type PurchasesOfferings } from '@revenuecat/purchases-capacitor'

/** RevenueCat errors use `code` as number or string; PURCHASES_ERROR_CODE is a string enum in typings. */
export function purchasesErrorCodeMatches(err: unknown, expected: PURCHASES_ERROR_CODE): boolean {
  const raw = (err as { code?: unknown })?.code
  return raw === expected || String(raw) === String(expected)
}

export function formatPurchasesError(error: any, fallback: string): string {
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
  const readable = String(
    e?.userInfo && typeof e.userInfo === 'object' && 'readableErrorCode' in e.userInfo
      ? ((e.userInfo as { readableErrorCode?: string }).readableErrorCode ?? '')
      : '',
  )
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
    console.log(`[revenuecat] ${label} — current offering:`, current?.identifier ?? '(none)')
    console.log(`[revenuecat] ${label} — offerings.all keys:`, Object.keys(offerings.all ?? {}))
    const pkgs = current?.availablePackages ?? []
    console.log(`[revenuecat] ${label} — availablePackages count:`, pkgs.length)
    for (const p of pkgs) {
      const id = p.product?.identifier ?? '?'
      console.log(
        `[revenuecat] ${label} — package ${p.identifier} → product ${id} (${p.product?.priceString ?? 'no price'})`,
      )
    }
    if (!current) {
      console.warn(`[revenuecat] ${label} — no current offering. Set an Offering as "current" in RevenueCat.`)
    } else if (pkgs.length === 0) {
      console.warn(`[revenuecat] ${label} — current offering has no packages. Attach products in RevenueCat.`)
    }
  } catch (err) {
    console.warn(`[revenuecat] logRevenueCatOfferings failed (${label})`, err)
  }
}
