import { Card } from '@/components/ui/Card'

export function Timeline({ items }:{ items: { time:string; label:string; icon:string }[] }) {
  return (
    <Card>
      <div className="text-slate-500 dark:text-slate-400 text-xs mb-2">Today</div>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-14 text-xs text-slate-500 dark:text-slate-400">{it.time}</div>
            <div className="text-lg">{it.icon}</div>
            <div className="text-slate-900 dark:text-slate-100">{it.label}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

