'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BarChart3, Settings } from 'lucide-react'

import { Header } from './ui/Header'

export function MobileShell({ title, right, children }:{
  title?: string; right?: ReactNode; children: ReactNode
}) {
  const pathname = usePathname()
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: 'radial-gradient(circle at top, var(--bg-soft), var(--bg))',
      }}
    >
      <Header title={title} right={right} />
      {/* Scrollable phone container */}
      <div className="max-w-[430px] mx-auto relative min-h-screen px-4 pb-6">
        {/* main content */}
        <main className="pt-0.5 pb-4 space-y-4">
          {children}
        </main>
      </div>
    </div>
  )
}

// Bottom nav removed; global BottomNav is rendered in app layout

