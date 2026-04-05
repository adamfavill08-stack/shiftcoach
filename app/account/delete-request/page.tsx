'use client'

import { useState } from 'react'
import { useTranslation } from '@/components/providers/language-provider'

export default function DeleteRequestPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSubmitting(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch('/api/account/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reason }),
      })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok || !data?.ok) {
        setError(data?.error || t('account.deleteRequest.error'))
      } else {
        setMessage(t('account.deleteRequest.success'))
        setEmail('')
        setReason('')
      }
    } catch {
      setError(t('account.deleteRequest.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
      <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow p-6 mt-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t('account.deleteRequest.title')}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {t('account.deleteRequest.intro')}{' '}
          <a href="/account/delete" className="underline">
            /account/delete
          </a>
          .
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
              {t('account.deleteRequest.emailLabel')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              placeholder={t('account.deleteRequest.emailPh')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
              {t('account.deleteRequest.reasonLabel')}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              rows={4}
              placeholder={t('account.deleteRequest.reasonPh')}
            />
          </div>

          <button
            onClick={submit}
            disabled={submitting || !email}
            className="w-full rounded-xl bg-slate-900 text-white py-2.5 font-semibold disabled:opacity-60"
          >
            {submitting ? t('account.deleteRequest.submitting') : t('account.deleteRequest.submit')}
          </button>

          {message && <p className="text-green-700 dark:text-green-400 text-sm">{message}</p>}
          {error && <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>}
        </div>
      </div>
    </main>
  )
}
