export function Bar({ label, valueText, pct }:{ label:string; valueText:string; pct:number }) {
  const w = Math.max(0, Math.min(100, pct))
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm p-4">
      <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">{label}</div>
      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full">
        <div className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-purple-600" style={{ width: `${w}%` }} />
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{valueText}</div>
    </div>
  )
}

