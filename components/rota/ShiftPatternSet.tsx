'use client'

import { useRouter } from 'next/navigation'
import { Calendar, Edit3, Plus } from 'lucide-react'

export type ShiftPatternSummary = {
  name: string
  startDate?: string | null
  colors: string[]
  cycleLength: number
}

type ShiftPatternSetProps = {
  pattern?: ShiftPatternSummary | null
}

export default function ShiftPatternSet({ pattern }: ShiftPatternSetProps) {
  const router = useRouter()

  const handleEdit = () => {
    router.push('/rota/setup')
  }

  const handleAddEvent = () => {
    router.push('/rota/events')
  }

  const formattedDate = pattern?.startDate
    ? new Date(`${pattern.startDate}T00:00:00`).toLocaleDateString()
    : '—'

  const colors = pattern?.colors ?? []

  return (
    <div className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-all sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Active pattern</h3>
          <p className="text-base font-semibold text-slate-900 sm:text-lg">
            {pattern?.name ?? 'No pattern selected'}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">Started {formattedDate}</p>
        </div>

        <div className="mt-2 flex items-center gap-2 sm:mt-0">
          {colors.length > 0 ? (
            colors.map((color, index) => (
              <div
                key={`${color}-${index}`}
                className="h-4 w-4 rounded-lg border border-slate-200 sm:h-5 sm:w-5"
                style={{ backgroundColor: color }}
              />
            ))
          ) : (
            <span className="text-xs text-slate-300">No colours</span>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar size={16} className="text-sky-500" />
          <span>
            Cycle repeats automatically every{' '}
            <strong>{pattern?.cycleLength ?? 0}</strong> days
          </span>
        </div>

        <div className="flex w-full justify-end gap-2 sm:w-auto">
          <button
            type="button"
            onClick={handleEdit}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <Edit3 size={16} />
            Edit pattern
          </button>

          <button
            type="button"
            onClick={handleAddEvent}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-[0_10px_25px_rgba(56,189,248,0.4)] transition hover:brightness-110 active:translate-y-[1px]"
          >
            <Plus size={16} />
            Add holiday / event
          </button>
        </div>
      </div>
    </div>
  )
}
