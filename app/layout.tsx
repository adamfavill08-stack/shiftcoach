import './globals.css'
import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/components/AuthProvider'
import { QuickAddProvider } from '@/lib/quickAddContext'
import { QuickAddSheet } from '@/components/quick-add/QuickAddSheet'
import { EventNotificationLoader } from '@/components/notifications/EventNotificationLoader'
import { ToastContainer } from '@/components/ui/Toast'
import { ErrorSuppressor } from '@/components/ErrorSuppressor'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { LanguageProvider } from '@/components/providers/language-provider'
import { BottomNavWrapper } from '@/components/layout/BottomNavWrapper'
import { AutoHealthSync } from '@/components/wearables/AutoHealthSync'
import { NativeAndroidBackButton } from '@/components/native/NativeAndroidBackButton'
import { NativeAndroidStatusBar } from '@/components/native/NativeAndroidStatusBar'

export const metadata: Metadata = {
  title: 'ShiftCoach - Health App for Shift Workers',
  description: 'Health and wellbeing app designed for shift workers. Track sleep, nutrition, body clock, and shift schedules.',
  icons: {
    icon: '/faviconsvg.svg',
    shortcut: '/faviconsvg.svg',
    apple: '/faviconsvg.svg',
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
        {/* Safe area insets for Android/iOS notches and status bars */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        {/* Match Android navigation bar color to app background to avoid dark strip */}
        <meta name="theme-color" content="#e9e5de" />
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
      <body className="theme-transition min-h-screen flex items-stretch justify-center antialiased font-sans bg-slate-100 text-slate-900" suppressHydrationWarning>
        {/* Phone-width preview on desktop */}
        <div className="w-full max-w-[430px] min-h-screen shadow-2xl">
          <ErrorSuppressor />
          <LanguageProvider>
            <ThemeProvider>
              <AuthProvider>
                <QuickAddProvider>
                  <AutoHealthSync />
                  <NativeAndroidStatusBar />
                  <NativeAndroidBackButton />
                  <EventNotificationLoader />
                  <main className="app-main-shell relative min-h-screen pb-24 bg-slate-100">
                    {children}
                    <QuickAddSheet />
                    <ToastContainer />
                    <BottomNavWrapper />
                  </main>
                </QuickAddProvider>
              </AuthProvider>
            </ThemeProvider>
          </LanguageProvider>
        </div>
      </body>
    </html>
  )
}
