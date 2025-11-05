import Link from 'next/link'

type TodayMealsCardProps = {
  adjustedCalories: number
  loggedCalories: number
  totalSlots: number
  loggedSlots: number
  nextSlotLabel?: string
  nextSlotTimeLabel?: string
}

export const TodayMealsCard: React.FC<TodayMealsCardProps> = ({
  adjustedCalories,
  loggedCalories,
  totalSlots,
  loggedSlots,
  nextSlotLabel,
  nextSlotTimeLabel,
}) => {
  const completion = adjustedCalories > 0
    ? Math.min(100, Math.round((loggedCalories / adjustedCalories) * 100))
    : 0
  const progressText = `${loggedSlots}/${totalSlots} meals logged`

  return (
    <Link href="/meals" className="block">
      <div
        className="rounded-3xl backdrop-blur-2xl border px-5 py-4 flex flex-col gap-3 cursor-pointer transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99]"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center text-xs text-white">🍽️</div>
            <div className="flex flex-col">
              <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Today's meals</p>
              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>{progressText}</p>
            </div>
          </div>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-soft)' }}>{completion}% of {adjustedCalories} kcal</p>
        </div>

        {/* Bottom row */}
        <div className="flex items-center gap-3">
          {/* Progress */}
          <div className="flex-1 flex flex-col gap-1">
            <div
              className="h-2.5 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--ring-bg)' }}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 transition-all duration-300"
                style={{ width: `${completion}%` }}
              />
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>Logged {loggedCalories} kcal</p>
          </div>

          {/* Next meal */}
          <div className="flex flex-col items-end gap-1">
            <p className="text-[11px]" style={{ color: 'var(--text-soft)' }}>Next meal</p>
            {nextSlotLabel ? (
              <div
                className="inline-flex flex-col items-end rounded-2xl px-3 py-1.5"
                style={{ backgroundColor: 'var(--card-subtle)' }}
              >
                <span className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>{nextSlotLabel}</span>
                {nextSlotTimeLabel && (
                  <span className="text-[11px]" style={{ color: 'var(--text-soft)' }}>{nextSlotTimeLabel}</span>
                )}
              </div>
            ) : (
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>All done for today</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}


