import './globals.css'
import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/components/AuthProvider'
import { QuickAddProvider } from '@/lib/quickAddContext'
import { QuickAddSheet } from '@/components/quick-add/QuickAddSheet'
import { EventNotificationLoader } from '@/components/notifications/EventNotificationLoader'
import { ToastContainer } from '@/components/ui/Toast'
import { ErrorSuppressor } from '@/components/ErrorSuppressor'

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
  // Theme Status: Currently only light theme is supported
  // See lib/theme/config.ts for theme configuration
  // Additional themes (dark, system) will be added in the future
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Safe area insets for Android/iOS notches and status bars */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --safe-area-inset-top: env(safe-area-inset-top, 0px);
            --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
            --safe-area-inset-left: env(safe-area-inset-left, 0px);
            --safe-area-inset-right: env(safe-area-inset-right, 0px);
          }
        ` }} />
        {/* Ensure dark class is never added - light mode only */}
        {/* Current theme: light (see lib/theme/config.ts) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                document.documentElement.classList.remove('dark');
              })();
            `,
          }}
        />
        {/* Suppress AuthSessionMissingError before React loads */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const originalError = console.error;
                const originalWarn = console.warn;
                
                const shouldSuppress = function(arg) {
                  if (!arg) return false;
                  const errorName = arg.name || '';
                  const errorMessage = arg.toString() || arg.message || '';
                  const errorType = arg.constructor?.name || '';
                  
                  return errorName === 'AuthSessionMissingError' || 
                         errorMessage.includes('AuthSessionMissingError') ||
                         errorMessage.includes('Auth session missing') ||
                         errorType === 'AuthSessionMissingError';
                };
                
                console.error = function(...args) {
                  if (args.some(shouldSuppress)) return;
                  originalError.apply(console, args);
                };
                
                console.warn = function(...args) {
                  if (args.some(shouldSuppress)) return;
                  originalWarn.apply(console, args);
                };
                
                window.addEventListener('error', function(event) {
                  if (event.error?.name === 'AuthSessionMissingError' ||
                      event.message?.includes('Auth session missing')) {
                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                  }
                }, true);
                
                window.addEventListener('unhandledrejection', function(event) {
                  if (event.reason?.name === 'AuthSessionMissingError' ||
                      event.reason?.message?.includes('Auth session missing')) {
                    event.preventDefault();
                    return false;
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className="theme-transition min-h-screen flex items-stretch justify-center antialiased font-sans" suppressHydrationWarning>
        {/* Phone-width preview on desktop */}
        <div className="w-full max-w-[430px] min-h-screen shadow-2xl">
          <ErrorSuppressor />
          <AuthProvider>
            <QuickAddProvider>
              <EventNotificationLoader />
              {children}
              <QuickAddSheet />
              <ToastContainer />
            </QuickAddProvider>
          </AuthProvider>
        </div>
      </body>
    </html>
  )
}
