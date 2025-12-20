'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useCoachChat } from '@/lib/hooks/useCoachChat'
import { 
  hasSeenGreetingToday, 
  markGreetingAsSeen, 
  generateDailyGreeting,
  type GreetingContext 
} from '@/lib/coach/dailyGreeting'

export function CoachChatModal({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('')
  const [coachContext, setCoachContext] = useState<any>(null)
  const [isLoadingGreeting, setIsLoadingGreeting] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  // Initialize with welcome message
  const { messages, isSending, sendMessage, setMessages } = useCoachChat([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hey, I'm your Shift Coach. What are you struggling with today – sleep, cravings, or energy on shift?",
    },
  ])

  // Load saved position from localStorage on mount
  useEffect(() => {
    const savedPosition = localStorage.getItem('coach-chat-position')
    if (savedPosition) {
      try {
        const { x, y } = JSON.parse(savedPosition)
        setPosition({ x, y })
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [])

  // Save position to localStorage when it changes
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem('coach-chat-position', JSON.stringify(position))
    }
  }, [position])

  // Handle drag start (mouse and touch)
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    // If position is default (0,0), calculate from centered position
    let currentX = position.x
    let currentY = position.y
    
    if (position.x === 0 && position.y === 0) {
      // Modal is centered, so calculate actual position
      const modalElement = (e.target as HTMLElement).closest('[style*="position: fixed"]') as HTMLElement
      if (modalElement) {
        const rect = modalElement.getBoundingClientRect()
        currentX = rect.left
        currentY = rect.top
        setPosition({ x: currentX, y: currentY })
      } else {
        // Fallback: assume centered
        currentX = (window.innerWidth - 420) / 2
        currentY = window.innerHeight * 0.25
        setPosition({ x: currentX, y: currentY })
      }
    }
    
    setDragStart({
      x: clientX - currentX,
      y: clientY - currentY,
    })
  }

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // Add global event listeners for dragging
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const clientX = e.clientX
      const clientY = e.clientY
      
      // Calculate new position
      let newX = clientX - dragStart.x
      let newY = clientY - dragStart.y
      
      // Constrain to viewport (accounting for modal width ~420px and height ~500px)
      const maxX = window.innerWidth - 420
      const maxY = window.innerHeight - 500
      newX = Math.max(0, Math.min(newX, maxX))
      newY = Math.max(0, Math.min(newY, maxY))
      
      setPosition({ x: newX, y: newY })
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const clientX = e.touches[0].clientX
      const clientY = e.touches[0].clientY
      
      // Calculate new position
      let newX = clientX - dragStart.x
      let newY = clientY - dragStart.y
      
      // Constrain to viewport
      const maxX = window.innerWidth - 420
      const maxY = window.innerHeight - 500
      newX = Math.max(0, Math.min(newX, maxX))
      newY = Math.max(0, Math.min(newY, maxY))
      
      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => handleDragEnd()
    const handleTouchEnd = () => handleDragEnd()

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, dragStart])

  // Check for daily greeting on mount
  useEffect(() => {
    const loadDailyGreeting = async () => {
      // First check if there's stored context (takes priority)
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
        return // Don't show daily greeting if there's stored context
      }

      // Check if we've already shown the greeting today
      if (hasSeenGreetingToday()) {
        return // Already shown today, use default message
      }

      // Fetch greeting context and show personalized greeting
      setIsLoadingGreeting(true)
      try {
        const res = await fetch('/api/coach/daily-greeting')
        const data = await res.json()
        
        const greetingContext: GreetingContext = {
          userName: data.userName,
          todayShift: data.todayShift,
          todayEvent: data.todayEvent,
        }
        
        const greetingMessage = generateDailyGreeting(greetingContext)
        
        // Update the welcome message with personalized greeting
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: greetingMessage,
          },
        ])
        
        // Mark greeting as seen for today
        markGreetingAsSeen()
      } catch (err) {
        console.error('[CoachChatModal] Error loading daily greeting:', err)
        // Keep default message on error
      } finally {
        setIsLoadingGreeting(false)
      }
    }

    loadDailyGreeting()
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
      className="fixed inset-0 z-50 backdrop-blur-md px-3 bg-black/60 dark:bg-black/70"
    >
      {/* Enhanced ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-400/15 dark:from-sky-500/10 via-indigo-400/10 dark:via-indigo-500/8 to-purple-400/15 dark:to-purple-500/10 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 dark:from-blue-600/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Chat container - DRAGGABLE */}
      <div
        className="rounded-[28px] backdrop-blur-2xl border overflow-hidden transition-all duration-300 animate-slide-up bg-white/95 dark:bg-slate-900/95 border-white/90 dark:border-slate-700/40 shadow-[0_24px_60px_rgba(15,23,42,0.15),0_0_0_1px_rgba(255,255,255,0.5),0_8px_24px_rgba(14,165,233,0.1)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]"
        style={{
          width: '100%',
          maxWidth: '420px',
          position: 'fixed',
          left: position.x !== 0 ? `${position.x}px` : '50%',
          top: position.y !== 0 ? `${position.y}px` : '25%',
          transform: position.x !== 0 ? 'none' : 'translateX(-50%)',
          zIndex: 9999,
          cursor: isDragging ? 'grabbing' : 'default',
          userSelect: 'none',
        }}
      >
        {/* Ultra-premium gradient overlay with multiple layers */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 dark:from-slate-900/70 via-white/90 dark:via-slate-900/50 to-white/75 dark:to-slate-950/60" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/30 dark:from-blue-950/20 via-transparent to-indigo-50/20 dark:to-indigo-950/15" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sky-50/20 dark:from-sky-950/15 via-transparent to-transparent" />
        
        {/* Subtle colored glow hints - dark mode only */}
        <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
        
        {/* Enhanced inner glow */}
        <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/70 dark:ring-slate-600/30" />
        <div className="pointer-events-none absolute inset-[1px] rounded-[27px] ring-1 ring-white/40 dark:ring-slate-700/20" />
        
        {/* Content */}
        <div className="relative flex flex-col h-[500px] max-h-[85vh] z-10">
          {/* Header - DRAG HANDLE */}
          <header
            className="flex items-center justify-between px-5 py-4 border-b backdrop-blur-xl relative cursor-grab active:cursor-grabbing bg-white/85 dark:bg-slate-900/70 border-slate-200/20 dark:border-slate-700/40"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            {/* Header gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/50 dark:from-slate-900/50 via-transparent to-white/30 dark:to-slate-900/30 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200/50 dark:via-slate-700/50 to-transparent" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 dark:bg-slate-800/50 shadow-[0_4px_12px_rgba(15,23,42,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] border border-white/80 dark:border-slate-700/40 relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/60 dark:from-slate-800/60 to-white/40 dark:to-slate-900/40" />
                <Image
                  src="/bubble-icon.png"
                  alt="Shift Coach"
                  width={24}
                  height={24}
                  className="w-6 h-6 object-contain relative z-10 dark:brightness-110"
                  style={{
                    filter: 'brightness(0) saturate(100%) invert(15%) sepia(9%) saturate(1033%) hue-rotate(169deg) brightness(95%) contrast(88%)',
                  }}
                />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">Shift Coach</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Chat about your shift, sleep or meals</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/50 hover:bg-white/95 dark:hover:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/40 shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Close chat"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </header>

          {/* Messages */}
          <div className="flex-1 px-5 py-4 flex flex-col gap-3 overflow-y-auto scrollbar-none relative">
            {/* Messages gradient fade */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white/60 dark:from-slate-900/60 to-transparent pointer-events-none z-10" />
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/60 dark:from-slate-900/60 to-transparent pointer-events-none z-10" />
            
            {/* Loading indicator for daily greeting */}
            {isLoadingGreeting && messages.length === 1 && messages[0].id === 'welcome' && (
              <div className="flex justify-start animate-fade-in relative z-0">
                <div
                  className="rounded-2xl backdrop-blur-xl border px-4 py-3 flex items-center gap-2 shadow-[0_4px_12px_rgba(15,23,42,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] relative overflow-hidden bg-white/85 dark:bg-slate-800/50 border-slate-200/25 dark:border-slate-700/40"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 dark:from-slate-800/50 via-transparent to-slate-50/30 dark:to-slate-900/30 pointer-events-none" />
                  <div className="flex items-center gap-2 relative z-10">
                    <div className="w-4 h-4 border-2 border-slate-400 dark:border-slate-500 border-t-sky-500 dark:border-t-sky-400 rounded-full animate-spin" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">Calculating your personalized recommendations...</span>
                  </div>
                </div>
              </div>
            )}
            
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in relative z-0`}
              >
                {m.role === 'assistant' ? (
                  <div
                    className="self-start max-w-[80%] rounded-2xl backdrop-blur-xl border px-4 py-3 text-sm relative overflow-hidden shadow-[0_4px_12px_rgba(15,23,42,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] bg-white/85 dark:bg-slate-800/50 border-slate-200/25 dark:border-slate-700/40 text-slate-900 dark:text-slate-100"
                  >
                    {/* Message gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 dark:from-slate-800/50 via-transparent to-slate-50/30 dark:to-slate-900/30 pointer-events-none" />
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-white/40 dark:ring-slate-700/30 pointer-events-none" />
                    <p className="relative z-10 leading-relaxed">{m.content}</p>
                  </div>
                ) : (
                  <div className="self-end max-w-[80%] rounded-2xl bg-gradient-to-r from-sky-500 dark:from-sky-600 via-indigo-500 dark:via-indigo-600 to-indigo-600 dark:to-indigo-700 px-4 py-3 text-sm text-white shadow-[0_4px_16px_rgba(14,165,233,0.3),0_2px_8px_rgba(99,102,241,0.2)] dark:shadow-[0_4px_16px_rgba(14,165,233,0.4),0_2px_8px_rgba(99,102,241,0.3)] relative overflow-hidden">
                    {/* User message shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 dark:from-white/10 via-transparent to-transparent pointer-events-none" />
                    <p className="relative z-10 leading-relaxed font-medium">{m.content}</p>
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing indicator */}
            {isSending && (
              <div className="flex justify-start animate-fade-in relative z-0">
                <div
                  className="rounded-2xl backdrop-blur-xl border px-4 py-3 flex items-center gap-2 shadow-[0_4px_12px_rgba(15,23,42,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] relative overflow-hidden bg-white/85 dark:bg-slate-800/50 border-slate-200/25 dark:border-slate-700/40"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 dark:from-slate-800/50 via-transparent to-slate-50/30 dark:to-slate-900/30 pointer-events-none" />
                  <div className="flex gap-1.5 relative z-10">
                    <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-typing" style={{ animationDelay: '0s' }} />
                    <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-typing" style={{ animationDelay: '0.2s' }} />
                    <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-typing" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <footer
            className="flex items-center gap-3 px-5 py-4 border-t backdrop-blur-xl relative bg-white/85 dark:bg-slate-900/70 border-slate-200/20 dark:border-slate-700/40"
          >
            {/* Footer gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/50 dark:from-slate-900/50 via-transparent to-white/30 dark:to-slate-900/30 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200/50 dark:via-slate-700/50 to-transparent" />
            
            <form
              className="flex items-center gap-3 w-full relative z-10"
              onSubmit={handleSubmit}
            >
              <input
                type="text"
                placeholder="Ask your coach anything about your shift..."
                className="flex-1 rounded-full border backdrop-blur-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50 focus:border-sky-400/50 dark:focus:border-sky-500/50 transition-all shadow-sm bg-white/95 dark:bg-slate-800/50 border-slate-200/30 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isSending}
              />
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-sky-500 dark:from-sky-600 via-indigo-500 dark:via-indigo-600 to-indigo-600 dark:to-indigo-700 text-white px-5 py-2.5 text-sm font-semibold shadow-[0_4px_16px_rgba(14,165,233,0.3),0_2px_8px_rgba(99,102,241,0.2)] dark:shadow-[0_4px_16px_rgba(14,165,233,0.4),0_2px_8px_rgba(99,102,241,0.3)] hover:shadow-[0_6px_20px_rgba(14,165,233,0.4),0_4px_12px_rgba(99,102,241,0.3)] dark:hover:shadow-[0_6px_20px_rgba(14,165,233,0.5),0_4px_12px_rgba(99,102,241,0.4)] active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
                disabled={!input.trim() || isSending}
              >
                {/* Button shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/25 dark:from-white/10 via-transparent to-transparent pointer-events-none" />
                <span className="relative z-10">Send</span>
              </button>
            </form>
          </footer>
        </div>
      </div>
    </div>
  )
}

