'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  const submit = async (e:React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    setMsg(error ? error.message : 'Password updated. Redirecting…')
    if (!error) setTimeout(()=>router.replace('/auth/sign-in'), 1000)
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100">Set a new password</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-100"
          type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} placeholder="New password" required />
        <button disabled={busy} className="w-full rounded-xl py-2 font-semibold text-white bg-gradient-to-r from-orange-500 to-purple-600 disabled:opacity-50">
          {busy ? 'Updating…' : 'Update password'}
        </button>
        {msg && <p className={`text-sm mt-2 ${msg.includes('Password updated') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{msg}</p>}
      </form>
    </main>
  )
}

