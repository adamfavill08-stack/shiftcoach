'use client'

type ShiftRhythmGaugeProps = {
  score: number | null
}

export function ShiftRhythmGauge({ score }: ShiftRhythmGaugeProps) {
  const hasScore = typeof score === 'number' && !Number.isNaN(score)
  const clamped = hasScore ? Math.max(0, Math.min(10, score as number)) : 0

  const display = clamped.toFixed(1)

  const size = 300
  const strokeWidth = 22
  const radius = size / 2 - strokeWidth / 2

  return (
    <div className="relative flex items-center justify-center py-8">
      <div className="relative w-full max-w-md rounded-[36px] bg-white px-6 pt-10 pb-12 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
        <div className="relative flex items-center justify-center">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-300">
            <div className="absolute -top-1 flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300/80 text-[15px]">
                ☀️
              </div>
            </div>

            <div className="absolute left-4 flex flex-col gap-16 text-xl">
              <span>🌙</span>
              <span className="opacity-80">🌙</span>
            </div>

            <div className="absolute right-5 flex flex-col gap-16 text-xl">
              <span>💼</span>
              <span>🍽️</span>
            </div>
          </div>

          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <defs>
              <linearGradient id="shift-rhythm-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0EA5E9" />
                <stop offset="35%" stopColor="#3B82F6" />
                <stop offset="70%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#FB923C" />
              </linearGradient>
            </defs>

            <circle cx={size / 2} cy={size / 2} r={radius - strokeWidth / 2} fill="#FFFFFF" />

            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#shift-rhythm-ring)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i / 12) * 2 * Math.PI
              const inner = radius - 14
              const outer = radius - 6
              const cx = size / 2
              const cy = size / 2

              const x1 = cx + inner * Math.cos(angle)
              const y1 = cy + inner * Math.sin(angle)
              const x2 = cx + outer * Math.cos(angle)
              const y2 = cy + outer * Math.sin(angle)

              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#E2E8F0"
                  strokeWidth={i % 3 === 0 ? 2 : 1.4}
                  strokeLinecap="round"
                />
              )
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[76px] leading-none font-semibold tracking-tight text-slate-900">
              {hasScore ? display : '0.0'}
            </div>
            <div className="mt-1 text-[20px] font-medium tracking-wide text-slate-500">Shift Rhythm</div>
          </div>
        </div>
      </div>
    </div>
  )
}
