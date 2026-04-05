'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Send } from 'lucide-react'
import { showToast } from '@/components/ui/Toast'
import { useAuth } from '@/components/AuthProvider'
import { useTranslation } from '@/components/providers/language-provider'

export function TesterFeedbackSection() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!subject.trim() || !message.trim()) {
      showToast(t('settings.feedback.toast.fillBoth'), 'error')
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
        const errorMessage = data.error || t('settings.feedback.toast.failed')
        console.error('[TesterFeedback] API error:', errorMessage, data)
        throw new Error(errorMessage)
      }

      showToast(t('settings.feedback.toast.success'), 'success')
      setSubject('')
      setMessage('')
      setIsOpen(false)
    } catch (err: any) {
      console.error('Feedback submission error:', err)
      showToast(err.message || t('settings.feedback.toast.failedRetry'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:border-sky-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] transition-colors w-full"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-400 grid place-items-center flex-shrink-0 shadow-sm">
            <Send className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <h3 className="text-sm font-medium text-slate-900">{t('settings.feedback.title')}</h3>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-slate-300 group-hover:text-sky-400 transition flex-shrink-0" strokeWidth={2} />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-sky-400 transition flex-shrink-0" strokeWidth={2} />
        )}
      </button>
      {isOpen && (
        <div className="mt-2 mx-2 mb-4 rounded-2xl bg-white border border-slate-100 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] p-4 pb-5 space-y-4">
          <p className="text-xs text-slate-700 leading-relaxed">
            {t('settings.feedback.intro')}
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="feedback-subject" className="block text-xs font-semibold text-slate-900 mb-1.5">
                {t('settings.feedback.subject')}
              </label>
              <input
                id="feedback-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('settings.feedback.subjectPlaceholder')}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder:text-slate-400"
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="feedback-message" className="block text-xs font-semibold text-slate-900 mb-1.5">
                {t('settings.feedback.message')}
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('settings.feedback.messagePlaceholder')}
                rows={5}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder:text-slate-400 resize-none"
                required
                disabled={isSubmitting}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !subject.trim() || !message.trim()}
              className="w-full py-2.5 text-sm font-semibold text-white bg-slate-900 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_10px_26px_-14px_rgba(15,23,42,0.6)] rounded-xl flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('settings.feedback.sending')}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t('settings.feedback.submit')}</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

