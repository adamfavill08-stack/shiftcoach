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
      className="fixed inset-0 z-50 px-3 bg-black/30 backdrop-blur-sm"
    >
      {/* Chat container - DRAGGABLE */}
      <div
        className="rounded-3xl border overflow-hidden transition-all duration-300 animate-slide-up bg-white border-slate-100 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)]"
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
        {/* Content */}
        <div className="relative flex flex-col h-[500px] max-h-[85vh] z-10">
          {/* Disclaimer Banner */}
          <div className="px-4 pt-3 pb-2 border-b bg-amber-50 border-amber-200/70">
            <div className="flex items-center gap-2 text-xs text-amber-800">
              <span className="font-semibold shrink-0">⚠️</span>
              <p className="leading-tight">
                This is wellbeing guidance, not medical advice. Consult a professional for medical concerns.{' '}
                <a
                  href="/health-data-notice"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
                >
                  Health Data Notice
                </a>
              </p>
            </div>
          </div>

          {/* Header - DRAG HANDLE */}
          <header
            className="flex items-center justify-between px-5 py-4 border-b relative cursor-grab active:cursor-grabbing bg-white border-slate-100"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 shadow-[0_4px_10px_rgba(56,189,248,0.35)] border border-sky-100 relative">
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
              className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 text-slate-500 hover:text-slate-700"
              aria-label="Close chat"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </header>

          {/* Messages */}
          <div className="flex-1 px-5 py-4 flex flex-col gap-3 overflow-y-auto scrollbar-none relative bg-slate-50">
            {/* Loading indicator for daily greeting */}
            {isLoadingGreeting && messages.length === 1 && messages[0].id === 'welcome' && (
              <div className="flex justify-start animate-fade-in relative z-0">
                <div
                  className="rounded-2xl border px-4 py-3 flex items-center gap-2 shadow-sm relative overflow-hidden bg-white border-slate-200"
                >
                  <div className="flex items-center gap-2 relative z-10">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin" />
                    <span className="text-sm text-slate-600">Calculating your personalized recommendations...</span>
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
                    className="self-start max-w-[80%] rounded-2xl bg-white border border-slate-200 px-4 py-3 text-sm relative overflow-hidden shadow-sm text-slate-900"
                  >
                    <p className="relative z-10 leading-relaxed">{m.content}</p>
                  </div>
                ) : (
                  <div className="self-end max-w-[80%] rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-indigo-600 px-4 py-3 text-sm text-white shadow-[0_4px_16px_rgba(14,165,233,0.3),0_2px_8px_rgba(99,102,241,0.2)] relative overflow-hidden">
                    <p className="relative z-10 leading-relaxed font-medium">{m.content}</p>
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing indicator */}
            {isSending && (
              <div className="flex justify-start animate-fade-in relative z-0">
                <div
                  className="rounded-2xl border px-4 py-3 flex items-center gap-2 shadow-sm relative overflow-hidden bg-white border-slate-200"
                >
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
            className="flex items-center gap-3 px-5 py-4 border-t relative bg-white border-slate-100"
          >
            <form
              className="flex items-center gap-3 w-full relative z-10"
              onSubmit={handleSubmit}
            >
              <input
                type="text"
                placeholder="Ask your coach anything about your shift..."
                className="flex-1 rounded-full border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/50 transition-all shadow-sm bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isSending}
              />
              <button
                type="submit"
                className="rounded-full bg-slate-900 text-white px-5 py-2.5 text-sm font-semibold shadow-[0_10px_26px_-14px_rgba(15,23,42,0.6)] hover:bg-slate-800 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed relative"
                disabled={!input.trim() || isSending}
              >
                <span className="relative z-10">Send</span>
              </button>
            </form>
            <a
              href="/health-data-notice"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-slate-400 hover:text-slate-600 hover:underline transition-colors absolute bottom-1 right-5"
            >
              Health Data Notice
            </a>
          </footer>
        </div>
      </div>
    </div>
  )
}

