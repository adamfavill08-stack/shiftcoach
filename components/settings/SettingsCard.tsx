'use client'

import React from 'react'

export function SettingsCard({ title, subtitle, children }:{ title:string; subtitle?:string; children: React.ReactNode }){
  return (
    <section
      className="rounded-2xl backdrop-blur-2xl px-4 py-3 flex flex-col gap-2.5 bg-white/60 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/40"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
          {subtitle && (<p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>)}
        </div>
      </div>
      {children}
    </section>
  )
}

export function SettingsRow({ label, description, right }:{ label:string; description?:string; right?:React.ReactNode }){
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        {description && (<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>)}
      </div>
      {right}
    </div>
  )
}


