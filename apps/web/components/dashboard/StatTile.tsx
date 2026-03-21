import { Card } from '@/components/ui/Card'

export function StatTile({ label, value, sub }:{ label:string; value:string; sub?:string }) {
  return (
    <Card>
      <div className="text-slate-500 dark:text-slate-400 text-xs">{label}</div>
      <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
      {sub && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>}
    </Card>
  )
}

