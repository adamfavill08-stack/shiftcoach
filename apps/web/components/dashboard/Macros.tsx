import { Card } from '@/components/ui/Card'

export function Macros({ p, c, f }:{ p:string; c:string; f:string }) {
  return (
    <Card>
      <div className="text-slate-500 dark:text-slate-400 text-xs mb-2">Macros Today</div>
      <div className="flex items-center gap-4">
        <Macro label="Protein" value={p} />
        <Macro label="Carbs" value={c} />
        <Macro label="Fats" value={f} />
      </div>
    </Card>
  )
}

function Macro({ label, value }:{ label:string; value:string }) {
  return (
    <div className="flex-1">
      <div className="text-slate-500 dark:text-slate-400 text-xs">{label}</div>
      <div className="text-slate-900 dark:text-slate-100 font-semibold">{value}</div>
    </div>
  )
}

