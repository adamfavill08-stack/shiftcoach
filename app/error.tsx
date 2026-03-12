'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log so it can be seen in remote debugging / logcat
    console.error('[App Error]', error.message, error.digest, error)
  }, [error])

  const isConfigError =
    error.message?.includes('Supabase') ||
    error.message?.includes('environment') ||
    error.message?.includes('NEXT_PUBLIC_')

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Something went wrong
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {isConfigError
            ? 'The app could not connect. Please check your connection and try again.'
            : 'We hit an unexpected error. Please try again.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-sm font-medium hover:opacity-90 active:opacity-80"
        >
          Try again
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-500">
          If this keeps happening, try closing the app and opening it again, or check your internet connection.
        </p>
      </div>
    </main>
  )
}
