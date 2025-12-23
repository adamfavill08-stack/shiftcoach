import RotaOverviewPage from '@/components/calendar/RotaOverviewPage'

type RotaIndexPageProps = {
  searchParams?: {
    month?: string
  }
}

export default function RotaIndexPage({ searchParams }: RotaIndexPageProps) {
  const initialYearMonth = searchParams?.month
  return <RotaOverviewPage initialYearMonth={initialYearMonth} />
}
