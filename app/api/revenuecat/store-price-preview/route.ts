import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { parseRevenueCatOfferingPrices } from '@/lib/revenuecat/parse-offering-prices'

export const dynamic = 'force-dynamic'

const LOGICAL_MONTHLY = 'pro_monthly'
const LOGICAL_YEARLY = 'pro_annual'

/**
 * GET /api/revenuecat/store-price-preview?platform=android|ios
 * Best-effort localized price strings from RevenueCat offerings (same source as the native SDK).
 * When RC omits price fields (common), falls back to NEXT_PUBLIC_ONBOARDING_PRICE_* env labels for web UI.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const platformParam = req.nextUrl.searchParams.get('platform')
    const platform = platformParam === 'ios' ? 'ios' : 'android'

    const revenuecatApiKey = process.env.REVENUECAT_API_KEY
    if (!revenuecatApiKey) {
      return NextResponse.json({
        monthly: process.env.NEXT_PUBLIC_ONBOARDING_PRICE_MONTHLY_LABEL ?? null,
        yearly: process.env.NEXT_PUBLIC_ONBOARDING_PRICE_YEARLY_LABEL ?? null,
        source: 'env_missing_rc_key' as const,
      })
    }

    const revenuecatUserId = `shiftcoach_${userId}`
    const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(revenuecatUserId)}/offerings`
    const revenuecatResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${revenuecatApiKey}`,
        'X-Platform': platform,
      },
      cache: 'no-store',
    })

    if (!revenuecatResponse.ok) {
      return NextResponse.json({
        monthly: process.env.NEXT_PUBLIC_ONBOARDING_PRICE_MONTHLY_LABEL ?? null,
        yearly: process.env.NEXT_PUBLIC_ONBOARDING_PRICE_YEARLY_LABEL ?? null,
        source: 'env_rc_http_error' as const,
      })
    }

    const data: unknown = await revenuecatResponse.json()
    const parsed = parseRevenueCatOfferingPrices(data, LOGICAL_MONTHLY, LOGICAL_YEARLY)

    const monthly =
      parsed.monthly ?? process.env.NEXT_PUBLIC_ONBOARDING_PRICE_MONTHLY_LABEL ?? null
    const yearly = parsed.yearly ?? process.env.NEXT_PUBLIC_ONBOARDING_PRICE_YEARLY_LABEL ?? null

    const source =
      parsed.monthly || parsed.yearly ? ('revenuecat' as const) : ('env' as const)

    return NextResponse.json({ monthly, yearly, source })
  } catch {
    return NextResponse.json({
      monthly: process.env.NEXT_PUBLIC_ONBOARDING_PRICE_MONTHLY_LABEL ?? null,
      yearly: process.env.NEXT_PUBLIC_ONBOARDING_PRICE_YEARLY_LABEL ?? null,
      source: 'env_exception' as const,
    })
  }
}
