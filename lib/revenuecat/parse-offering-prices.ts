/** Same rule as native purchases: Play v2 uses `subscriptionId:basePlanId`. */
export function storeProductIdMatchesLogicalId(storeIdentifier: string, logicalId: string): boolean {
  return storeIdentifier === logicalId || storeIdentifier.startsWith(`${logicalId}:`)
}

function pickFormattedPrice(pkg: Record<string, unknown>): string | null {
  const direct = ['price_string', 'priceString', 'formatted_price_string', 'formattedPriceString'] as const
  for (const k of direct) {
    const v = pkg[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  const price = pkg.price
  if (price && typeof price === 'object') {
    const p = price as Record<string, unknown>
    for (const k of ['formatted', 'formatted_price', 'formattedPrice', 'price_string'] as const) {
      const v = p[k]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
  }
  return null
}

function unwrapOfferingsPayload(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (d.value && typeof d.value === 'object') return d.value as Record<string, unknown>
  return d
}

/**
 * Best-effort parse of GET /v1/subscribers/{id}/offerings.
 * RevenueCat often omits localized prices; callers should fall back to env or UI placeholders.
 */
export function parseRevenueCatOfferingPrices(
  data: unknown,
  logicalMonthlyId: string,
  logicalYearlyId: string,
): { monthly: string | null; yearly: string | null } {
  const root = unwrapOfferingsPayload(data)
  if (!root) return { monthly: null, yearly: null }

  const currentId = typeof root.current_offering_id === 'string' ? root.current_offering_id : null
  const offeringsRaw = root.offerings
  if (!Array.isArray(offeringsRaw)) return { monthly: null, yearly: null }

  const offerings = offeringsRaw as Record<string, unknown>[]
  const current =
    (currentId && offerings.find((o) => o.identifier === currentId)) ?? offerings[0] ?? null
  if (!current) return { monthly: null, yearly: null }

  const packages = current.packages
  if (!Array.isArray(packages)) return { monthly: null, yearly: null }

  let monthly: string | null = null
  let yearly: string | null = null

  for (const p of packages as Record<string, unknown>[]) {
    const pid = typeof p.platform_product_identifier === 'string' ? p.platform_product_identifier : ''
    if (!pid) continue
    const price = pickFormattedPrice(p)
    if (!price) continue
    if (storeProductIdMatchesLogicalId(pid, logicalMonthlyId)) monthly = price
    if (storeProductIdMatchesLogicalId(pid, logicalYearlyId)) yearly = price
  }

  return { monthly, yearly }
}
