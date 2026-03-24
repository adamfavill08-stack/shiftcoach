'use client'

import { useState } from 'react'

export default function DeleteRequestPage() {
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
        setError(data?.error || 'Unable to submit request')
      } else {
        setMessage('Request received. We will process account/data deletion for this email.')
        setEmail('')
        setReason('')
      }
    } catch {
      setError('Unable to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow p-6 mt-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Request account deletion</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Use this page if you cannot sign in. If you can sign in, use the in-app deletion flow at{' '}
          <a href="/account/delete" className="underline">/account/delete</a>.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">Account email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              rows={4}
              placeholder="Optional details to help us process your request."
            />
          </div>

          <button
            onClick={submit}
            disabled={submitting || !email}
            className="w-full rounded-xl bg-slate-900 text-white py-2.5 font-semibold disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit deletion request'}
          </button>

          {message && <p className="text-green-700 dark:text-green-400 text-sm">{message}</p>}
          {error && <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>}
        </div>
      </div>
    </main>
  )
}

