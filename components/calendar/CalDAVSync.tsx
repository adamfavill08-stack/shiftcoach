'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Plus, Trash2, Globe, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface CalDAVAccount {
  id: number
  displayName: string
  email: string
  url: string
  username: string
  syncEnabled: boolean
  lastSyncAt?: string | null
}

export function CalDAVSync() {
  const [accounts, setAccounts] = useState<CalDAVAccount[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    url: '',
    username: '',
    password: '',
  })

  useEffect(() => {
    void loadAccounts()
  }, [])

  async function loadAccounts() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/calendar/caldav')
      if (!res.ok) {
        let message = 'Unable to load CalDAV accounts.'
        try {
          const json = await res.json()
          if (json?.error) message = json.error
        } catch {
          // ignore
        }
        setError(message)
        setAccounts([])
        return
      }
      const data = await res.json()
      setAccounts(data.accounts ?? [])
    } catch (err: any) {
      console.error('Error loading CalDAV accounts:', err)
      setError(err.message || 'Unable to load CalDAV accounts.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddAccount() {
    if (!formData.url || !formData.username || !formData.password) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/calendar/caldav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: formData.displayName,
          email: formData.email,
          url: formData.url,
          username: formData.username,
          password: formData.password,
          syncEnabled: true,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to add CalDAV account')
      }
      await loadAccounts()
      setFormData({ displayName: '', email: '', url: '', username: '', password: '' })
      setShowAddForm(false)
    } catch (err) {
      console.error('Error adding account:', err)
      setError(err.message || 'Failed to add CalDAV account')
    } finally {
      setLoading(false)
    }
  }

  async function handleSync(accountId: number) {
    try {
      setSyncing(accountId)
      // For now, just update last_sync_at in the database – external sync will come later.
      const nowIso = new Date().toISOString()
      const res = await fetch(`/api/calendar/caldav/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastSyncAt: nowIso }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to update sync status')
      }
      await loadAccounts()
    } catch (err) {
      console.error('Sync error:', err)
      setError(err.message || 'Failed to sync calendar')
    } finally {
      setSyncing(null)
    }
  }

  async function handleDelete(accountId: number) {
    if (!confirm('Delete this CalDAV account?')) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/calendar/caldav/${accountId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to delete CalDAV account')
      }
      await loadAccounts()
    } catch (err: any) {
      console.error('Error deleting CalDAV account:', err)
      setError(err.message || 'Failed to delete CalDAV account')
    } finally {
      setLoading(false)
    }
  }

  function toggleSync(accountId: number) {
    const account = accounts.find(a => a.id === accountId)
    if (!account) return
    const nextEnabled = !account.syncEnabled
    // Fire and forget; UI will refresh via loadAccounts in handleSync / external triggers later
    fetch(`/api/calendar/caldav/${accountId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncEnabled: nextEnabled }),
    }).catch(err => console.error('Failed to toggle CalDAV syncEnabled', err))
    setAccounts(accounts.map(acc =>
      acc.id === accountId
        ? { ...acc, syncEnabled: nextEnabled }
        : acc
    ))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            CalDAV Sync
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sync with external calendars (Google Calendar, iCloud, etc.)
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="h-9 px-4 rounded-xl bg-slate-900 text-slate-50 text-sm font-medium
                     shadow-[0_14px_30px_rgba(15,23,42,0.6)]
                     hover:bg-slate-900/95 hover:shadow-[0_18px_40px_rgba(15,23,42,0.75)]
                     active:scale-[0.98] transition-colors transition-transform flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-2xl bg-gradient-to-r from-red-50/80 via-rose-50/80 to-red-50/80 dark:from-red-950/30 dark:via-rose-950/25 dark:to-red-950/30 border border-red-200/80 dark:border-red-800/60 px-4 py-3 text-xs text-red-600 dark:text-red-300 shadow-sm">
          {error}
        </div>
      )}

      {/* Add Account Form */}
      {showAddForm && (
        <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Calendar Name (optional)
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="My Google Calendar"
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@example.com"
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              CalDAV URL *
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://caldav.example.com/calendars/user/"
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
              required
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Google: https://apidata.googleusercontent.com/caldav/v2/
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Username *
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="username"
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Password *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddAccount}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-slate-900 text-slate-50 text-sm font-medium
                         shadow-[0_14px_30px_rgba(15,23,42,0.6)]
                         hover:bg-slate-900/95 hover:shadow-[0_18px_40px_rgba(15,23,42,0.75)]
                         active:scale-[0.98] transition-colors transition-transform disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Account'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setFormData({ displayName: '', email: '', url: '', username: '', password: '' })
              }}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Accounts List */}
      {accounts.length === 0 && !showAddForm ? (
        <div className="rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-8 text-center">
          <Globe className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No CalDAV accounts configured
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {account.displayName}
                    </h4>
                    {account.syncEnabled ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {account.email}
                  </p>
                  {account.lastSyncAt && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Last synced: {new Date(account.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSync(account.id)}
                    disabled={syncing === account.id || !account.syncEnabled}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-300 transition disabled:opacity-50"
                    title="Sync now"
                  >
                    {syncing === account.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleSync(account.id)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-300 transition"
                    title={account.syncEnabled ? 'Disable sync' : 'Enable sync'}
                  >
                    {account.syncEnabled ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400 transition"
                    title="Delete account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

