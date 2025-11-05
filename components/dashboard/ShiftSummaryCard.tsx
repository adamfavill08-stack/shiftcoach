'use client'

type Props = {
  shiftLabel?: string
  shiftTimeRange?: string
  rhythmScore: number // 0–100
}

export function ShiftSummaryCard({
  shiftLabel = 'Day off',
  shiftTimeRange = 'No shift today',
  rhythmScore,
}: Props) {
  const score = Math.max(0, Math.min(100, rhythmScore))
  const pct = score / 100

  const cx = 50
  const cy = 50
  const r = 40
  const baseArc = `M 10 50 A 40 40 0 0 1 90 50`

  const startX = cx + r
  const startY = cy
  const angle = Math.PI * (1 - pct)
  const endX = cx + r * Math.cos(angle)
  const endY = cy + r * Math.sin(angle)
  const largeArc = pct > 0.5 ? 1 : 0
  const progressArc = `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 0 ${endX} ${endY}`

  // Colour logic (dynamic gradient depending on score)
  const strokeColor =
    score > 80
      ? '#3B82F6' // Blue
      : score > 50
      ? '#F59E0B' // Amber
      : '#EF4444' // Red

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 p-5 flex items-center justify-between w-full max-w-md mx-auto">
      {/* Left section */}
      <div className="flex flex-col">
        <span className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          {shiftLabel}
        </span>
        <span className="text-base text-slate-600 dark:text-slate-400">{shiftTimeRange}</span>
      </div>

      {/* Right section: semicircle gauge */}
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 100 60" className="h-20 w-28">
          <path
            d={baseArc}
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={progressArc}
            stroke={strokeColor}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        <div className="-mt-8 mb-1 text-3xl font-bold text-slate-900 dark:text-slate-100 leading-none tracking-tight">
          {Math.round(score)}
        </div>
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Shift Rhythm<span className="align-top text-[10px]">™</span>
        </div>
      </div>
    </section>
  )
}
