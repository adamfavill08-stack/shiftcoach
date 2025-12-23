import { Suspense } from 'react'
import RotaOverviewPage from '@/components/calendar/RotaOverviewPage'

type RotaIndexPageProps = {
  searchParams?: {
    month?: string
  }
}

function RotaContent({ initialYearMonth }: { initialYearMonth?: string }) {
  return <RotaOverviewPage initialYearMonth={initialYearMonth} />
}

export default function RotaIndexPage({ searchParams }: RotaIndexPageProps) {
  const initialYearMonth = searchParams?.month
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 dark:from-slate-950 via-blue-50/30 dark:via-slate-900 to-slate-50 dark:to-slate-950 flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400">Loading...</div>
      </div>
    }>
      <RotaContent initialYearMonth={initialYearMonth} />
    </Suspense>
  )
}
