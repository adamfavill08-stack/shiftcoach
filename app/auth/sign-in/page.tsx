'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignIn() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('')
  const [err,setErr]=useState<string|undefined>(); const [busy,setBusy]=useState(false)
  const router=useRouter()

  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(undefined)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) return setErr(error.message)
    
    // Check if profile is complete
    const { data: u } = await supabase.auth.getUser()
    if (u.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, height_cm, weight_kg')
        .eq('user_id', u.user.id)
        .single()
      
      const isComplete = profile && profile.name && profile.height_cm && profile.weight_kg
      router.replace(isComplete ? '/dashboard' : '/onboarding')
    } else {
      router.replace('/dashboard')
    }
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100">Welcome back</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-100" placeholder="Email" type="email"
               value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-100" placeholder="Password" type="password"
               value={password} onChange={e=>setPassword(e.target.value)} required />
        {err && <p className="text-red-600 dark:text-red-400 text-sm">{err}</p>}
        <button disabled={busy} className="w-full rounded-xl py-2 font-semibold text-white bg-gradient-to-r from-orange-500 to-purple-600">
          {busy?'Signing in…':'Sign In'}
        </button>
        <div className="flex justify-between text-sm">
          <Link className="text-slate-600 dark:text-slate-400 underline" href="/auth/reset">Forgot password?</Link>
          <span className="text-slate-500 dark:text-slate-400">No account? <Link className="text-slate-900 dark:text-slate-100 underline" href="/auth/sign-up">Create one</Link></span>
        </div>
      </form>
    </main>
  )
}

