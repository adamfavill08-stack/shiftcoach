'use client'

import { useState, useEffect } from 'react'
import { getMyProfile } from '@/lib/profile'
import {
  effectiveEventNotificationStart,
  findShiftWindowOverlappingNow,
} from '@/lib/notifications/effectiveEventNotificationStart'

export type Notification = {
  id: string
  type: 'mood_focus' | 'event' | 'system'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

const NOTIFICATION_INBOX_STORAGE_KEY = 'notification-inbox-v1'

function loadPersistedNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATION_INBOX_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<{
      id: string
      type: Notification['type']
      title: string
      message: string
      timestamp: string
      read: boolean
    }>
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((n) => ({
        ...n,
        timestamp: new Date(n.timestamp),
      }))
      .filter((n) => !Number.isNaN(n.timestamp.getTime()))
  } catch {
    return []
  }
}

function persistNotifications(notifications: Notification[]) {
  try {
    localStorage.setItem(
      NOTIFICATION_INBOX_STORAGE_KEY,
      JSON.stringify(
        notifications.map((n) => ({
          ...n,
          timestamp: n.timestamp.toISOString(),
        })),
      ),
    )
  } catch {
    // Ignore storage write failures.
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoading(true)
        const profile = await getMyProfile()
        if (!profile) {
          // Not signed in (or session not ready) - avoid protected API calls that would 401.
          setNotifications([])
          setLoading(false)
          return
        }
        
        // Check if notifications are enabled
        const notificationsEnabled = profile?.mood_focus_alerts_enabled ?? true
        
        if (!notificationsEnabled) {
          setNotifications([])
          setLoading(false)
          return
        }

        // Check for upcoming events (next 24 hours)
        const eventNotifications: Notification[] = []
        try {
          const now = new Date()
          const currentMonth = now.getMonth() + 1
          const currentYear = now.getFullYear()
          const [res, weekRes] = await Promise.all([
            fetch(`/api/rota/event?month=${currentMonth}&year=${currentYear}`, {
              cache: 'no-store',
            }).catch(() => null),
            fetch(`/api/rota/week`, { cache: 'no-store' }).catch(() => null),
          ])

          const shiftWindow =
            weekRes && weekRes.ok
              ? findShiftWindowOverlappingNow((await weekRes.json()).days || [], now)
              : null

          if (res && res.ok) {
            try {
              const data = await res.json()
              const events = data.events || []
              
              events.forEach((event: any) => {
                if (event.start_at) {
                  const eventStart = new Date(event.start_at)
                  const effectiveStart = effectiveEventNotificationStart(
                    eventStart,
                    now,
                    { all_day: event.all_day, type: event.type },
                    shiftWindow
                  )
                  const hoursUntil =
                    (effectiveStart.getTime() - now.getTime()) / (1000 * 60 * 60)
                  
                  // Show notification for events starting in next 24 hours
                  if (hoursUntil > 0 && hoursUntil <= 24) {
                    eventNotifications.push({
                      id: `event-${event.id}`,
                      type: 'event',
                      title: 'Upcoming Shift',
                      message: `${event.title || 'Shift'} starts ${hoursUntil < 1 ? `in ${Math.round(hoursUntil * 60)} minutes` : `in ${Math.round(hoursUntil)} hours`}`,
                      timestamp: effectiveStart,
                      read: false,
                    })
                  }
                }
              })
            } catch (parseErr) {
              // Silently handle JSON parse errors
              console.warn('[useNotifications] Failed to parse events response')
            }
          }
        } catch (err) {
          // Silently handle fetch errors - notifications are non-critical
          console.warn('[useNotifications] Failed to fetch events:', err)
        }

        // Sleep-log reminder: after 6am, prompt users who have not logged sleep yet.
        const dailyNotifications: Notification[] = []
        try {
          const now = new Date()
          const hours = now.getHours()
          const todayKey = now.toISOString().slice(0, 10)
          const isAfterSixAm = hours >= 6

          if (isAfterSixAm) {
            const sleepRes = await fetch('/api/sleep/today', {
              credentials: 'include',
              cache: 'no-store',
            }).catch(() => null)

            if (sleepRes && sleepRes.ok) {
              const sleepJson = await sleepRes.json()
              const hasSleepLogged = Boolean(sleepJson?.sleep?.id)

              if (!hasSleepLogged) {
                dailyNotifications.push({
                  id: `sleep-log-reminder-${todayKey}`,
                  type: 'system',
                  title: 'Log sleep now',
                  message: 'Log your sleep now to keep your body clock readings accurate.',
                  timestamp: now,
                  read: false,
                })
              }
            }
          }
        } catch {
          // sleep reminder is non-critical
        }

        // Meal time window reminders for today
        const mealNotifications: Notification[] = []
        try {
          const res = await fetch('/api/meal-timing/today', { cache: 'no-store' }).catch(() => null)
          if (res && res.ok) {
            const data = await res.json()
            const nextLabel: string | undefined = data.nextMealLabel
            const nextTimeStr: string | undefined = data.nextMealTime

            if (nextTimeStr && nextTimeStr !== '—') {
              const [hStr, mStr] = nextTimeStr.split(':')
              const hour = Number(hStr)
              const minute = Number(mStr)
              if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
                const now = new Date()
                const mealTime = new Date()
                mealTime.setHours(hour, minute, 0, 0)
                const diffMinutes = (mealTime.getTime() - now.getTime()) / 60000

                // Show a reminder when within 30 minutes before or 10 minutes after the suggested time
                if (diffMinutes <= 30 && diffMinutes >= -10) {
                  const dayKey = now.toISOString().slice(0, 10)
                  const mealId = `${dayKey}-${nextLabel || 'meal'}-${hour}-${minute}`
                  const storageKeyMeals = 'meal-reminders-shown'

                  let shownIds: string[] = []
                  try {
                    const raw = localStorage.getItem(storageKeyMeals)
                    shownIds = raw ? JSON.parse(raw) : []
                  } catch {
                    shownIds = []
                  }

                  if (!shownIds.includes(mealId)) {
                    const title = 'Meal reminder'
                    const message =
                      diffMinutes >= 0
                        ? `Your ${nextLabel || 'meal'} is coming up at ${nextTimeStr}.`
                        : `Your ${nextLabel || 'meal'} started at ${nextTimeStr}. Tap to see what to adjust.`

                    mealNotifications.push({
                      id: `meal-${mealId}`,
                      type: 'system',
                      title,
                      message,
                      timestamp: now,
                      read: false,
                    })

                    try {
                      localStorage.setItem(storageKeyMeals, JSON.stringify([...shownIds, mealId]))
                    } catch {
                      // ignore storage errors
                    }
                  }
                }
              }
            }
          }
        } catch {
          // meal reminders are non-critical
        }

        // Combine all currently active notifications
        const allNotifications = [
          ...eventNotifications,
          ...dailyNotifications,
          ...mealNotifications,
        ]

        // Keep unread notifications visible until acknowledged, even if they
        // are no longer "currently active" in this refresh cycle.
        const persisted = loadPersistedNotifications()
        const persistedById = new Map(persisted.map((n) => [n.id, n]))
        const mergedById = new Map<string, Notification>()

        allNotifications.forEach((n) => {
          const existing = persistedById.get(n.id)
          mergedById.set(n.id, {
            ...n,
            read: existing?.read ?? false,
            timestamp: existing?.timestamp ?? n.timestamp,
          })
        })

        persisted.forEach((n) => {
          if (!mergedById.has(n.id) && !n.read) {
            mergedById.set(n.id, n)
          }
        })

        const merged = Array.from(mergedById.values()).sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
        )
        setNotifications(merged)
        persistNotifications(merged)
      } catch (err) {
        // Silently handle errors - notifications are non-critical
        console.warn('[useNotifications] Failed to load notifications:', err)
        // Set empty notifications on error to prevent UI issues
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
    
    // Refresh notifications every 5 minutes
    const interval = setInterval(loadNotifications, 5 * 60 * 1000)
    
    const handleSleepRefresh = () => {
      loadNotifications()
    }
    window.addEventListener('sleep-refreshed', handleSleepRefresh)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('sleep-refreshed', handleSleepRefresh)
    }
  }, [])

  const markAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n)
      persistNotifications(updated)
      return updated
    })
  }

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }))
      persistNotifications(updated)
      return updated
    })
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: () => {
      // Trigger refresh by updating a dependency
      setLoading(true)
    },
  }
}

