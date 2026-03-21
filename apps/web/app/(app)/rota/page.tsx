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
      <div className="min-h-screen bg-gradient-to-b from-white via-sky-50/40 to-white flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    }>
      <RotaContent initialYearMonth={initialYearMonth} />
    </Suspense>
  )
}
