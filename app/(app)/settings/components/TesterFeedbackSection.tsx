'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Send } from 'lucide-react'
import { showToast } from '@/components/ui/Toast'
import { useAuth } from '@/components/AuthProvider'

export function TesterFeedbackSection() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!subject.trim() || !message.trim()) {
      showToast('Please fill in both subject and message', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          userEmail: user?.email || null,
          userId: user?.id || 'Unknown',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Show the actual error message from the API
        const errorMessage = data.error || 'Failed to send feedback'
        console.error('[TesterFeedback] API error:', errorMessage, data)
        throw new Error(errorMessage)
      }

      showToast('Feedback sent successfully! Thank you for your input.', 'success')
      setSubject('')
      setMessage('')
      setIsOpen(false)
    } catch (err: any) {
      console.error('Feedback submission error:', err)
      showToast(err.message || 'Failed to send feedback. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-slate-50/40 hover:bg-white/70 transition-colors w-full"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="h-9 w-9 rounded-xl bg-white/60 border border-slate-200/50 grid place-items-center flex-shrink-0">
            <Send className="h-4 w-4 text-slate-500" strokeWidth={2} />
          </div>
          <h3 className="text-sm font-medium text-slate-800">Contact Us</h3>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition flex-shrink-0" strokeWidth={2} />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition flex-shrink-0" strokeWidth={2} />
        )}
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 mx-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/50 shadow-[0_4px_12px_rgba(0,0,0,0.08)] p-4 space-y-4 z-20">
            <p className="text-xs text-slate-600 leading-relaxed">
              Found a bug or have a suggestion? Send us your feedback directly. We read every message!
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="feedback-subject" className="block text-xs font-semibold text-slate-900 mb-1.5">
                  Subject
                </label>
                <input
                  id="feedback-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Bug in sleep tracking"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder:text-slate-400"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="feedback-message" className="block text-xs font-semibold text-slate-900 mb-1.5">
                  Message
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe the issue or share your feedback..."
                  rows={5}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder:text-slate-400 resize-none"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !subject.trim() || !message.trim()}
                className="w-full py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-600 hover:from-blue-600 hover:via-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_12px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_16px_rgba(59,130,246,0.4)] rounded-xl flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Feedback</span>
                  </>
                )}
              </button>
            </form>
        </div>
      )}
    </div>
  )
}

