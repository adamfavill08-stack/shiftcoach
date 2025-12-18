'use client'

import React, { ReactNode, useEffect, useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import { BottomPageNav } from './BottomPageNav'
import ShiftRhythmCard from './ShiftRhythmCard'
import SleepPage from './pages/SleepPage'
import { MealTimingCoachPage } from './pages/MealTimingCoachPage'
import ActivityAndStepsPage from './pages/ActivityAndStepsPage'

type PageConfig = {
  id: string
  label: string
  content: ReactNode
}

type DashboardPagerProps = {
  pages: PageConfig[]
}

export function DashboardPager({ pages }: DashboardPagerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const clampIndex = (index: number) => {
    if (index < 0) return 0
    if (index >= pages.length) return pages.length - 1
    return index
  }

  const goTo = (index: number) => {
    setCurrentIndex((prev) => clampIndex(index))
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedPage = localStorage.getItem('dashboardPage')
    if (storedPage) {
      const parsed = parseInt(storedPage, 10)
      if (!Number.isNaN(parsed)) {
        goTo(parsed)
      }
      localStorage.removeItem('dashboardPage')
    }
  }, [])

  const handlers = useSwipeable({
    onSwipedLeft: () => goTo(currentIndex + 1),
    onSwipedRight: () => goTo(currentIndex - 1),
    preventScrollOnSwipe: true,
    trackMouse: true,
  })

  const currentPage = pages[currentIndex]

  return (
    <div className="relative h-full w-full" {...handlers}>
      <div className="h-full w-full">{currentPage?.content}</div>

      <BottomPageNav pageCount={pages.length} currentIndex={currentIndex} onChange={goTo} />
    </div>
  )
}
