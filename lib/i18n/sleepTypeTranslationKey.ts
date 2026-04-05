import type { SleepType } from '@/lib/sleep/types'

/** Key into sleep UI messages (`sleepType.*`) for a session type label. */
export function sleepTypeToUiKey(type: SleepType | string): string {
  switch (type) {
    case 'main_sleep':
      return 'sleepType.main_sleep'
    case 'post_shift_sleep':
      return 'sleepType.post_shift_sleep'
    case 'recovery_sleep':
      return 'sleepType.recovery_sleep'
    case 'nap':
      return 'sleepType.nap'
    default:
      return 'sleepType.default'
  }
}
