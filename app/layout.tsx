import './globals.css'
import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/components/AuthProvider'
import { ShiftStateProvider } from '@/components/providers/shift-state-provider'
import { CircadianStateProvider } from '@/components/providers/circadian-state-provider'
import { TransitionAlertsSubscriber } from '@/components/notifications/TransitionAlertsSubscriber'
import { QuickAddProvider } from '@/lib/quickAddContext'
import { QuickAddSheet } from '@/components/quick-add/QuickAddSheet'
import { EventNotificationLoader } from '@/components/notifications/EventNotificationLoader'
import { ToastContainer } from '@/components/ui/Toast'
import { ErrorSuppressor } from '@/components/ErrorSuppressor'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { LanguageProvider } from '@/components/providers/language-provider'
import { BottomNavWrapper } from '@/components/layout/BottomNavWrapper'
import { AutoHealthSync } from '@/components/wearables/AutoHealthSync'
import AndroidBackButtonHandler from '@/components/AndroidBackButtonHandler'
import { NativeAndroidStatusBar } from '@/components/native/NativeAndroidStatusBar'
import { RateAppPromptTracker } from '@/components/engagement/RateAppPromptTracker'
import { InAppReviewScheduler } from '@/components/engagement/InAppReviewScheduler'

export const metadata: Metadata = {
  title: 'ShiftCoach - Health App for Shift Workers',
  description: 'Health and wellbeing app designed for shift workers. Track sleep, nutrition, body clock, and shift schedules.',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Enable safe area insets for Android/iOS notches and status bars
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* First in head: sync .dark before paint (localStorage theme key matches ThemeProvider). */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var root = document.documentElement;
    var media = window.matchMedia('(prefers-color-scheme: dark)');
    function apply() {
      var saved = localStorage.getItem('theme_preference');
      if (saved !== 'light' && saved !== 'dark' && saved !== 'system') {
        var legacy = localStorage.getItem('theme');
        saved = legacy === 'dark' || legacy === 'light' ? legacy : 'system';
        localStorage.setItem('theme_preference', saved);
        localStorage.removeItem('theme');
      }
      var useDark = saved === 'dark' || (saved === 'system' && media.matches);
      root.classList.toggle('dark', useDark);
    }
    apply();
  } catch (e) {}
})();
            `,
          }}
        />
        {/* Safe area insets for Android/iOS notches and status bars */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        {/* Match Android navigation bar color to app background to avoid dark strip */}
        <meta name="theme-color" content="#f5F3F0" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --safe-area-inset-top: env(safe-area-inset-top, 0px);
            --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
            --safe-area-inset-left: env(safe-area-inset-left, 0px);
            --safe-area-inset-right: env(safe-area-inset-right, 0px);
          }
        ` }} />
        {/* Ensure window.Capacitor.triggerEvent exists before native code runs
            Bridge.triggerJSEvent (e.g. MainActivity wear bridge). Merge onto
            partial Capacitor if the native bridge injected the object first. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    if (typeof window === 'undefined') return;
    var c = window.Capacitor;
    if (!c) {
      window.Capacitor = { triggerEvent: function () {} };
    } else if (typeof c.triggerEvent !== 'function') {
      c.triggerEvent = function () {};
    }
  } catch (e) {}
})();
            `,
          }}
        />
        {/* Suppress AuthSessionMissingError before React loads */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  var originalError = console.error;
  var originalWarn = console.warn;
  function shouldSuppress(arg) {
    if (!arg) return false;
    var errorName = arg.name || '';
    var errorMessage = (arg.toString && arg.toString()) || arg.message || '';
    var errorType = (arg.constructor && arg.constructor.name) || '';
    return errorName === 'AuthSessionMissingError' ||
      errorMessage.indexOf('AuthSessionMissingError') !== -1 ||
      errorMessage.indexOf('Auth session missing') !== -1 ||
      errorType === 'AuthSessionMissingError';
  }
  console.error = function () {
    var args = Array.prototype.slice.call(arguments);
    if (args.some(shouldSuppress)) return;
    originalError.apply(console, args);
  };
  console.warn = function () {
    var args = Array.prototype.slice.call(arguments);
    if (args.some(shouldSuppress)) return;
    originalWarn.apply(console, args);
  };
  window.addEventListener('error', function (event) {
    var err = event.error;
    var msg = event.message || '';
    if ((err && err.name === 'AuthSessionMissingError') ||
        msg.indexOf('Auth session missing') !== -1) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);
  window.addEventListener('unhandledrejection', function (event) {
    var r = event.reason;
    if ((r && r.name === 'AuthSessionMissingError') ||
        (r && r.message && r.message.indexOf('Auth session missing') !== -1)) {
      event.preventDefault();
      return false;
    }
  });
})();
            `,
          }}
        />
      </head>
      <body className="theme-transition min-h-screen flex items-stretch justify-center antialiased font-sans bg-[var(--bg)] text-[var(--text-main)]" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var media = window.matchMedia('(prefers-color-scheme: dark)');
                  var theme = localStorage.getItem('theme_preference');
                  if (theme !== 'light' && theme !== 'dark' && theme !== 'system') {
                    var legacy = localStorage.getItem('theme');
                    theme = legacy === 'dark' || legacy === 'light' ? legacy : 'system';
                    localStorage.setItem('theme_preference', theme);
                    localStorage.removeItem('theme');
                  }
                  if (theme === 'dark' || (theme === 'system' && media.matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        {/* Phone-width preview on desktop */}
        <div className="w-full max-w-[430px] min-h-screen shadow-2xl">
          <div className="app-main-shell relative min-h-screen pb-24 bg-[var(--bg)]">
            <ErrorSuppressor />
            <LanguageProvider>
              <ThemeProvider>
                <AuthProvider>
                  <ShiftStateProvider>
                    <CircadianStateProvider>
                    <TransitionAlertsSubscriber />
                    <QuickAddProvider>
                      <AutoHealthSync />
                      <RateAppPromptTracker />
                      <InAppReviewScheduler />
                      <NativeAndroidStatusBar />
                      <AndroidBackButtonHandler />
                      <EventNotificationLoader />
                      {children}
                      <QuickAddSheet />
                      <ToastContainer />
                      <BottomNavWrapper />
                    </QuickAddProvider>
                    </CircadianStateProvider>
                  </ShiftStateProvider>
                </AuthProvider>
              </ThemeProvider>
            </LanguageProvider>
          </div>
        </div>
      </body>
    </html>
  )
}
