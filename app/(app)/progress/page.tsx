'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, MoonStar, Activity, MessageCircle, Settings2, Watch, Send } from 'lucide-react'
import { useTranslation } from '@/components/providers/language-provider'
import { showToast } from '@/components/ui/Toast'
import { useAuth } from '@/components/AuthProvider'

export default function BrowsePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [showFeedback, setShowFeedback] = useState(false)
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
        const errorMessage = data.error || 'Failed to send feedback'
        console.error('[BrowseFeedback] API error:', errorMessage, data)
        throw new Error(errorMessage)
      }

      showToast('Feedback sent successfully! Thank you for your input.', 'success')
      setSubject('')
      setMessage('')
      setShowFeedback(false)
    } catch (err: any) {
      console.error('Feedback submission error:', err)
      showToast(err.message || 'Failed to send feedback. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
          {/* Header */}
          <header className="mb-1">
            <h1 className="text-xl font-semibold text-slate-900">
              {t('browse.title')}
            </h1>
            <p className="text-sm text-slate-600">
              {t('browse.subtitle')}
            </p>
          </header>

          {/* Search bar */}
          <div className="relative">
            <div className="flex items-center gap-2 rounded-2xl bg-white/90 border border-slate-200/70 px-3 py-2 shadow-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search help, topics, logs…"
                className="w-full bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Quick access tiles */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <BrowseTile
              href="/sleep/logs"
              icon={MoonStar}
              label={t('browse.sleepLog.title')}
              description={t('browse.sleepLog.desc')}
            />
            <BrowseTile
              href="/activity/log"
              icon={Activity}
              label={t('browse.activity.title')}
              description={t('browse.activity.desc')}
            />
            <BrowseTile
              href="/coach"
              icon={MessageCircle}
              label={t('browse.shiftCoach.title')}
              description={t('browse.shiftCoach.desc')}
            />
            <BrowseTile
              href="/settings"
              icon={Settings2}
              label={t('browse.settings.title')}
              description={t('browse.settings.desc')}
            />
            <BrowseTile
              href="/wearables-setup"
              icon={Watch}
              label={t('browse.wearables.title')}
              description={t('browse.wearables.desc')}
            />
            <BrowseTile
              icon={Send}
              label={t('browse.feedback.title')}
              description={t('browse.feedback.desc')}
              onClick={() => setShowFeedback(true)}
            />
          </div>
        </div>
      </main>

      {showFeedback && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] p-6 w-full max-w-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Report a problem</h2>
            <p className="text-xs text-slate-600 mb-4">
              Send feedback or report a bug. Your message is emailed securely to the ShiftCoach team.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="browse-feedback-subject" className="block text-xs font-semibold text-slate-900 mb-1.5">
                  Subject
                </label>
                <input
                  id="browse-feedback-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Issue with sleep logging"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder:text-slate-400"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="browse-feedback-message" className="block text-xs font-semibold text-slate-900 mb-1.5">
                  Message
                </label>
                <textarea
                  id="browse-feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe what happened, including device and OS if helpful…"
                  rows={5}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder:text-slate-400 resize-none"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (isSubmitting) return
                    setShowFeedback(false)
                  }}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !subject.trim() || !message.trim()}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_26px_-14px_rgba(15,23,42,0.6)] transition-all"
                >
                  {isSubmitting ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

type TileProps = {
  href?: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  description: string
  onClick?: () => void
}

function BrowseTile({ href, icon: Icon, label, description, onClick }: TileProps) {
  const Wrapper: any = href && !onClick ? Link : 'button'
  const wrapperProps =
    href && !onClick
      ? { href }
      : {
          type: 'button',
          onClick,
        }

  return (
    <Wrapper
      {...wrapperProps}
      className="flex flex-col gap-2 rounded-2xl bg-white/90 border border-slate-200/70 px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
          <Icon className="h-4 w-4 text-blue-600" />
        </div>
        <span className="text-sm font-semibold text-slate-900">
          {label}
        </span>
      </div>
      <p className="text-[11px] leading-snug text-slate-500">
        {description}
      </p>
    </Wrapper>
  )
}

