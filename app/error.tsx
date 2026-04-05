'use client'

import { useEffect } from 'react'
import { useTranslation } from '@/components/providers/language-provider'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useTranslation()
  useEffect(() => {
    // Log so it can be seen in remote debugging / logcat
    console.error('[App Error]', error.message, error.digest, error)
  }, [error])

  const isConfigError =
    error.message?.includes('Supabase') ||
    error.message?.includes('environment') ||
    error.message?.includes('NEXT_PUBLIC_')

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          {t('appError.title')}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {isConfigError ? t('appError.configBody') : t('appError.genericBody')}
        </p>
        <button
          type="button"
          onClick={reset}
          className="px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-sm font-medium hover:opacity-90 active:opacity-80"
        >
          {t('appError.tryAgain')}
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-500">
          {t('appError.footer')}
        </p>
      </div>
    </main>
  )
}
