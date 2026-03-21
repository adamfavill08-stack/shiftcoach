/**
 * Utility functions for handling Supabase errors, especially Cloudflare proxy errors
 */

export function isCloudflareError(error: any): boolean {
  if (!error) return false
  
  const message = error.message || String(error) || ''
  const errorStr = message.toLowerCase()
  
  // Check for Cloudflare error HTML
  return (
    errorStr.includes('cloudflare') ||
    errorStr.includes('<html>') ||
    errorStr.includes('<head><title>500 internal server error</title></head>') ||
    errorStr.includes('<center><h1>500 internal server error</h1></center>')
  )
}

export function isNetworkError(error: any): boolean {
  if (!error) return false
  
  const message = error.message || String(error) || ''
  const errorStr = message.toLowerCase()
  
  return (
    errorStr.includes('failed to fetch') ||
    errorStr.includes('networkerror') ||
    errorStr.includes('timeout') ||
    errorStr.includes('econnrefused') ||
    isCloudflareError(error)
  )
}

/**
 * Safely log Supabase errors, suppressing noisy Cloudflare proxy errors
 */
export function logSupabaseError(context: string, error: any, options?: { 
  suppressCloudflare?: boolean 
  level?: 'error' | 'warn' | 'log'
}): void {
  const { suppressCloudflare = true, level = 'error' } = options || {}
  
  if (suppressCloudflare && isCloudflareError(error)) {
    // Only log Cloudflare errors at warn level to reduce noise
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[${context}] Cloudflare proxy error (non-fatal):`, {
        message: 'Supabase request intercepted by Cloudflare',
        hint: 'This is usually a network/proxy issue. The app will continue with default values.',
      })
    }
    return
  }
  
  // Log real errors normally
  const logMethod = console[level] || console.error
  logMethod(`[${context}] Error:`, {
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
  })
}

/**
 * Check if an error should be treated as non-fatal (can continue with defaults)
 */
export function isNonFatalError(error: any): boolean {
  return isCloudflareError(error) || isNetworkError(error)
}

