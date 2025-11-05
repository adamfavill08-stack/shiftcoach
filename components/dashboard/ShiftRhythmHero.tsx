'use client'

type ShiftRhythmHeroProps = { score?: number }

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

export const ShiftRhythmHero: React.FC<ShiftRhythmHeroProps> = ({ score = 82 }) => {
  const clamped = clamp(Math.round(score), 0, 100)

  // Gauge geometry (drawn in a 120x120 viewBox for crispness)
  const r = 44
  const c = 2 * Math.PI * r
  // We map 0..100 → 0..75% arc length to match the reference (not a full circle)
  const arcLen = 0.78 * c
  const dashOffset = arcLen * (1 - clamped / 100)

  // Helper to render subtle lower-half tick marks
  const ticks: { x1: number; y1: number; x2: number; y2: number; key: string }[] = []
  for (let i = 200; i <= 340; i += 8) {
    const a = (i * Math.PI) / 180
    const cx = 60, cy = 60
    const inner = r - 6
    const outer = r - 2
    const x1 = cx + inner * Math.cos(a)
    const y1 = cy + inner * Math.sin(a)
    const x2 = cx + outer * Math.cos(a)
    const y2 = cy + outer * Math.sin(a)
    ticks.push({ x1, y1, x2, y2, key: `t-${i}` })
  }

  return (
    <div className="relative rounded-3xl bg-white/50 backdrop-blur-2xl border border-white/60 shadow-[0_12px_28px_rgba(15,23,42,0.10)] px-6 pt-6 pb-5 flex flex-col items-center">
      {/* soft blue glow */}
      <div className="absolute -top-10 left-2 h-36 w-36 rounded-full bg-blue-400/40 blur-3xl" />

      {/* Head silhouette + gauge */}
      <div className="relative w-full flex items-center justify-center">
        {/* Head silhouette */}
        {/* Slightly smaller head, nudged left to sit under the gauge */}
        <svg viewBox="0 0 180 140" className="w-[240px] h-[172px] -translate-x-4 opacity-90">
          <defs>
            <linearGradient id="head-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eaf3ff" />
              <stop offset="100%" stopColor="#78a9ff" />
            </linearGradient>
          </defs>
          <g opacity="0.82">
            {/* A simplified left-facing profile */}
            <path
              d="M95 25c-24 0-44 18-46 41-.7 7.5-3.8 12.1-8.8 18.4-3.4 4.3-5 9.2-5 14.6 0 4.9 3.1 9.1 7.7 10.6 3.3 1.1 4.8 3.1 4.8 6.2v7.5c0 2.4 1.9 4.3 4.3 4.3h32.5c3.8 0 6.8-3 6.8-6.8v-10c0-2.9 2.3-5.2 5.2-5.2 3.7 0 6.7-3 6.7-6.7 0-2.6-1.5-5-3.9-6.1-3.3-1.5-5.7-4.8-5.7-8.6 0-3.3 1.8-6.4 4.7-8 7.8-4.4 12.6-12.4 12.6-21.1C110 31.7 103 25 95 25z"
              fill="url(#head-grad)"
              filter="url(#f0)"
            />
          </g>
        </svg>

        {/* Gauge overlay (centered over the brain area) */}
        <div className="absolute top-1 right-12">
          <div className="relative h-28 w-28">
            <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-45">
              <defs>
                <linearGradient id="arc-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="60%" stopColor="#0b63f3" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
                <radialGradient id="disc-grad" cx="50%" cy="45%" r="60%">
                  <stop offset="0%" stopColor="#0b63f3" />
                  <stop offset="70%" stopColor="#0a4fb9" />
                  <stop offset="100%" stopColor="#093c8e" />
                </radialGradient>
              </defs>
              {/* inner glossy disc */}
              <circle cx="60" cy="60" r="35" fill="url(#disc-grad)" filter="url(#drop)" />
              {/* top glossy highlight */}
              <path d="M20,50 A38 38 0 0 1 100 40" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="10" fill="none" strokeLinecap="round" />

              {/* base, faint arc background (75% arc) */}
              <circle
                cx="60" cy="60" r={r}
                fill="transparent"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="11"
                strokeDasharray={arcLen}
                strokeDashoffset={0}
                pathLength={arcLen}
              />
              {/* progress arc */}
              <circle
                cx="60" cy="60" r={r}
                fill="transparent"
                stroke="url(#arc-grad)"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={arcLen}
                strokeDashoffset={dashOffset}
                pathLength={arcLen}
                filter="url(#drop)"
              />
              {/* subtle tick marks on lower half */}
              <g opacity="0.4" stroke="#d9e9ff">
                {ticks.map(t => (
                  <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeWidth="2" strokeLinecap="round" />
                ))}
              </g>
              <defs>
                <filter id="drop">
                  <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#0b63f3AA" />
                </filter>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-semibold text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]">{clamped}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pill */}
      <div className="mt-4 w-full flex justify-center">
        <span className="rounded-2xl bg-white/70 backdrop-blur-xl px-6 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.08)] text-base font-medium text-slate-600">Shift Rhythm™</span>
      </div>
    </div>
  )
}

export default ShiftRhythmHero


