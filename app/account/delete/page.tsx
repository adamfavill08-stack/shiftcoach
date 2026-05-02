'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { clearHealthConnectNativeAuth } from '@/lib/native/clearHealthConnectNativeAuth'
import { showToast } from '@/components/ui/Toast'
import { useTranslation } from '@/components/providers/language-provider'

export default function DeleteAccountPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session)
      } catch (err) {
        console.error('Auth check error:', err)
      } finally {
        setIsChecking(false)
      }
    }
    checkAuth()
  }, [])

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showToast(t('account.delete.toastConfirm'), 'error')
      return
    }

    setIsDeleting(true)
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        showToast(t('account.delete.toastNeedSignIn'), 'error')
        router.push('/auth/sign-in?redirect=/account/delete')
        return
      }

      // Call the API route to delete the account
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        showToast(data.error || t('account.delete.toastFailed'), 'error')
        setIsDeleting(false)
      } else {
        showToast(t('account.delete.toastSuccess'), 'success')
        await clearHealthConnectNativeAuth()
        await supabase.auth.signOut()
        setTimeout(() => {
          router.push('/auth/sign-in')
        }, 2000)
      }
    } catch (err) {
      console.error('Delete error:', err)
      showToast(t('account.delete.toastRetry'), 'error')
      setIsDeleting(false)
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 dark:border-slate-400 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">{t('account.delete.loading')}</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            {t('account.delete.signInTitle')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {t('account.delete.signInBody')}
          </p>
          <button
            onClick={() => router.push('/auth/sign-in?redirect=/account/delete')}
            className="w-full py-3 px-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            {t('account.delete.signInCta')}
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full mt-3 py-3 px-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            {t('account.delete.goHome')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden border border-red-200/50 dark:border-red-800/40">
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-b from-red-50/30 dark:from-red-950/30 via-white dark:via-slate-800 to-white dark:to-slate-800 p-6 border-b border-red-200/50 dark:border-red-800/40">
            <h1 className="text-2xl font-bold text-red-900 dark:text-red-300 mb-2">
              {t('account.delete.title')}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('account.delete.subtitleSignedIn')}
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="bg-red-50/50 dark:bg-red-950/20 rounded-xl p-4 border border-red-200 dark:border-red-900/40">
              <p className="text-sm text-red-800 dark:text-red-300 font-medium mb-2">
                {t('account.delete.listHeading')}
              </p>
              <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 list-disc list-inside">
                <li>{t('account.delete.bulletSleep')}</li>
                <li>{t('account.delete.bulletRota')}</li>
                <li>{t('account.delete.bulletNutrition')}</li>
                <li>{t('account.delete.bulletActivity')}</li>
                <li>{t('account.delete.bulletProfile')}</li>
                <li>{t('account.delete.bulletCalendar')}</li>
                <li>{t('account.delete.bulletBilling')}</li>
              </ul>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('account.delete.typeDelete')}
              </label>
              <input
                id="confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={t('account.delete.placeholderDelete')}
                className="w-full px-4 py-3 border border-red-300 dark:border-red-800/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-400 transition-all bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/settings')}
                disabled={isDeleting}
                className="flex-1 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('account.delete.cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                className="flex-1 py-3 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 dark:from-red-500 dark:to-red-600 rounded-xl hover:from-red-700 hover:to-red-800 dark:hover:from-red-600 dark:hover:to-red-700 shadow-[0_4px_12px_rgba(239,68,68,0.3)] dark:shadow-[0_4px_12px_rgba(239,68,68,0.5)] hover:shadow-[0_6px_16px_rgba(239,68,68,0.4)] dark:hover:shadow-[0_6px_16px_rgba(239,68,68,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                {isDeleting ? t('account.delete.deleting') : t('account.delete.confirm')}
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
          {t('account.delete.footerNote')}
          <br />
          <a
            href="/account/delete-request"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-700 dark:hover:text-slate-300 mr-2"
          >
            {t('account.delete.footerWebRequest')}
          </a>
          •
          {' '}
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-700 dark:hover:text-slate-300"
          >
            {t('account.delete.footerPrivacy')}
          </a>
        </p>
      </div>
    </div>
  )
}
