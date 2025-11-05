'use client'

import { ShiftWeekStrip } from '@/components/dashboard/ShiftWeekStrip'

export default function DashboardHeader({ user }: { user: any }) {
  return (
    <header className="px-4 pt-0 pb-1 max-w-md mx-auto">
      <ShiftWeekStrip />
    </header>
  )
}
