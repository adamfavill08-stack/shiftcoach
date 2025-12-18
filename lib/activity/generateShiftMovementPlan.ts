/**
 * Generate personalized shift movement plans for shift workers
 * Based on shift type, timing, and activity level
 */

import type { ShiftActivityLevel } from './activityLevels'

export type ShiftType = 'day' | 'night' | 'off' | 'other'

export type MovementActivity = {
  label: string
  timing: string // e.g., "Pre-shift", "Mid-shift", "Post-shift"
  duration: string // e.g., "10 min"
  description?: string
  suggestedTime?: string // Actual time suggestion if shift times are known
}

export type ShiftMovementPlan = {
  title: string
  activities: MovementActivity[]
  intensity: 'Low' | 'Moderate' | 'High'
  shiftType: ShiftType
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
}

/**
 * Calculate suggested time relative to shift
 */
function calculateSuggestedTime(
  shiftStart: Date | null,
  shiftEnd: Date | null,
  offsetHours: number
): string | undefined {
  if (!shiftStart) return undefined
  
  const suggested = new Date(shiftStart.getTime() + offsetHours * 60 * 60 * 1000)
  return formatTime(suggested)
}

/**
 * Generate movement plan based on shift details
 */
export function generateShiftMovementPlan(
  shiftType: ShiftType,
  shiftActivityLevel: ShiftActivityLevel | null,
  shiftStart: Date | null = null,
  shiftEnd: Date | null = null,
  currentTime: Date = new Date()
): ShiftMovementPlan {
  // Determine intensity based on activity level
  let intensity: 'Low' | 'Moderate' | 'High' = 'Moderate'
  if (shiftActivityLevel === 'very_light' || shiftActivityLevel === 'light') {
    intensity = 'Low'
  } else if (shiftActivityLevel === 'busy' || shiftActivityLevel === 'intense') {
    intensity = 'High'
  }

  // Generate plan based on shift type
  switch (shiftType) {
    case 'night': {
      const activities: MovementActivity[] = [
        {
          label: 'Pre-shift walk',
          timing: 'Pre-shift',
          duration: '10 min',
          description: 'Light walk to prepare your body for night work',
          suggestedTime: shiftStart ? calculateSuggestedTime(shiftStart, shiftEnd, -1) : undefined,
        },
        {
          label: 'Mid-shift stretch break',
          timing: 'Mid-shift',
          duration: '5-10 min',
          description: 'Gentle stretching to maintain circulation',
          suggestedTime: shiftStart && shiftEnd 
            ? formatTime(new Date(shiftStart.getTime() + (shiftEnd.getTime() - shiftStart.getTime()) / 2))
            : undefined,
        },
        {
          label: 'Post-shift wind-down walk',
          timing: 'Post-shift',
          duration: '10-15 min',
          description: 'Gentle movement to help transition to sleep',
          suggestedTime: shiftEnd ? calculateSuggestedTime(shiftEnd, null, 0.5) : undefined,
        },
      ]

      // Adjust based on activity level
      if (shiftActivityLevel === 'intense' || shiftActivityLevel === 'busy') {
        activities.push({
          label: 'Recovery stretching',
          timing: 'Post-shift',
          duration: '15 min',
          description: 'Focus on muscle groups used during shift',
          suggestedTime: shiftEnd ? calculateSuggestedTime(shiftEnd, null, 1) : undefined,
        })
        intensity = 'High'
      } else if (shiftActivityLevel === 'very_light') {
        // For very light shifts, suggest more movement
        activities[1] = {
          ...activities[1],
          duration: '10-15 min',
          description: 'Light movement to maintain energy',
        }
        intensity = 'Low'
      }

      return {
        title: 'Night shift plan',
        activities,
        intensity,
        shiftType: 'night',
      }
    }

    case 'day': {
      const activities: MovementActivity[] = [
        {
          label: 'Morning walk',
          timing: 'Pre-shift',
          duration: '10-15 min',
          description: 'Start your day with light movement',
          suggestedTime: shiftStart ? calculateSuggestedTime(shiftStart, shiftEnd, -1.5) : undefined,
        },
        {
          label: 'Lunch break movement',
          timing: 'Mid-shift',
          duration: '10 min',
          description: 'Short walk or stretch during break',
          suggestedTime: shiftStart && shiftEnd 
            ? formatTime(new Date(shiftStart.getTime() + (shiftEnd.getTime() - shiftStart.getTime()) / 2))
            : undefined,
        },
        {
          label: 'Evening recovery walk',
          timing: 'Post-shift',
          duration: '15 min',
          description: 'Unwind after your shift',
          suggestedTime: shiftEnd ? calculateSuggestedTime(shiftEnd, null, 0.5) : undefined,
        },
      ]

      // Adjust based on activity level
      if (shiftActivityLevel === 'intense' || shiftActivityLevel === 'busy') {
        activities[1] = {
          ...activities[1],
          duration: '15 min',
          description: 'Active recovery during break',
        }
        activities.push({
          label: 'Post-shift mobility',
          timing: 'Post-shift',
          duration: '10 min',
          description: 'Focus on areas of tension',
          suggestedTime: shiftEnd ? calculateSuggestedTime(shiftEnd, null, 1) : undefined,
        })
        intensity = 'High'
      }

      return {
        title: 'Day shift plan',
        activities,
        intensity,
        shiftType: 'day',
      }
    }

    case 'off': {
      const activities: MovementActivity[] = [
        {
          label: 'Morning movement',
          timing: 'Morning',
          duration: '20-30 min',
          description: 'Gentle walk, yoga, or light exercise',
        },
        {
          label: 'Afternoon activity',
          timing: 'Afternoon',
          duration: '15-20 min',
          description: 'Maintain movement patterns',
        },
        {
          label: 'Evening stretch',
          timing: 'Evening',
          duration: '10-15 min',
          description: 'Relaxation and recovery',
        },
      ]

      // Off days can be more flexible
      if (shiftActivityLevel === 'intense' || shiftActivityLevel === 'busy') {
        activities[0] = {
          ...activities[0],
          duration: '30-45 min',
          description: 'Active recovery - longer walk or light exercise',
        }
        intensity = 'Moderate'
      } else {
        intensity = 'Low'
      }

      return {
        title: 'Recovery day plan',
        activities,
        intensity,
        shiftType: 'off',
      }
    }

    default: {
      // Generic plan for other/unknown shift types
      return {
        title: 'Daily movement plan',
        activities: [
          {
            label: 'Morning walk',
            timing: 'Morning',
            duration: '10-15 min',
            description: 'Start your day with movement',
          },
          {
            label: 'Midday break',
            timing: 'Midday',
            duration: '10 min',
            description: 'Short movement break',
          },
          {
            label: 'Evening stretch',
            timing: 'Evening',
            duration: '10-15 min',
            description: 'Wind down with gentle movement',
          },
        ],
        intensity: 'Moderate',
        shiftType: 'other',
      }
    }
  }
}

