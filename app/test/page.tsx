'use client'

import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [data, setData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from('profiles').select('*').limit(1)

      if (error) setError(error.message)
      else setData(data || [])
    }

    fetchData()
  }, [])

  return (
    <div className="p-6 text-gray-800">
      <h1 className="text-2xl font-bold mb-4">Supabase Test</h1>
      {error && <p className="text-red-500">Error: {error}</p>}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}

