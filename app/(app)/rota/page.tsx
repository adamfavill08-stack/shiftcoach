import { Suspense } from 'react'
import RotaOverviewPage from '@/components/calendar/RotaOverviewPage'

type RotaIndexPageProps = {
  searchParams?: Promise<{
    month?: string
  }>
}

function RotaContent({ initialYearMonth }: { initialYearMonth?: string }) {
  return <RotaOverviewPage initialYearMonth={initialYearMonth} />
}

export default async function RotaIndexPage({ searchParams }: RotaIndexPageProps) {
  const resolvedSearchParams = await searchParams
  const initialYearMonth = resolvedSearchParams?.month
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
