'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignUp() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('')
  const [err,setErr]=useState<string|undefined>(); const [busy,setBusy]=useState(false)
  const router=useRouter()

  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(undefined)
    const { error } = await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) return setErr(error.message)
    // Redirect to onboarding to complete profile
    router.replace('/onboarding')
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100">Create account</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-100" placeholder="Email" type="email"
               value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-100" placeholder="Password" type="password"
               value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required />
        {err && <p className="text-red-600 dark:text-red-400 text-sm">{err}</p>}
        <button disabled={busy} className="w-full rounded-xl py-2 font-semibold text-white bg-gradient-to-r from-orange-500 to-purple-600">
          {busy?'Creating…':'Sign Up'}
        </button>
        <p className="text-sm text-slate-500 dark:text-slate-400">Already have an account? <Link className="text-slate-900 dark:text-slate-100 underline" href="/auth/sign-in">Sign in</Link></p>
      </form>
    </main>
  )
}

