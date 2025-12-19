'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'

export function DataPrivacySection() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleExportData = async () => {
    if (isExporting) return

    setIsExporting(true)
    try {
      const res = await fetch('/api/data/export?format=json', {
        credentials: 'include',
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to export data' }))
        showToast(errorData.error || 'Failed to export data', 'error')
        setIsExporting(false)
        return
      }

      // Get the JSON data
      const data = await res.json()

      // Create a blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shiftcoach-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast('Data exported successfully', 'success')
    } catch (err: any) {
      console.error('Export error:', err)
      showToast('Failed to export data', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  const handleLogout = async () => {
    if (isLoggingOut) return
    
    setIsLoggingOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
        showToast('Failed to log out. Please try again.', 'error')
        setIsLoggingOut(false)
      } else {
        router.push('/auth/sign-in')
        router.refresh()
      }
    } catch (err) {
      console.error('Logout error:', err)
      showToast('Failed to log out. Please try again.', 'error')
      setIsLoggingOut(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showToast('Please type DELETE to confirm', 'error')
      return
    }

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        showToast('Failed to delete account: No active session', 'error')
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
        showToast('Failed to delete account', 'error')
      } else {
        showToast('Account deleted', 'success')
        // Sign out and redirect
        await supabase.auth.signOut()
        router.push('/auth/sign-in')
      }
    } catch (err) {
      console.error('Delete error:', err)
      showToast('Failed to delete account', 'error')
    }
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-slate-50/40 hover:bg-white/70 transition-colors w-full"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="h-9 w-9 rounded-xl bg-white/60 border border-slate-200/50 grid place-items-center flex-shrink-0">
              <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-slate-800">Data & privacy</h3>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition flex-shrink-0" strokeWidth={2} />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition flex-shrink-0" strokeWidth={2} />
          )}
        </button>
        {isOpen && (
          <div className="mt-2 mx-2 mb-4 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/50 shadow-[0_4px_12px_rgba(0,0,0,0.08)] p-4 pb-5 space-y-1">
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between py-3 px-3 rounded-xl hover:bg-slate-50/60 transition-colors"
            >
              <span className="text-sm font-medium text-slate-800">Privacy Policy</span>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition" strokeWidth={2} />
            </a>
            <a
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between py-3 px-3 rounded-xl hover:bg-slate-50/60 transition-colors"
            >
              <span className="text-sm font-medium text-slate-800">Terms of Service</span>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition" strokeWidth={2} />
            </a>
            <a
              href="/health-data-notice"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between py-3 px-3 rounded-xl hover:bg-slate-50/60 transition-colors"
            >
              <span className="text-sm font-medium text-slate-800">Health Data Notice</span>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition" strokeWidth={2} />
            </a>
            <div className="h-px bg-slate-200/50 my-2" />
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="group flex items-center justify-between py-3 px-3 rounded-xl hover:bg-slate-50/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
            >
              <span className="text-sm font-medium text-slate-800">
                {isExporting ? 'Exporting...' : 'Export my data'}
              </span>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition" strokeWidth={2} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="group flex items-center justify-between py-3 px-3 rounded-xl hover:bg-slate-50/60 transition-colors w-full"
            >
              <span className="text-sm font-medium text-slate-800">Delete my account</span>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {/* Log out button - demoted */}
      <div className="mt-4">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full rounded-xl px-4 py-3 text-sm text-slate-500 hover:bg-slate-50/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoggingOut ? 'Logging out...' : 'Log out'}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl border border-red-200/50 shadow-[0_8px_24px_rgba(239,68,68,0.15)] p-6 w-full max-w-sm">
            <div className="absolute inset-0 bg-gradient-to-b from-red-50/30 via-white/90 to-white/85" />
            <div className="relative z-10">
              <h4 className="text-lg font-bold text-red-900 mb-2">Delete Account</h4>
              <p className="text-sm text-slate-600 mb-4">This action cannot be undone. Type DELETE to confirm.</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-4 py-3 border border-red-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4 transition-all bg-white text-slate-900"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteConfirmText('')
                  }}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-xl hover:from-red-700 hover:to-red-800 shadow-[0_4px_12px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_16px_rgba(239,68,68,0.4)] transition-all"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
