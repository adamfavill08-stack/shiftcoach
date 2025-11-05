import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => req.cookies })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error('[/api/meals/log] auth error:', authError)
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { slotId, slotLabel, calories, notes } = body as {
      slotId?: string
      slotLabel?: string
      calories?: number
      notes?: string
    }

    if (!slotId || !slotLabel) {
      return NextResponse.json(
        { error: 'slotId and slotLabel are required' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().slice(0, 10)

    const { error } = await supabase.from('meal_logs').insert({
      user_id: user.id,
      date: today,
      slot_id: slotId,
      slot_label: slotLabel,
      calories: typeof calories === 'number' ? calories : null,
      notes: notes ?? null,
    })

    if (error) {
      console.error('[/api/meals/log] insert error:', error)
      return NextResponse.json({ error: 'Failed to log meal' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error('[/api/meals/log] FATAL ERROR:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


