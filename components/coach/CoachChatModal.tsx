'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useCoachChat } from '@/lib/hooks/useCoachChat'

export function CoachChatModal({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('')
  const [coachContext, setCoachContext] = useState<any>(null)
  
  // Initialize with welcome message
  const { messages, isSending, sendMessage, setMessages } = useCoachChat([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hey, I'm your Shift Coach. What are you struggling with today – sleep, cravings, or energy on shift?",
    },
  ])

  useEffect(() => {
    const storedContext = localStorage.getItem('coach-context')
    if (storedContext) {
      const ctx = JSON.parse(storedContext)
      setCoachContext(ctx)
      localStorage.removeItem('coach-context') // Consume context
      
      // Adjust initial message based on context
      let initialMessage = "Hey, I'm your Shift Coach. What are you struggling with today – sleep, cravings, or energy on shift?"
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
      className="fixed inset-0 z-50 backdrop-blur-md flex items-end justify-center px-3 pb-4 md:items-center md:pb-0"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
    >
      {/* Enhanced ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-400/15 via-indigo-400/10 to-purple-400/15 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Chat container */}
      <div
        className="relative w-full max-w-[420px] rounded-[28px] backdrop-blur-2xl border overflow-hidden transition-all duration-300 animate-slide-up"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0_24px_60px_rgba(15,23,42,0.15), 0_0_0_1px_rgba(255,255,255,0.5), 0_8px_24px_rgba(14,165,233,0.1)',
        }}
      >
        {/* Ultra-premium gradient overlay with multiple layers */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 via-white/90 to-white/75" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/20" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sky-50/20 via-transparent to-transparent" />
        
        {/* Enhanced inner glow */}
        <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/70" />
        <div className="pointer-events-none absolute inset-[1px] rounded-[27px] ring-1 ring-white/40" />
        
        {/* Ambient glow effect */}
        <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-blue-100/40 via-indigo-100/25 to-purple-100/30 blur-xl opacity-60" />
        
        {/* Content */}
        <div className="relative flex flex-col h-[500px] max-h-[85vh] z-10">
          {/* Header */}
          <header
            className="flex items-center justify-between px-5 py-4 border-b backdrop-blur-xl relative"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              borderColor: 'rgba(148, 163, 184, 0.2)',
            }}
          >
            {/* Header gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/50 via-transparent to-white/30 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200/50 to-transparent" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-[0_4px_12px_rgba(15,23,42,0.08)] border border-white/80 relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/60 to-white/40" />
                <Image
                  src="/bubble-icon.png"
                  alt="Shift Coach"
                  width={24}
                  height={24}
                  className="w-6 h-6 object-contain relative z-10"
                  style={{
                    filter: 'brightness(0) saturate(100%) invert(15%) sepia(9%) saturate(1033%) hue-rotate(169deg) brightness(95%) contrast(88%)',
                  }}
                />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-bold tracking-tight text-slate-900">Shift Coach</p>
                <p className="text-xs text-slate-500 leading-relaxed">Chat about your shift, sleep or meals</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 hover:bg-white/95 border border-slate-200/60 shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
              aria-label="Close chat"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </header>

          {/* Messages */}
          <div className="flex-1 px-5 py-4 flex flex-col gap-3 overflow-y-auto scrollbar-none relative">
            {/* Messages gradient fade */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white/60 to-transparent pointer-events-none z-10" />
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/60 to-transparent pointer-events-none z-10" />
            
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in relative z-0`}
              >
                {m.role === 'assistant' ? (
                  <div
                    className="self-start max-w-[80%] rounded-2xl backdrop-blur-xl border px-4 py-3 text-sm relative overflow-hidden shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.85)',
                      borderColor: 'rgba(148, 163, 184, 0.25)',
                      color: '#0f172a',
                    }}
                  >
                    {/* Message gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-slate-50/30 pointer-events-none" />
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-white/40 pointer-events-none" />
                    <p className="relative z-10 leading-relaxed">{m.content}</p>
                  </div>
                ) : (
                  <div className="self-end max-w-[80%] rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-indigo-600 px-4 py-3 text-sm text-white shadow-[0_4px_16px_rgba(14,165,233,0.3),0_2px_8px_rgba(99,102,241,0.2)] relative overflow-hidden">
                    {/* User message shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
                    <p className="relative z-10 leading-relaxed font-medium">{m.content}</p>
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing indicator */}
            {isSending && (
              <div className="flex justify-start animate-fade-in relative z-0">
                <div
                  className="rounded-2xl backdrop-blur-xl border px-4 py-3 flex items-center gap-2 shadow-[0_4px_12px_rgba(15,23,42,0.08)] relative overflow-hidden"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    borderColor: 'rgba(148, 163, 184, 0.25)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-slate-50/30 pointer-events-none" />
                  <div className="flex gap-1.5 relative z-10">
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-typing" style={{ animationDelay: '0s' }} />
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-typing" style={{ animationDelay: '0.2s' }} />
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-typing" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <footer
            className="flex items-center gap-3 px-5 py-4 border-t backdrop-blur-xl relative"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              borderColor: 'rgba(148, 163, 184, 0.2)',
            }}
          >
            {/* Footer gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/50 via-transparent to-white/30 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200/50 to-transparent" />
            
            <form
              className="flex items-center gap-3 w-full relative z-10"
              onSubmit={handleSubmit}
            >
              <input
                type="text"
                placeholder="Ask your coach anything about your shift..."
                className="flex-1 rounded-full border backdrop-blur-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/50 transition-all shadow-sm"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderColor: 'rgba(148, 163, 184, 0.3)',
                  color: '#0f172a',
                }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isSending}
              />
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-indigo-600 text-white px-5 py-2.5 text-sm font-semibold shadow-[0_4px_16px_rgba(14,165,233,0.3),0_2px_8px_rgba(99,102,241,0.2)] hover:shadow-[0_6px_20px_rgba(14,165,233,0.4),0_4px_12px_rgba(99,102,241,0.3)] active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
                disabled={!input.trim() || isSending}
              >
                {/* Button shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent pointer-events-none" />
                <span className="relative z-10">Send</span>
              </button>
            </form>
          </footer>
        </div>
      </div>
    </div>
  )
}

