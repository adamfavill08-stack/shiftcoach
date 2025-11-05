'use client'

import { useEffect, useState } from 'react'
import type { Profile } from '@/lib/profile'
import { computeSleepInsight, type SleepInsight } from '@/lib/sleep-insight'

export function useSleepInsight(profile: Profile | null) {
  const [insight, setInsight] = useState<SleepInsight | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    ;(async () => {
      if (!profile) return
      setLoading(true)
      const i = await computeSleepInsight(profile)
      setInsight(i)
      setLoading(false)
    })()
  }, [profile])
  return { insight, loading, refresh: async ()=>{ if(profile){ setInsight(await computeSleepInsight(profile)) } } }
}

export function SleepInsightCard({ insight }: { insight: SleepInsight }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="text-xs text-slate-500 dark:text-slate-400">Sleep Insight</div>
      <div className="font-semibold text-slate-900 dark:text-slate-100">{insight.title}</div>
      <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{insight.summary}</div>
      <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
        {insight.bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
      {insight.scoreHints.length > 0 && (
        <div className="mt-2 text-sm">
          <span className="font-medium">How to boost Rhythm/Recovery:</span>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            {insight.scoreHints.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
