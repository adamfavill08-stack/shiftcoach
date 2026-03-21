'use client'

/**
 * Loading Indicator Component
 * Shows a subtle loading state when calculations are in progress
 */
export function LoadingIndicator({ 
  message = 'Calculating...',
  size = 'sm' 
}: { 
  message?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }
  
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <div className="flex items-center gap-2 text-slate-600">
      <div className={`${sizeClasses[size]} border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin`} />
      <span className={textSizeClasses[size]}>{message}</span>
    </div>
  )
}

/**
 * Inline Loading Badge
 * Small badge that shows "Calculating..." inline with content
 */
export function LoadingBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-medium ${className}`}>
      <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      <span>Calculating...</span>
    </span>
  )
}

