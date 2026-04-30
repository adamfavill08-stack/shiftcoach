import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'

const FREE_TRIAL_DAYS = 7

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
      const trialEndsAt = new Date(Date.now() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_plan: 'free',
          subscription_status: 'trialing',
          trial_ends_at: trialEndsAt,
        })
        .eq('user_id', userId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, selection, trialEndsAt })
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

