'use client'

type GuidanceRecommendation = {
  type: 'sleep' | 'nap' | 'meal' | 'caffeine' | 'light' | 'hydration' | 'warning'
  urgency: 'low' | 'medium' | 'high'
  reason: string
  suggestedWindow: string
}

type DailyGuidance = {
  fatigueRisk: 'low' | 'moderate' | 'high' | 'critical'
  dayType: 'normal' | 'transition_to_nights' | 'recovery_from_nights' | 'rest_day' | 'night_shift' | 'early_shift'
  primaryRecommendation: string
  recommendations: GuidanceRecommendation[]
  projectedAwakeHours: number | null
}

export function DailyGuidanceCard({ guidance }: { guidance: DailyGuidance | null }) {
  if (!guidance) return null

  const riskColor =
    guidance.fatigueRisk === 'critical'
      ? 'text-rose-700 bg-rose-50 border-rose-200'
      : guidance.fatigueRisk === 'high'
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : guidance.fatigueRisk === 'moderate'
          ? 'text-blue-700 bg-blue-50 border-blue-200'
          : 'text-emerald-700 bg-emerald-50 border-emerald-200'

  const topThree = guidance.recommendations.slice(0, 3)

  return (
    <section className="mx-4 mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Today&apos;s Shift Guidance</h2>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${riskColor}`}>
          {guidance.fatigueRisk.toUpperCase()}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-900">{guidance.primaryRecommendation}</p>
      {guidance.projectedAwakeHours != null ? (
        <p className="mt-1 text-xs text-slate-600">
          Projected awake time before next sleep: {guidance.projectedAwakeHours.toFixed(1)}h
        </p>
      ) : null}
      <div className="mt-3 space-y-2">
        {topThree.map((r, idx) => (
          <div key={`${r.type}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              {r.type} · {r.urgency}
            </p>
            <p className="mt-0.5 text-xs text-slate-700">{r.reason}</p>
            <p className="mt-1 text-[11px] font-medium text-slate-900">{r.suggestedWindow}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

