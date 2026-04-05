import { Suspense } from 'react'
import RotaOverviewPage from '@/components/calendar/RotaOverviewPage'
import { RotaIndexLoadingFallback } from '@/components/rota/RotaIndexLoadingFallback'

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
    <Suspense fallback={<RotaIndexLoadingFallback />}>
      <RotaContent initialYearMonth={initialYearMonth} />
    </Suspense>
  )
}
