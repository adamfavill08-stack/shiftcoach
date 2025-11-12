'use client'

import Link from 'next/link'

export default function RotaIndexPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--page-bg)] px-4">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Rota tools</h1>
        <p className="text-sm text-slate-500">
          Choose what you want to set up:
        </p>
        <div className="space-y-2">
          <Link
            href="/rota/new"
            className="block rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow"
          >
            Create new rota pattern
          </Link>
          <Link
            href="/rota/event"
            className="block rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow"
          >
            Log a rota event
          </Link>
          <Link
            href="/rota/setup"
            className="block rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow"
          >
            Advanced setup
          </Link>
        </div>
      </div>
    </div>
  )
}
