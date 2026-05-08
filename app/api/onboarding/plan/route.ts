import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    if (!userId) return buildUnauthorizedResponse()

    const body = (await req.json().catch(() => ({}))) as { selection?: 'free' | 'monthly' | 'yearly' }
    const selection = body?.selection
    if (selection !== 'free' && selection !== 'monthly' && selection !== 'yearly') {
      return NextResponse.json({ error: 'Invalid selection' }, { status: 400 })
    }

    if (selection === 'free') {
      const grantTrial = async () =>
        supabase.rpc('grant_free_trial_once', {
          p_user_id: userId,
          p_days: 7,
          p_source: 'onboarding_free',
        })

      let { data, error } = await grantTrial()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      let row = Array.isArray(data) ? data[0] : data
      let result = (row ?? {}) as {
        granted?: boolean
        reason?: 'granted' | 'already_claimed' | 'already_paid' | 'invalid_days' | 'profile_not_found'
        trial_ends_at?: string | null
      }

      // In some onboarding races, profile row may not exist yet; create it and retry once.
      if (result.reason === 'profile_not_found') {
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({ user_id: userId, onboarding_completed: true }, { onConflict: 'user_id' })
        if (upsertError) {
          return NextResponse.json({ error: upsertError.message }, { status: 500 })
        }

        const retry = await grantTrial()
        if (retry.error) {
          return NextResponse.json({ error: retry.error.message }, { status: 500 })
        }
        row = Array.isArray(retry.data) ? retry.data[0] : retry.data
        result = (row ?? {}) as {
          granted?: boolean
          reason?: 'granted' | 'already_claimed' | 'already_paid' | 'invalid_days' | 'profile_not_found'
          trial_ends_at?: string | null
        }
      }

      return NextResponse.json({
        success: true,
        selection,
        trial: {
          granted: Boolean(result.granted),
          reason: result.reason ?? null,
          trialEndsAt: result.trial_ends_at ?? null,
        },
      })
    }

    // Paid options: persist chosen intent so onboarding flow can resume after purchase.
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_plan: selection,
      })
      .eq('user_id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, selection })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save onboarding plan' }, { status: 500 })
  }
}

