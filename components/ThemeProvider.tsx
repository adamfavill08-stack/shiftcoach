'use client'

import { useEffect, useRef } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { supabase } from '@/lib/supabase'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const syncingRef = useRef(false)

  // Sync theme changes to Supabase
  useEffect(() => {
    const handleStorageChange = async () => {
      if (syncingRef.current) return
      syncingRef.current = true

      try {
        const theme = localStorage.getItem('theme') || 'system'
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('profiles')
            .update({ theme })
            .eq('user_id', user.id)
        }
      } catch (err) {
        console.error('Failed to sync theme to Supabase:', err)
      } finally {
        syncingRef.current = false
      }
    }

    // Listen for theme changes
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Load theme from Supabase on mount
  useEffect(() => {
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('profiles')
          .select('theme')
          .eq('user_id', user.id)
          .single()

        if (data?.theme) {
          localStorage.setItem('theme', data.theme)
          // Trigger next-themes to update
          window.dispatchEvent(new Event('storage'))
        }
      } catch (err) {
        console.error('Failed to load theme from Supabase:', err)
      }
    })()
  }, [])

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="theme"
    >
      {children}
    </NextThemesProvider>
  )
}

// Re-export useTheme for convenience
export { useTheme } from 'next-themes'
