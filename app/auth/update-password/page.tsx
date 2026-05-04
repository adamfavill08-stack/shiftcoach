'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/providers/language-provider'

export default function UpdatePassword() {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setFeedback(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setFeedback({ kind: 'error', text: error.message })
      return
    }
    setFeedback({ kind: 'success', text: t('auth.updatePassword.success') })
    setTimeout(() => router.replace('/auth/sign-in'), 1000)
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100">
        {t('auth.updatePassword.title')}
      </h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-100"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          placeholder={t('auth.updatePassword.passwordPlaceholder')}
          required
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('auth.updatePassword.hint')}</p>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-[#05afc5] py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0499b0] active:bg-[#0489a0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? t('auth.updatePassword.updating') : t('auth.updatePassword.submit')}
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
