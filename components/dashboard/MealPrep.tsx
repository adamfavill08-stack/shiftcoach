import { Card } from '@/components/ui/Card'

export function MealPrep({ title, cta }:{ title:string; cta:string }) {
  return (
    <Card className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-slate-100" />
      <div className="flex-1">
        <div className="text-slate-900 font-semibold">{title}</div>
        <div className="text-slate-500 text-xs">Smart Shift Meal Prep AI</div>
      </div>
      <button className="text-xs px-3 py-2 rounded-lg text-white font-semibold bg-gradient-to-r from-orange-500 to-purple-600">
        {cta}
      </button>
    </Card>
  )
}

