type Props = { size?: number; thickness?: number; value: number; label?: string }
export function Ring({ size=88, thickness=10, value, label='Shift Rhythm™' }: Props) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, value))
  const dash = (clamped / 100) * c

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="[&_circle:first-child]:stroke-slate-200 [&_circle:first-child]:dark:stroke-slate-800 [&_text]:fill-slate-900 [&_text]:dark:fill-slate-100">
        <circle cx={size/2} cy={size/2} r={r} stroke="#eef2f7" strokeWidth={thickness} fill="none" />
        <circle cx={size/2} cy={size/2} r={r}
          stroke="url(#grad)" strokeWidth={thickness} fill="none"
          strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          fontSize="18" fontWeight="700" fill="#0f172a">{clamped}%</text>
      </svg>
      <div>
        <div className="text-slate-900 dark:text-slate-100 font-semibold">{label}</div>
        <div className="text-slate-500 dark:text-slate-400 text-sm">Circadian sync score</div>
      </div>
    </div>
  )
}

