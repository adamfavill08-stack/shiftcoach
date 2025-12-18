'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

let toastListeners: ((toast: Toast) => void)[] = []
let toasts: Toast[] = []

export function showToast(message: string, type: ToastType = 'info') {
  const id = Math.random().toString(36).substring(7)
  const toast: Toast = { id, message, type }
  toasts = [...toasts, toast]
  toastListeners.forEach(listener => listener(toast))
  
  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    dismissToast(id)
  }, 3000)
}

function dismissToast(id: string) {
  toasts = toasts.filter(t => t.id !== id)
  toastListeners.forEach(listener => {
    // Trigger re-render by calling with a dummy toast
    const dummyToast: Toast = { id: '', message: '', type: 'info' }
    listener(dummyToast)
  })
}

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = () => {
      setCurrentToasts([...toasts])
    }
    toastListeners.push(listener)
    setCurrentToasts([...toasts])
    
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  if (currentToasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {currentToasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  }

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  }

  return (
    <div
      className={`
        pointer-events-auto
        flex items-center gap-3
        px-4 py-3
        rounded-xl
        border
        shadow-lg
        backdrop-blur-sm
        animate-in slide-in-from-right
        ${bgColors[toast.type]}
      `}
      style={{
        minWidth: '280px',
        maxWidth: '400px',
      }}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm font-medium" style={{ color: 'var(--text-main)' }}>
        {toast.message}
      </p>
      <button
        onClick={onDismiss}
        className="opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
