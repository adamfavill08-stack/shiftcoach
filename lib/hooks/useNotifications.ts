'use client'

import { useState, useEffect } from 'react'
import { getMyProfile } from '@/lib/profile'

export type Notification = {
  id: string
  type: 'mood_focus' | 'event' | 'system'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoading(true)
        const profile = await getMyProfile()
        
        // Check if notifications are enabled
        const notificationsEnabled = profile?.mood_focus_alerts_enabled ?? true
        
        if (!notificationsEnabled) {
          setNotifications([])
          setLoading(false)
          return
        }

        // Check for mood/focus alerts
        const moodFocusNotifications: Notification[] = []
        try {
          const res = await fetch('/api/today', { 
            credentials: 'include',
            cache: 'no-store',
          }).catch(() => null)
          
          if (res && res.ok) {
            try {
              const data = await res.json()
              const mood = data.mood ?? 3
              const focus = data.focus ?? 3
              
              // Show notification if mood or focus is low (1 or 2)
              if (mood <= 2 || focus <= 2) {
                moodFocusNotifications.push({
                  id: 'mood-focus-low',
                  type: 'mood_focus',
                  title: 'Low Mood or Focus',
                  message: mood <= 2 && focus <= 2
                    ? 'Your mood and focus are low today. Consider taking it easy and prioritizing rest.'
                    : mood <= 2
                    ? 'Your mood is low today. Take care of yourself and consider speaking with your coach.'
                    : 'Your focus is low today. You might benefit from lighter activities and rest.',
                  timestamp: new Date(),
                  read: false,
                })
              }
            } catch (parseErr) {
              // Silently handle JSON parse errors
              console.warn('[useNotifications] Failed to parse mood/focus response')
            }
          }
        } catch (err) {
          // Silently handle fetch errors - notifications are non-critical
          console.warn('[useNotifications] Failed to fetch mood/focus:', err)
        }

        // Check for upcoming events (next 24 hours)
        const eventNotifications: Notification[] = []
        try {
          const now = new Date()
          const currentMonth = now.getMonth() + 1
          const currentYear = now.getFullYear()
          const res = await fetch(`/api/rota/event?month=${currentMonth}&year=${currentYear}`, { 
            cache: 'no-store' 
          }).catch(() => null)
          
          if (res && res.ok) {
            try {
              const data = await res.json()
              const events = data.events || []
              
              events.forEach((event: any) => {
                if (event.start_at) {
                  const eventStart = new Date(event.start_at)
                  const hoursUntil = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60)
                  
                  // Show notification for events starting in next 24 hours
                  if (hoursUntil > 0 && hoursUntil <= 24) {
                    eventNotifications.push({
                      id: `event-${event.id}`,
                      type: 'event',
                      title: 'Upcoming Shift',
                      message: `${event.title || 'Shift'} starts ${hoursUntil < 1 ? `in ${Math.round(hoursUntil * 60)} minutes` : `in ${Math.round(hoursUntil)} hours`}`,
                      timestamp: eventStart,
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

        // Daily check‑in reminder (always morning; controlled by master notification toggle)
        const dailyNotifications: Notification[] = []
        try {
          const dailyReminderSetting: 'morning' = 'morning'
          if (dailyReminderSetting) {
            const now = new Date()
            const hours = now.getHours()
            const todayKey = now.toISOString().slice(0, 10)
            const storageKey = 'daily-reminder-shown'

            const lastShown = (() => {
              try {
                return localStorage.getItem(storageKey)
              } catch {
                return null
              }
            })()

            const inMorningWindow = hours >= 5 && hours < 12

            const shouldShow = lastShown !== todayKey && inMorningWindow

            if (shouldShow) {
              // Fetch today's shift to personalise the message
              let shiftLabel: string | null = null
              try {
                const todayStr = todayKey
                const tomorrow = new Date(now)
                tomorrow.setDate(tomorrow.getDate() + 1)
                const tomorrowStr = tomorrow.toISOString().slice(0, 10)
                const res = await fetch(
                  `/api/shifts?from=${todayStr}&to=${tomorrowStr}`,
                  { cache: 'no-store' },
                ).catch(() => null)
                if (res && res.ok) {
                  const json = await res.json()
                  const shifts = json.shifts || []
                  const todayShift = shifts.find((s: any) => s.date === todayStr)
                  if (todayShift?.label) {
                    shiftLabel = String(todayShift.label)
                  }
                }
              } catch {
                // Non-critical; continue with generic copy
              }

              const niceShift =
                shiftLabel && typeof shiftLabel === 'string'
                  ? shiftLabel.charAt(0).toUpperCase() + shiftLabel.slice(1).toLowerCase()
                  : 'today'

              const title = 'Morning check‑in'

              const message = `Log last night’s sleep and review your ${niceShift} shift plan.`

              dailyNotifications.push({
                id: `daily-checkin-${todayKey}-${dailyReminderSetting}`,
                type: 'system',
                title,
                message,
                timestamp: now,
                read: false,
              })

              try {
                localStorage.setItem(storageKey, todayKey)
              } catch {
                // ignore
              }
            }
          }
        } catch {
          // daily reminder is non-critical
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

        // Combine all notifications
        const allNotifications = [
          ...moodFocusNotifications,
          ...eventNotifications,
          ...dailyNotifications,
          ...mealNotifications,
        ]
        
        // Load read state from localStorage
        try {
          const readIdsJson = localStorage.getItem('notification-read-ids')
          const readIds = readIdsJson ? JSON.parse(readIdsJson) : []
          const notificationsWithReadState = allNotifications.map(n => ({
            ...n,
            read: readIds.includes(n.id),
          }))
          setNotifications(notificationsWithReadState)
        } catch {
          setNotifications(allNotifications)
        }
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
    
    // Listen for mood/focus updates
    const handleMoodFocusUpdate = () => {
      loadNotifications()
    }
    window.addEventListener('mood-focus-updated', handleMoodFocusUpdate)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('mood-focus-updated', handleMoodFocusUpdate)
    }
  }, [])

  const markAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n)
      // Persist read state
      try {
        const readIds = updated.filter(n => n.read).map(n => n.id)
        localStorage.setItem('notification-read-ids', JSON.stringify(readIds))
      } catch {}
      return updated
    })
  }

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }))
      // Persist read state
      try {
        const readIds = updated.map(n => n.id)
        localStorage.setItem('notification-read-ids', JSON.stringify(readIds))
      } catch {}
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

