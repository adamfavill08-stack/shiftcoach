'use client'

import { X } from 'lucide-react'
import type { Notification } from '@/lib/hooks/useNotifications'

type NotificationModalProps = {
  isOpen: boolean
  onClose: () => void
  notifications: Notification[]
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  loading: boolean
}

export function NotificationModal({ 
  isOpen, 
  onClose, 
  notifications, 
  markAsRead, 
  markAllAsRead, 
  loading 
}: NotificationModalProps) {

  if (!isOpen) return null

  const unreadNotifications = notifications.filter(n => !n.read)
  const readNotifications = notifications.filter(n => n.read)

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.12)] w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-b from-white/98 via-white/90 to-white/85" />
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50">
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-800 bg-clip-text text-transparent">
                Notifications
              </h2>
              {unreadNotifications.length > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {unreadNotifications.length} unread
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadNotifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-pulse text-sm text-slate-500">Loading notifications...</div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">No notifications</p>
                <p className="text-xs text-slate-500">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Unread notifications */}
                {unreadNotifications.length > 0 && (
                  <>
                    {unreadNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                      />
                    ))}
                    {readNotifications.length > 0 && (
                      <div className="pt-4 pb-2">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Earlier
                        </h3>
                      </div>
                    )}
                  </>
                )}

                {/* Read notifications */}
                {readNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function NotificationItem({ notification, onClick }: { notification: Notification; onClick: () => void }) {
  const getIcon = () => {
    switch (notification.type) {
      case 'mood_focus':
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200/60">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        )
      case 'event':
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200/60">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/60">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm ${
        notification.read
          ? 'bg-slate-50/50 border-slate-200/50'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={`text-sm font-semibold mb-1 ${notification.read ? 'text-slate-700' : 'text-slate-900'}`}>
                {notification.title}
              </h4>
              <p className={`text-xs leading-relaxed ${notification.read ? 'text-slate-500' : 'text-slate-600'}`}>
                {notification.message}
              </p>
            </div>
            {!notification.read && (
              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {formatTime(notification.timestamp)}
          </p>
        </div>
      </div>
    </button>
  )
}

