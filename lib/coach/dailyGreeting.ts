/**
 * Daily Greeting Generator
 * 
 * Generates a personalized greeting message for the Shift Coach
 * that appears once per day when the user opens the app.
 */

export type GreetingContext = {
  userName: string | null
  todayShift: {
    label: string | null
    type?: 'day' | 'night' | 'evening' | 'off' | null
  } | null
  todayEvent: {
    title: string | null
    type: string | null
  } | null
}

/**
 * Get time-based greeting (good morning, good afternoon, good evening)
 */
export function getTimeGreeting(): string {
  const hour = new Date().getHours()
  
  if (hour >= 5 && hour < 12) {
    return 'Good morning'
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon'
  } else if (hour >= 17 && hour < 22) {
    return 'Good evening'
  } else {
    // 22:00 - 04:59
    return 'Good evening'
  }
}

/**
 * Get shift/event description for today
 */
export function getTodayActivity(context: GreetingContext): string {
  // Prioritize events (especially holidays) over shifts
  if (context.todayEvent) {
    if (context.todayEvent.type === 'holiday') {
      return `you're on holiday (${context.todayEvent.title || 'holiday'})`
    }
    return `you have ${context.todayEvent.title || 'an event'} today`
  }
  
  if (context.todayShift) {
    const label = context.todayShift.label
    if (!label || label === 'OFF' || label === 'off') {
      return "you're off today"
    }
    
    // Try to determine shift type from label
    const labelLower = label.toLowerCase()
    if (labelLower.includes('night') || labelLower.includes('nights')) {
      return `you're on a night shift`
    } else if (labelLower.includes('day') || labelLower.includes('days')) {
      return `you're on a day shift`
    } else if (labelLower.includes('evening')) {
      return `you're on an evening shift`
    } else {
      return `you're on a ${label} shift`
    }
  }
  
  return "you're working today"
}

/**
 * Generate the full personalized greeting message
 */
export function generateDailyGreeting(context: GreetingContext): string {
  const timeGreeting = getTimeGreeting()
  const firstName = context.userName 
    ? context.userName.split(' ')[0] 
    : null
  
  const greeting = firstName 
    ? `${timeGreeting}, ${firstName}`
    : timeGreeting
  
  const activity = getTodayActivity(context)
  
  // Updated message to be more accurate - calculations happen when you open the app
  return `${greeting}! I see ${activity}. I hope you're doing well today. How is your mood? I'm calculating your personalized calories, macros, and meal timing recommendations right now - they'll be ready in just a moment!`
}

/**
 * Check if greeting was already shown today
 */
export function hasSeenGreetingToday(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const lastSeen = localStorage.getItem('coach-daily-greeting-date')
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    
    return lastSeen === today
  } catch {
    return false
  }
}

/**
 * Mark greeting as seen for today
 */
export function markGreetingAsSeen(): void {
  if (typeof window === 'undefined') return
  
  try {
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    localStorage.setItem('coach-daily-greeting-date', today)
  } catch {
    // Ignore localStorage errors
  }
}

