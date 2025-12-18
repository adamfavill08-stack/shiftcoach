'use client'

import { useEffect } from 'react'

/**
 * Suppresses expected errors in development
 * Specifically handles AuthSessionMissingError which is expected in dev/serverless
 */
export function ErrorSuppressor() {
  useEffect(() => {
    // Suppress AuthSessionMissingError in console - it's expected in dev
    const originalError = console.error
    const originalWarn = console.warn
    
    const shouldSuppress = (arg: any): boolean => {
      if (!arg) return false
      const errorName = arg?.name || ''
      const errorMessage = arg?.toString() || arg?.message || ''
      const errorType = arg?.constructor?.name || ''
      
      return errorName === 'AuthSessionMissingError' || 
             errorMessage.includes('AuthSessionMissingError') ||
             errorMessage.includes('Auth session missing') ||
             errorType === 'AuthSessionMissingError'
    }
    
    console.error = (...args: any[]) => {
      // Check all arguments for the error
      const shouldSkip = args.some(shouldSuppress)
      if (shouldSkip) {
        return // Suppress this error
      }
      originalError.apply(console, args)
    }

    console.warn = (...args: any[]) => {
      const shouldSkip = args.some(shouldSuppress)
      if (shouldSkip) {
        return // Suppress this warning
      }
      originalWarn.apply(console, args)
    }

    // Catch unhandled errors and rejections
    const handleError = (event: ErrorEvent) => {
      if (event.error?.name === 'AuthSessionMissingError' ||
          event.message?.includes('Auth session missing') ||
          event.error?.message?.includes('Auth session missing')) {
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.name === 'AuthSessionMissingError' ||
          event.reason?.message?.includes('Auth session missing')) {
        event.preventDefault()
        return false
      }
    }

    window.addEventListener('error', handleError, true) // Use capture phase
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      console.error = originalError
      console.warn = originalWarn
      window.removeEventListener('error', handleError, true)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return null
}

