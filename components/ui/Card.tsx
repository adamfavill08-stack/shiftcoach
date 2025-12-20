import { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/75 dark:bg-slate-900/45 border border-slate-200/50 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 shadow-sm p-4 ${className}`}>
      {children}
    </div>
  )
}

