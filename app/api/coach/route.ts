import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { openai } from '@/lib/openaiClient'
import { SHIFT_CALI_COACH_SYSTEM_PROMPT } from '@/lib/coach/systemPrompt'
import { getCoachingState } from '@/lib/coach/getCoachingState'
import { classifyGoalFeedback } from '@/lib/coach/classifyGoalFeedback'

export async function POST(req: NextRequest) {
  try {
    // ✅ Use cookies from the incoming request, not global
    const supabase = createRouteHandlerClient({ cookies: () => req.cookies })

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error('[/api/coach] Supabase auth error:', error)
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }

    console.log('[/api/coach] User authenticated:', user.id)

    // ✅ From here down, use user.id for all conversation logic

    const body = await req.json().catch(() => null)
    const message = body?.message as string | undefined
    const context = body?.context ?? {}

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Missing message', detail: 'Request body must include a "message" field' },
        { status: 400 }
      )
    }

    console.log('[/api/coach] Received message:', message)
    console.log('[/api/coach] User:', user.id)

    // Check for goal feedback sentiment
    const feedbackSentiment = classifyGoalFeedback(message)
    console.log('[/api/coach] Goal feedback sentiment:', feedbackSentiment)

    // Optionally fetch the user's latest weekly_goals to get current week_start
    let weekStart: string | null = null
    let goalFeedbackContext = ''

    if (feedbackSentiment !== 'none') {
      const { data: latestGoals } = await supabase
        .from('weekly_goals')
        .select('week_start')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestGoals?.week_start) {
        weekStart = latestGoals.week_start as string

        // Log feedback
        await supabase.from('weekly_goal_feedback').insert({
          user_id: user.id,
          week_start: weekStart,
          sentiment: feedbackSentiment,
          reflection: message.slice(0, 2000), // Limit reflection length
        })

        console.log(`[/api/coach] Logged goal feedback: ${feedbackSentiment} for week ${weekStart}`)

        // Build context for AI
        goalFeedbackContext = `
The user is talking about their weekly goals (week starting ${weekStart}).

They seem to be in this feedback category: ${feedbackSentiment.toUpperCase()}.

Interpret this as:
- completed: they hit most or all of their goals.
- partial: they hit some goals.
- struggled: they missed most goals or couldn't do much.

Respond in a way that matches this category, using the rules in your system prompt.
`.trim()
      }
    }

    // Fetch user metrics for personalized context
    const { getUserMetrics } = await import('@/lib/data/getUserMetrics')
    const metrics = await getUserMetrics(user.id, supabase)
    console.log('[/api/coach] User metrics:', metrics)

    // Compute coaching state (normalize shift type to lowercase)
    const shiftTypeNormalized = metrics.shiftType
      ? (metrics.shiftType.toLowerCase() as 'day' | 'night' | 'late' | 'off')
      : null

    const coachingState = getCoachingState({
      bodyClockScore: metrics.bodyClockScore,
      recoveryScore: metrics.recoveryScore,
      sleepHoursLast24h: metrics.sleepHoursLast24,
      shiftType: shiftTypeNormalized,
      moodScore: metrics.moodScore,
      focusScore: metrics.focusScore,
    })
    console.log('[/api/coach] Coaching state:', coachingState)

    // Format context summary
    const contextParts: string[] = []
    if (metrics.bodyClockScore !== null) {
      contextParts.push(`Body Clock Score: ${metrics.bodyClockScore}`)
    }
    if (metrics.sleepHoursLast24 !== null) {
      contextParts.push(`Sleep (last 24h): ${metrics.sleepHoursLast24} h`)
    }
    if (metrics.recoveryScore !== null) {
      contextParts.push(`Recovery Score: ${metrics.recoveryScore}`)
    }
    if (metrics.shiftType) {
      contextParts.push(`Shift type: ${metrics.shiftType}`)
    }
    if (metrics.adjustedCalories !== null) {
      contextParts.push(`Calories: ${metrics.adjustedCalories} kcal`)
    }
    if (metrics.steps !== null) {
      contextParts.push(`Steps: ${metrics.steps.toLocaleString()}`)
    }

    const contextSummary = contextParts.length > 0
      ? `User context:\n- ${contextParts.join('\n- ')}`
      : 'User context: No recent data logged yet.'

    // Add coaching state context
    const stateContext = `
Coaching state for this user:
${coachingState.summary}
`.trim()

    // 1) Find or create active conversation
    const { data: existingConvos, error: convosError } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (convosError) {
      console.error('Error fetching conversations:', convosError)
      // Check if it's a table not found error
      if (convosError.message?.includes('relation') || convosError.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Database tables not found', 
          message: 'Please run the SQL migration: supabase-ai-coach.sql',
          details: convosError.message 
        }, { status: 500 })
      }
      return NextResponse.json({ 
        error: 'Failed to fetch conversation', 
        message: convosError.message 
      }, { status: 500 })
    }

    let conversation = existingConvos?.[0]
    if (!conversation) {
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          title: 'ShiftCali coaching',
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating conversation:', error)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }
      conversation = data
    }

    // 2) Load last 30 messages
    const { data: pastMessages, error: messagesError } = await supabase
      .from('ai_messages')
      .select('role, content, created_at')
      .eq('user_id', user.id)
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(30)

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      // If table doesn't exist, return error
      if (messagesError.message?.includes('relation') || messagesError.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Database tables not found', 
          message: 'Please run the SQL migration: supabase-ai-coach.sql',
          details: messagesError.message 
        }, { status: 500 })
      }
      // Continue anyway, just won't have past context
    }

    // 3) Build messages for OpenAI with personalized context
    const messages: { role: 'system' | 'assistant' | 'user'; content: string }[] = []

    // Combine system prompt with user context, coaching state, and goal feedback
    const fullSystemPrompt = `
${SHIFT_CALI_COACH_SYSTEM_PROMPT}

Additional important context:

${stateContext}

${contextSummary}

${goalFeedbackContext ? `\n\n${goalFeedbackContext}` : ''}

Respond in a way that is explicitly tailored for this state:
- If status is RED: be extra gentle, prioritize rest, recovery, and safety. Suggest smaller steps. Encourage compassion, not perfection.
- If status is AMBER: acknowledge strain but offer 1–3 realistic actions that prevent a crash.
- If status is GREEN: be encouraging and let them build momentum, but still respect shift work reality.
`.trim() +
      (context?.reason ? `\n\nAdditional context: ${JSON.stringify(context)}` : '')

    console.log('[/api/coach] Full system prompt:', fullSystemPrompt)

    messages.push({
      role: 'system',
      content: fullSystemPrompt,
    })

    if (pastMessages && pastMessages.length > 0) {
      for (const m of pastMessages) {
        if (m.role === 'user' || m.role === 'assistant') {
          messages.push({ role: m.role as 'user' | 'assistant', content: m.content })
        }
      }
    }

    messages.push({ role: 'user', content: message })

    // 5) Save new user message to DB
    const { error: userMsgError } = await supabase.from('ai_messages').insert({
      user_id: user.id,
      conversation_id: conversation.id,
      role: 'user',
      content: message,
    })

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError)
      // Continue anyway, we'll still try to get a response
    }

    // 6) Call OpenAI
    console.log('[/api/coach] Calling OpenAI with', messages.length, 'messages')
    let chatRes
    try {
      chatRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Using gpt-4o-mini as it's more cost-effective
        messages,
        temperature: 0.6,
      })
      console.log('[/api/coach] OpenAI call successful')
    } catch (openaiError) {
      console.error('[/api/coach] OpenAI API error:', openaiError)
      const errorMessage = openaiError instanceof Error ? openaiError.message : 'OpenAI API error'
      
      // Check if it's an API key error
      if (errorMessage.includes('OPENAI_API_KEY') || errorMessage.includes('api key')) {
        return NextResponse.json({ 
          error: 'OpenAI API key not configured', 
          message: 'Please add OPENAI_API_KEY to your .env.local file and restart the server.',
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        error: 'OpenAI API error', 
        message: errorMessage,
      }, { status: 500 })
    }

    const reply = chatRes.choices[0]?.message?.content?.trim() || 'Sorry, something went wrong.'
    console.log('[/api/coach] OpenAI reply:', reply.slice(0, 200))

    // 7) Save assistant reply
    const { error: assistantMsgError } = await supabase.from('ai_messages').insert({
      user_id: user.id,
      conversation_id: conversation.id,
      role: 'assistant',
      content: reply,
    })

    if (assistantMsgError) {
      console.error('Error saving assistant message:', assistantMsgError)
      // Continue anyway, we'll still return the response
    }

    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('[/api/coach] FATAL ERROR:', err)
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

