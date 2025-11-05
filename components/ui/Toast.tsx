'use client'

import { useEffect, useState } from 'react'

export type ToastMessage = {
  id: string
  message: string
  type: 'success' | 'warning' | 'info'
  duration?: number
}

type ToastProps = {
  toast: ToastMessage | null
  onDismiss: () => void
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (toast) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300) // Wait for fade out
      }, toast.duration || 4000)

      return () => clearTimeout(timer)
    }
  }, [toast, onDismiss])

  if (!toast) return null

  const colors = {
    success: {
      bg: 'rgba(34, 197, 94, 0.15)',
      border: 'rgba(34, 197, 94, 0.3)',
      text: '#16a34a',
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.3)',
      text: '#d97706',
    },
    info: {
      bg: 'rgba(59, 130, 246, 0.15)',
      border: 'rgba(59, 130, 246, 0.3)',
      text: '#2563eb',
    },
  }

  const color = colors[toast.type]

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
      style={{
        maxWidth: 'calc(100% - 2rem)',
        width: 'max-content',
      }}
    >
      <div
        className="rounded-full border px-4 py-2.5 text-sm font-medium backdrop-blur-xl shadow-lg"
        style={{
          backgroundColor: color.bg,
          borderColor: color.border,
          color: color.text,
        }}
      >
        {toast.message}
      </div>
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'info', duration?: number) => {
    setToast({
      id: `toast-${Date.now()}`,
      message,
      type,
      duration,
    })
  }

  const dismissToast = () => {
    setToast(null)
  }

  return { toast, showToast, dismissToast }
}

