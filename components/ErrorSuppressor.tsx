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
      
      // Check for EventsHelper messages (check first argument which is usually the message)
      const firstArg = args[0]
      const hasEventsHelperMessage = typeof firstArg === 'string' && 
        (firstArg.includes('[EventsHelper]') || firstArg.includes('EventsHelper'))
      
      // If it's an EventsHelper message, check if second argument is empty/meaningless
      if (hasEventsHelperMessage && args.length > 1) {
        const secondArg = args[1]
        // Check if second argument is empty object or has no meaningful data
        if (secondArg && typeof secondArg === 'object' && !Array.isArray(secondArg)) {
          const keys = Object.keys(secondArg)
          // If empty object or all values are falsy, suppress
          if (keys.length === 0 || keys.every(key => {
            const val = secondArg[key]
            return val === undefined || val === null || val === '' || val === 0
          })) {
            return // Suppress EventsHelper errors with empty/meaningless objects
          }
        }
      }
      
      // Also check all arguments for EventsHelper messages
      const hasEventsHelperMessageAnywhere = args.some(arg => 
        typeof arg === 'string' && (arg.includes('[EventsHelper]') || arg.includes('EventsHelper'))
      )
      
      // Check for empty objects (but not arrays or null)
      // Also check if object appears empty when stringified
      const hasEmptyObject = args.some(arg => {
        if (!arg || typeof arg !== 'object' || Array.isArray(arg)) {
          return false
        }
        // Check if object has no enumerable properties
        const keys = Object.keys(arg)
        if (keys.length === 0) {
          return true
        }
        // Check if all values are undefined/null/empty
        const hasAnyValue = keys.some(key => {
          const val = arg[key]
          return val !== undefined && val !== null && val !== ''
        })
        // If no meaningful values, treat as empty
        if (!hasAnyValue) {
          return true
        }
        // Check if stringified version is just "{}"
        try {
          const str = JSON.stringify(arg)
          if (str === '{}' || str === 'null') {
            return true
          }
        } catch {
          // If stringify fails, check keys
        }
        return false
      })
      
      // Suppress EventsHelper errors with empty objects (most common case)
      if (hasEventsHelperMessageAnywhere && hasEmptyObject) {
        return // Suppress empty error objects from EventsHelper
      }
      
      // Suppress any empty object from EventsHelper (even without message string)
      // This catches cases where the error object is logged directly
      if (hasEmptyObject && hasEventsHelperMessageAnywhere) {
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

