'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/components/providers/language-provider'

export default function Reset() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setFeedback(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/update-password`,
    })
    setBusy(false)
    if (error) {
      setFeedback({ kind: 'error', text: error.message })
      return
    }
    setFeedback({ kind: 'success', text: t('auth.reset.success') })
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100">
        {t('auth.reset.title')}
      </h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-100"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.reset.emailPlaceholder')}
          required
        />
        <button
          disabled={busy}
          className="w-full rounded-xl py-2 font-semibold text-white bg-gradient-to-r from-orange-500 to-purple-600 disabled:opacity-50"
        >
          {busy ? t('auth.reset.sending') : t('auth.reset.submit')}
        </button>
        {feedback && (
          <p
            className={`text-sm mt-2 ${
              feedback.kind === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {feedback.text}
          </p>
        )}
      </form>
    </main>
  )
}
