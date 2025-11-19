'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChevronLeft, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/components/ThemeProvider'
import { SettingsCard, SettingsRow } from '@/components/settings/SettingsCard'
import { ToggleSwitch } from '@/components/settings/ToggleSwitch'

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme, systemTheme } = useTheme()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    
    setIsLoggingOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
        alert('Failed to log out. Please try again.')
        setIsLoggingOut(false)
      } else {
        // Redirect to sign-in page
        router.push('/auth/sign-in')
        router.refresh()
      }
    } catch (err) {
      console.error('Logout error:', err)
      alert('Failed to log out. Please try again.')
      setIsLoggingOut(false)
    }
  }

  return (
    <main
      style={{
        backgroundImage: 'radial-gradient(circle at top, var(--bg-soft), var(--bg))',
      }}
    >
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-5">
        {/* Header */}
        <header className="flex items-center justify-between mb-3 mt-1">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 backdrop-blur-2xl border text-xs font-medium transition-all hover:opacity-80 active:scale-95"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <div className="flex flex-col items-end">
            <h1
              className="text-xl font-semibold"
              style={{ color: 'var(--text-main)' }}
            >
              Settings
            </h1>
            <p
              className="text-xs"
              style={{ color: 'var(--text-soft)' }}
            >
              Tune Shift Coach to your routine.
            </p>
          </div>
        </header>

        {/* Profile & plan */}
        <SettingsCard
          title="Profile & plan"
          subtitle="We use this to set your calories and Body Clock score."
        >
          <SettingsRow
            label="Goal"
            description="Lose, maintain, or gain."
            right={
              <select
                className="rounded-full border px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                <option>Lose</option>
                <option>Maintain</option>
                <option>Gain</option>
              </select>
            }
          />
          <SettingsRow
            label="Body weight"
            description="Used to adjust calories and macros."
            right={
              <input
                type="number"
                className="w-20 rounded-full border px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
                placeholder="kg"
              />
            }
          />
          <SettingsRow
            label="Height & age"
            description="Tap to edit in your profile."
            right={
              <button className="text-xs font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--accent-blue)' }}>
                Edit
              </button>
            }
          />
        </SettingsCard>

        {/* Shifts & schedule */}
        <SettingsCard
          title="Shifts & schedule"
          subtitle="Help Shift Coach understand how you work."
        >
          <SettingsRow
            label="Default shift pattern"
            description="Day, nights, rotating, or custom."
            right={
              <select
                className="rounded-full border px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                <option>Rotating</option>
                <option>Mostly days</option>
                <option>Mostly nights</option>
                <option>Custom</option>
              </select>
            }
          />
          <SettingsRow
            label="Ideal sleep window"
            description="Used for recovery & Body Clock score."
            right={
              <button className="text-xs font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--accent-blue)' }}>
                Set window
              </button>
            }
          />
          <SettingsRow
            label="Default wake reminder"
            description="Nudge to log wake time if Shift Coach can't detect it."
            right={
              <select
                className="rounded-full border px-3 py-1 text-xs"
                style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                <option>Off</option>
                <option>After night shifts</option>
                <option>Every day</option>
              </select>
            }
          />
        </SettingsCard>

        {/* Notifications & AI Coach */}
        <SettingsCard
          title="Notifications & AI Coach"
          subtitle="Choose how much Shift Coach nudges you."
        >
          <SettingsRow
            label="Low mood / focus alerts"
            description="Light up the bell and suggest talking to the coach when your scores are low."
            right={<ToggleSwitch defaultChecked />}
          />
          <SettingsRow
            label="Daily check-in reminder"
            description="Quick prompt to log Mood, Focus and sleep."
            right={
              <select
                className="rounded-full border px-3 py-1 text-xs"
                style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                <option>Off</option>
                <option>Morning</option>
                <option>Evening</option>
              </select>
            }
          />
          <SettingsRow
            label="AI Coach tone"
            description="Keep things calm and supportive."
            right={
              <select
                className="rounded-full border px-3 py-1 text-xs"
                style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                <option>Calm & supportive</option>
                <option>More direct</option>
              </select>
            }
          />
        </SettingsCard>

        {/* Nutrition & logging */}
        <SettingsCard
          title="Nutrition & logging"
          subtitle="Control how we set your targets."
        >
          <SettingsRow
            label="Aggressiveness of calorie adjustments"
            description="How strongly calories react to sleep & shift changes."
            right={
              <select
                className="rounded-full border px-3 py-1 text-xs"
                style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                <option>Gentle</option>
                <option>Balanced</option>
                <option>More aggressive</option>
              </select>
            }
          />
          <SettingsRow
            label="Macro split presets"
            description="Balanced, higher protein, or custom."
            right={
              <select
                className="rounded-full border px-3 py-1 text-xs"
                style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                <option>Balanced</option>
                <option>Higher protein</option>
                <option>Custom</option>
              </select>
            }
          />
          <SettingsRow
            label="Default logging method"
            description="What you see first when logging a meal."
            right={
              <select
                className="rounded-full border px-3 py-1 text-xs"
                style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                <option>Manual</option>
                <option>Photo (AI)</option>
                <option>Barcode scan</option>
              </select>
            }
          />
        </SettingsCard>

        {/* Appearance */}
        <SettingsCard
          title="Appearance"
          subtitle="How Shift Coach looks and feels."
        >
          <SettingsRow
            label="Theme"
            description={`Current: ${theme === 'system' ? `System (${systemTheme ?? '…'})` : theme}`}
            right={
              <select
                className="rounded-full border px-3 py-1 text-xs"
                style={{
                  backgroundColor: 'var(--card-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="system">Match system</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            }
          />
          <SettingsRow
            label="Animations"
            description="Disable subtle animations if you prefer."
            right={<ToggleSwitch defaultChecked />}
          />
        </SettingsCard>

        {/* Data & privacy */}
        <SettingsCard
          title="Data & privacy"
          subtitle="You're in control."
        >
          <SettingsRow
            label="Export my data"
            description="Download your Shift Coach data as CSV."
            right={
              <button className="text-xs font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--accent-blue)' }}>
                Export
              </button>
            }
          />
          <SettingsRow
            label="Delete account"
            description="Permanently remove your data."
            right={
              <button className="text-xs font-medium hover:opacity-80 transition-opacity" style={{ color: '#f43f5e' }}>
                Delete
              </button>
            }
          />
          <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <SettingsRow
              label="Log out"
              description="Sign out of your account."
              right={
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="inline-flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: 'var(--text-main)' }}
                >
                  {isLoggingOut ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Logging out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log out</span>
                    </>
                  )}
                </button>
              }
            />
          </div>
          <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Shift Coach is not a medical device. Always follow your workplace safety
              rules and local medical guidance.
            </p>
          </div>
        </SettingsCard>

        <p className="mt-2 text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
          Shift Coach v1.0 · Need help? <span style={{ color: 'var(--accent-blue)' }}>Contact support</span>
        </p>
      </div>
    </main>
  )
}
