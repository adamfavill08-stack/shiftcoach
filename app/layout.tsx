import './globals.css'
import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/components/AuthProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import { QuickAddProvider } from '@/lib/quickAddContext'
import { QuickAddSheet } from '@/components/quick-add/QuickAddSheet'

export const metadata: Metadata = {
  title: 'Shift Coach',
  description: 'The only health app for shift workers.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="theme-transition min-h-screen flex items-stretch justify-center antialiased font-sans">
        {/* Phone-width preview on desktop */}
        <div className="w-full max-w-[430px] min-h-screen shadow-2xl">
          <ThemeProvider>
            <AuthProvider>
              <QuickAddProvider>
                {children}
                <QuickAddSheet />
              </QuickAddProvider>
            </AuthProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  )
}
