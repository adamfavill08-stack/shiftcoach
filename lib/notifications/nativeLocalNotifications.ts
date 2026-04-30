import { Capacitor } from '@capacitor/core'

const DEFAULT_CHANNEL_ID = 'shiftcoach-alerts'
let channelReady = false

export async function ensureLocalNotificationChannel(): Promise<string | undefined> {
  if (!Capacitor.isNativePlatform()) return undefined
  if (channelReady) return DEFAULT_CHANNEL_ID

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    if (Capacitor.getPlatform() === 'android') {
      await LocalNotifications.createChannel({
        id: DEFAULT_CHANNEL_ID,
        name: 'ShiftCoach Alerts',
        description: 'Shift, fatigue, and schedule reminders',
        importance: 4,
        visibility: 1,
        sound: undefined,
      })
    }
    channelReady = true
    return DEFAULT_CHANNEL_ID
  } catch {
    return undefined
  }
}

