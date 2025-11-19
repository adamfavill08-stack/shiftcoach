'use client'

import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'

export default function Home() {
  const [result, setResult] = useState<'loading'|'ok'|'error'>('loading')
  const [payload, setPayload] = useState<any>(null)

  useEffect(() => {
    ;(async () => {
      // make sure table exists; if not, we'll get a clear error
      const { data, error } = await supabase.from('profiles').select('*').limit(1)

      if (error) { setResult('error'); setPayload(error.message); }
      else { setResult('ok'); setPayload(data); }
    })()
  }, [])

  return (
    <main className="p-10 text-gray-900 space-y-4">
      <h1 className="text-3xl font-bold">Shift Coach — Supabase Connectivity Check</h1>
      {result === 'loading' && <p>Checking Supabase…</p>}
      {result === 'ok' && (
        <>
          <p className="text-green-600">Connected to Supabase ✅</p>
          <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(payload, null, 2)}</pre>
        </>
      )}
      {result === 'error' && (
        <>
          <p className="text-red-600">Supabase error ❌</p>
          <pre className="bg-gray-100 p-4 rounded">{String(payload)}</pre>
          <p className="text-sm text-gray-600">If this says "permission denied" or "relation profiles does not exist", run the SQL below.</p>
        </>
      )}
    </main>
  )
}
