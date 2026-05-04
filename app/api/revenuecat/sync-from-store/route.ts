import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { parseJsonBody } from '@/lib/api/validation'
import { isEntitlementActive } from '@/lib/subscription/access'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  platform: z.enum(['ios', 'android']),
})

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * POST /api/revenuecat/sync-from-store
 * After a native RevenueCat purchase, pull subscriber from RevenueCat REST and update Supabase profile.
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const parsed = await parseJsonBody(req, BodySchema)
    if (!parsed.ok) return parsed.response

    const { platform } = parsed.data
    const revenuecatUserId = `shiftcoach_${userId}`
    const revenuecatApiKey = process.env.REVENUECAT_API_KEY
    if (!revenuecatApiKey) {
      return NextResponse.json(
        { success: false, error: 'Billing sync is not configured on the server.' },
        { status: 503 },
      )
    }

    let subscriber: Record<string, unknown> | null = null
    for (let attempt = 0; attempt < 4; attempt++) {
      const revenuecatResponse = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(revenuecatUserId)}`,
        {
          headers: {
            Authorization: `Bearer ${revenuecatApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      )

      if (revenuecatResponse.ok) {
        const data = (await revenuecatResponse.json().catch(() => ({}))) as { subscriber?: Record<string, unknown> }
        subscriber = data.subscriber ?? null
        if (subscriber && isEntitlementActive(subscriber.entitlements as never, 'pro')) {
          break
        }
      }
      await sleep(attempt === 0 ? 400 : 700)
    }

    if (!subscriber || !isEntitlementActive(subscriber.entitlements as never, 'pro')) {
      return NextResponse.json({
        success: false,
        error: 'We could not confirm your Pro subscription yet. Wait a few seconds and try Restore purchases.',
      })
    }

    const entitlements = subscriber.entitlements as Record<string, unknown> | undefined
    const activeRoot = entitlements?.active as Record<string, unknown> | undefined
    const proInfo = activeRoot?.pro as { product_identifier?: string } | undefined
    const productId = proInfo?.product_identifier ?? null

    const subscriptionPlatform = platform === 'ios' ? 'revenuecat_ios' : 'revenuecat_android'

    const updatePayload: Record<string, unknown> = {
      revenuecat_user_id: revenuecatUserId,
      revenuecat_subscription_id: productId,
      revenuecat_entitlements: entitlements ?? {},
      subscription_platform: subscriptionPlatform,
      subscription_plan: 'pro',
      subscription_status: 'active',
      onboarding_completed: true,
    }

    let { error } = await supabase.from('profiles').update(updatePayload).eq('user_id', userId)

    if (error?.code === 'PGRST204' || /onboarding_completed/i.test(String(error?.message ?? ''))) {
      delete updatePayload.onboarding_completed
      const retry = await supabase.from('profiles').update(updatePayload).eq('user_id', userId)
      error = retry.error
    }

    if (error) {
      console.error('[api/revenuecat/sync-from-store] profile update:', error)
      return NextResponse.json({ success: false, error: error.message || 'Could not save subscription to your profile.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    console.error('[api/revenuecat/sync-from-store]', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unexpected error' },
      { status: 500 },
    )
  }
}
