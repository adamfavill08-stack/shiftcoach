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
      const withCompleted = {
        subscription_plan: 'free' as const,
        subscription_status: null as null,
        trial_ends_at: null as null,
        onboarding_completed: true,
      }
      let { error } = await supabase.from('profiles').update(withCompleted).eq('user_id', userId)
      const errMsg = error?.message ?? ''
      if (error && (error.code === 'PGRST204' || /onboarding_completed/i.test(errMsg))) {
        const { error: e2 } = await supabase
          .from('profiles')
          .update({
            subscription_plan: 'free',
            subscription_status: null,
            trial_ends_at: null,
          })
          .eq('user_id', userId)
        error = e2
      }
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, selection })
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

