'use client'

import { useEffect, useState } from 'react'
import { useCoachChat } from '@/lib/hooks/useCoachChat'

export function CoachChatModal({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('')
  const [coachContext, setCoachContext] = useState<any>(null)
  
  // Initialize with welcome message
  const { messages, isSending, sendMessage, setMessages } = useCoachChat([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hey, I'm your ShiftCali coach. What are you struggling with today – sleep, cravings, or energy on shift?",
    },
  ])

  useEffect(() => {
    const storedContext = localStorage.getItem('coach-context')
    if (storedContext) {
      const ctx = JSON.parse(storedContext)
      setCoachContext(ctx)
      localStorage.removeItem('coach-context') // Consume context
      
      // Adjust initial message based on context
      let initialMessage = "Hey, I'm your ShiftCali coach. What are you struggling with today – sleep, cravings, or energy on shift?"
      if (ctx.reason === 'low_mood') {
        initialMessage = `I saw you rated your mood low today (${ctx.score || 2}/5). Want to talk about what's making today hard?`
      } else if (ctx.reason === 'low_focus') {
        initialMessage = `Your focus looked low today (${ctx.score || 2}/5). Let's see how we can keep you safe and make today easier.`
      } else if (ctx.reason === 'mood_focus_low') {
        initialMessage = `I noticed your mood or focus was low today. How can I support you?`
      } else if (ctx.reason === 'weekly_summary') {
        initialMessage = `I just shared your weekly summary with you. Want to talk about anything specific from this past week?`
      } else if (ctx.reason === 'weekly_goals') {
        initialMessage = `I just shared your weekly focus points. Want to adjust any of them or talk about how to make them work with your shifts?`
      } else if (ctx.reason === 'weekly_goal_feedback') {
        initialMessage = `Thanks for sharing how your week went. Let's talk about what worked and what didn't – no judgment, just figuring out what's realistic for you.`
      }
      
      // Update the welcome message
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: initialMessage,
        },
      ])

      // If there's an autoMessage, send it automatically after a brief delay
      if (ctx.autoMessage) {
        setTimeout(async () => {
          await sendMessage(ctx.autoMessage, ctx)
        }, 500)
      }
    }
  }, [setMessages, sendMessage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isSending) return

    setInput('')
    await sendMessage(text, coachContext)
    // Clear context after first message
    if (coachContext) {
      setCoachContext(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 backdrop-blur-sm flex items-end justify-center px-3 pb-4 md:items-center md:pb-0"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-400/10 to-indigo-400/10 blur-2xl pointer-events-none" />
      
      {/* Chat container */}
      <div
        className="relative w-full max-w-[420px] rounded-3xl backdrop-blur-2xl border overflow-hidden transition-all duration-300 animate-slide-up"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-100/40 to-indigo-100/40 pointer-events-none" />
        
        {/* Content */}
        <div className="relative flex flex-col h-[500px] max-h-[85vh]">
          {/* Header */}
          <header
            className="flex items-center justify-between px-4 py-3 border-b backdrop-blur-xl"
            style={{
              backgroundColor: 'var(--card-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500">
                <span className="text-white text-lg">💬</span>
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>AI Coach</p>
                <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Chat about your shift, sleep or meals</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="transition-colors duration-150 text-xl px-1"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
              aria-label="Close chat"
            >
              ✕
            </button>
          </header>

          {/* Messages */}
          <div className="flex-1 px-4 py-3 flex flex-col gap-3 overflow-y-auto scrollbar-none">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                {m.role === 'assistant' ? (
                  <div
                    className="self-start max-w-[80%] rounded-2xl backdrop-blur-xl border px-4 py-2.5 text-sm shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]"
                    style={{
                      backgroundColor: 'var(--card-subtle)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                  >
                    {m.content}
                  </div>
                ) : (
                  <div className="self-end max-w-[80%] rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2.5 text-sm text-white">
                    {m.content}
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing indicator */}
            {isSending && (
              <div className="flex justify-start animate-fade-in">
                <div
                  className="rounded-2xl backdrop-blur-xl border px-4 py-2.5 flex items-center gap-1"
                  style={{
                    backgroundColor: 'var(--card-subtle)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full animate-typing" style={{ backgroundColor: 'var(--text-muted)', animationDelay: '0s' }} />
                    <span className="w-2 h-2 rounded-full animate-typing" style={{ backgroundColor: 'var(--text-muted)', animationDelay: '0.2s' }} />
                    <span className="w-2 h-2 rounded-full animate-typing" style={{ backgroundColor: 'var(--text-muted)', animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <footer
            className="flex items-center gap-2 px-4 py-3 border-t backdrop-blur-xl"
            style={{
              backgroundColor: 'var(--card-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <form
              className="flex items-center gap-2 w-full"
              onSubmit={handleSubmit}
            >
              <input
                type="text"
                placeholder="Ask your coach anything about your shift..."
                className="flex-1 rounded-full border backdrop-blur-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isSending}
              />
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 text-white px-4 py-2 text-sm font-medium shadow-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!input.trim() || isSending}
              >
                Send
              </button>
            </form>
          </footer>
        </div>
      </div>
    </div>
  )
}

