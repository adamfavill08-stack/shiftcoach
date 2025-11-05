type Props = {
  shiftRhythmScore?: number
  adjustedCalories?: number
  sleepHours?: number
  recoveryScore?: number
}

export default function ShiftRhythmCard({
  shiftRhythmScore = 82,
  adjustedCalories = 2190,
  sleepHours = 7,
  recoveryScore = 86,
}: Props) {
  const score = Math.max(0, Math.min(100, shiftRhythmScore))
  const radius = 32
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)

  return (
    <section className="rounded-3xl bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_18px_40px_rgba(15,23,42,0.18)] px-6 py-5">
      {/* Hero visual */}
      <div className="relative mb-4">
        {/* Glow halo */}
        <div className="absolute -top-6 -left-4 h-28 w-28 rounded-full bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-700 blur-2xl opacity-90" />

        <div className="flex items-center gap-4">
          {/* Head silhouette stub */}
          <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-slate-200/70 to-slate-50/60 border border-white/60 shadow-inner" />

          {/* Gauge */}
          <div className="relative h-20 w-20">
            <svg viewBox="0 0 100 100" className="h-20 w-20 -rotate-90">
              <defs>
                <linearGradient id="sr-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1d4ed8" />
                  <stop offset="60%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#fb923c" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r={radius} fill="transparent" stroke="rgba(255,255,255,0.35)" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="url(#sr-grad)"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-semibold text-white drop-shadow-md">{Math.round(score)}</span>
            </div>
          </div>
        </div>

        {/* Label pill */}
        <div className="mt-3 flex justify-center">
          <span className="rounded-2xl bg-white/60 border border-white/70 px-4 py-1 text-sm font-medium text-slate-600">Shift Rhythm™</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Adjusted" value={adjustedCalories.toLocaleString()} />
        <Metric label="Sleep Hours" value={sleepHours.toFixed(1)} />
      </div>
      <div className="mt-3">
        <Metric label="Recovery Score" value={Math.round(recoveryScore).toString()} full />
      </div>
    </section>
  )
}

function Metric({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={`${full ? 'w-full' : ''} rounded-2xl bg-white/60 border border-white/60 px-4 py-3`}>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}

