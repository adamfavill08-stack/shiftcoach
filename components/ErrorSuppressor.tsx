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
      const errorString = JSON.stringify(arg) || ''
      
      return errorName === 'AuthSessionMissingError' || 
             errorMessage.includes('AuthSessionMissingError') ||
             errorMessage.includes('Auth session missing') ||
             errorMessage.includes('Unauthorized') ||
             errorString.includes('status: 401') ||
             errorString.includes('"status":401') ||
             errorType === 'AuthSessionMissingError'
    }
    
    console.error = (...args: any[]) => {
      // Check all arguments for the error
      const shouldSkip = args.some(shouldSuppress)
      if (shouldSkip) {
        return // Suppress this error
      }
      
      // Check for EventsHelper messages
      const hasEventsHelperMessage = args.some(arg => 
        typeof arg === 'string' && arg.includes('[EventsHelper]')
      )
      
      // Check for empty objects (but not arrays or null)
      const hasEmptyObject = args.some(arg => 
        arg && 
        typeof arg === 'object' && 
        !Array.isArray(arg) &&
        Object.keys(arg).length === 0
      )
      
      // Suppress EventsHelper errors with empty objects (most common case)
      if (hasEventsHelperMessage && hasEmptyObject) {
        return // Suppress empty error objects from EventsHelper
      }
      
      // Suppress any empty object from EventsHelper (even without message string)
      // This catches cases where the error object is logged directly
      if (hasEmptyObject && args.some(arg => 
        typeof arg === 'string' && arg.includes('EventsHelper')
      )) {
        return
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

