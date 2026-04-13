'use client'

import { useEffect, useState } from 'react'
import { Inter } from 'next/font/google'

export const MACRO_CARD_RING_SIZE = 88
const DEFAULT_STROKE = 8

const COLORS = {
  carbs: '#00BCD4',
  protein: '#42A5F5',
  fat: '#FFA726',
} as const
const inter = Inter({ subsets: ['latin'] })

type MacroRow = {
  label: 'Carbs' | 'Protein' | 'Fat'
  value: number
  pct: number
  color: string
}

function buildMacroRows(carbs: number, protein: number, fat: number): MacroRow[] {
  const total = carbs * 4 + protein * 4 + fat * 9
  if (total <= 0) {
    return [
      { label: 'Carbs', value: Math.round(carbs), pct: 0, color: COLORS.carbs },
      { label: 'Protein', value: Math.round(protein), pct: 0, color: COLORS.protein },
      { label: 'Fat', value: Math.round(fat), pct: 0, color: COLORS.fat },
    ]
  }
  return [
    {
      label: 'Carbs',
      value: Math.round(carbs),
      pct: Math.round(((carbs * 4) / total) * 100),
      color: COLORS.carbs,
    },
    {
      label: 'Protein',
      value: Math.round(protein),
      pct: Math.round(((protein * 4) / total) * 100),
      color: COLORS.protein,
    },
    {
      label: 'Fat',
      value: Math.round(fat),
      pct: Math.round(((fat * 9) / total) * 100),
      color: COLORS.fat,
    },
  ]
}

function Ring({
  pct,
  size = MACRO_CARD_RING_SIZE,
  stroke = DEFAULT_STROKE,
  color,
  label,
  value,
}: {
  pct: number
  size?: number
  stroke?: number
  color: string
  label: string
  value: number
}) {
  const [animPct, setAnimPct] = useState(0)
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - animPct / 100)

  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 100)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }} aria-hidden>
        <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--macro-card-ring-track)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-[15px] font-bold tabular-nums leading-none"
            style={{ color: 'var(--macro-card-ring-value)' }}
          >
            {value}g
          </span>
        </div>
      </div>
      <span
        className="text-center text-xs font-medium"
        style={{ color: 'var(--macro-card-ring-label)' }}
      >
        {label}
      </span>
    </div>
  )
}

export type MacroCardProps = {
  carbs_g: number
  protein_g: number
  fat_g: number
  title?: string
  /** Omit outer white card (use inside an existing card shell). */
  embedded?: boolean
  className?: string
}

export function MacroCard({
  carbs_g,
  protein_g,
  fat_g,
  title = 'Macro targets',
  embedded = false,
  className = '',
}: MacroCardProps) {
  const macros = buildMacroRows(carbs_g, protein_g, fat_g)

  const inner = (
    <>
      <h2
        className={`${inter.className} text-[10px] font-semibold tracking-[0.01em] text-slate-900 dark:text-slate-100`}
        style={{ color: 'var(--text-main)' }}
      >
        {title}
      </h2>
      <div className="mt-[18px] flex items-center justify-around">
        {macros.map((m) => (
          <Ring key={m.label} pct={m.pct} color={m.color} label={m.label} value={m.value} />
        ))}
      </div>
      <div className="mt-5">
        <div className="flex h-[5px] overflow-hidden rounded-md">
          {macros.map((m) => (
            <div
              key={m.label}
              className="min-w-0 transition-[width] duration-[900ms] ease-out"
              style={{ width: `${m.pct}%`, background: m.color }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-around">
          {macros.map((m) => (
            <span key={m.label} className="text-[11px] font-semibold" style={{ color: m.color }}>
              {m.pct}%
            </span>
          ))}
        </div>
      </div>
    </>
  )

  if (embedded) {
    return <div className={`macro-card-theme text-left ${className}`.trim()}>{inner}</div>
  }

  return (
    <div
      className={`macro-card-theme rounded-[20px] bg-white px-4 pb-[22px] pt-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:bg-[var(--card)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] ${className}`.trim()}
    >
      {inner}
    </div>
  )
}
