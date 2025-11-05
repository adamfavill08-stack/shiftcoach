'use client'

import Link from 'next/link'

import { useMemo } from 'react'

type BodyClockCardProps = { score?: number | null; loading?: boolean }

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

const BodyClockCard: React.FC<BodyClockCardProps> = ({ score = null, loading = false }) => {
  const value = score !== null ? clamp(Math.round(score), 0, 100) : null

  // Ring geometry
  const size = 200
  const stroke = 16
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = useMemo(() => value !== null ? (value / 100) * c : 0, [value, c])
  const angle = useMemo(() => value !== null ? (value / 100) * 360 : 0, [value])

  return (
    <Link href="/shift-rhythm" className="block">
      <section
        className="relative rounded-3xl backdrop-blur-2xl border flex flex-col items-center justify-center px-6 py-8 text-center cursor-pointer transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99]"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >

      <div className="relative" style={{ width: size, height: size }}>
        {/* ambient glow behind the ring (soft, no hard edges) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[200px] h-[200px] rounded-full bg-gradient-to-tr from-sky-400/20 via-blue-500/20 to-purple-400/20 blur-3xl" />
        </div>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
          <defs>
            <linearGradient id="bc-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="35%" stopColor="#0b63f3" />
              <stop offset="70%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>

          {/* background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={stroke}
            fill="none"
          />

          {/* clock ticks (12 main, emphasized at 12/3/6/9) */}
          {
            Array.from({ length: 12 }).map((_, i) => {
              const theta = ((i / 12) * 2 * Math.PI) - Math.PI / 2 // start at top
              const isMajor = i % 3 === 0
              const tickOuter = r - stroke / 2 + 2 // place inside ring
              const tickInner = tickOuter - (isMajor ? 10 : 6)
              const x1 = size / 2 + tickOuter * Math.cos(theta)
              const y1 = size / 2 + tickOuter * Math.sin(theta)
              const x2 = size / 2 + tickInner * Math.cos(theta)
              const y2 = size / 2 + tickInner * Math.sin(theta)
              return (
                <line
                  key={`tick-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth={isMajor ? 3 : 2}
                  strokeLinecap="round"
                />
              )
            })
          }

          {/* foreground arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="url(#bc-grad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            fill="none"
            style={{ transition: 'stroke-dasharray 700ms ease-out' }}
          />

          {/* clock hand */}
          <g style={{ transition: 'transform 700ms ease-out', transformOrigin: `${size / 2}px ${size / 2}px`, transform: `rotate(${angle}deg)` }}>
            <line
              x1={size / 2}
              y1={size / 2}
              x2={size / 2}
              y2={size / 2 - (r - 10)}
              stroke="#ffffff"
              strokeOpacity={0.95}
              strokeWidth={4}
              strokeLinecap="round"
            />
          </g>

          {/* center cap */}
          <circle cx={size / 2} cy={size / 2} r={5} fill="#ffffff" />
        </svg>

        {/* Centered score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {loading ? (
            <>
              <div className="text-6xl font-bold animate-pulse" style={{ color: 'var(--text-muted)' }}>
                --
              </div>
              <div className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Calculating...</div>
            </>
          ) : value !== null ? (
            <>
              <div className="text-6xl font-bold" style={{ color: 'var(--text-main)' }}>{value}</div>
              <div className="mt-2 text-sm" style={{ color: 'var(--text-soft)' }}>Shift Rhythm</div>
            </>
          ) : (
            <>
              <div className="text-6xl font-bold" style={{ color: 'var(--text-muted)' }}>--</div>
              <div className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>No data yet</div>
            </>
          )}
        </div>
      </div>
    </section>
    </Link>
  )
}

export default BodyClockCard


