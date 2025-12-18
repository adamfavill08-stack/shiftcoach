/**
 * Generate personalized activity recommendations for shift workers
 * Based on recovery score, activity score, shift type, and context
 */

export type ActivityRecommendationInputs = {
  recoveryScore: number // 0-100
  activityScore: number // 0-100
  shiftType: 'day' | 'night' | 'off' | 'other'
  shiftActivityLevel?: 'very_light' | 'light' | 'moderate' | 'busy' | 'intense' | null
  lastSleepHours?: number | null
  sleepDebtHours?: number
}

/**
 * Generate activity recommendation
 */
export function generateActivityRecommendation(
  inputs: ActivityRecommendationInputs
): string {
  const {
    recoveryScore,
    activityScore,
    shiftType,
    shiftActivityLevel,
    lastSleepHours,
    sleepDebtHours = 0,
  } = inputs

  // High recovery + Low activity = Ideal for training
  if (recoveryScore >= 75 && activityScore < 50) {
    if (shiftType === 'off') {
      return "Because your recovery is high and your activity load is still low, you're in an ideal window for moderate training – such as a structured workout, long walk, or active recovery session."
    } else if (shiftType === 'night') {
      return "Your recovery is high and activity is low. Consider a pre-shift walk or light movement to prepare for your night shift. Save intense training for your off days."
    } else {
      return "Because your recovery is high and your activity load is still low, you're in an ideal window for moderate training – such as a structured workout, long walk, or active recovery."
    }
  }

  // High recovery + Moderate activity = Good for more activity
  if (recoveryScore >= 75 && activityScore >= 50 && activityScore < 70) {
    if (shiftType === 'off') {
      return "Your recovery is strong and you've had moderate activity. You can handle more movement today – consider adding a longer walk or light exercise session."
    } else {
      return "Your recovery is strong. You've had some activity today, but there's still room for more movement if you feel up to it."
    }
  }

  // High recovery + High activity = Maintain, don't push
  if (recoveryScore >= 75 && activityScore >= 70) {
    return "You've had excellent recovery and high activity today. Focus on maintaining this balance – avoid pushing too hard and prioritize rest and recovery."
  }

  // Moderate recovery + Low activity = Gentle movement
  if (recoveryScore >= 50 && recoveryScore < 75 && activityScore < 50) {
    if (shiftType === 'night') {
      return "Your recovery is moderate and activity is low. Focus on gentle movement like walking or stretching. Avoid intense training before your night shift."
    } else if (sleepDebtHours > 3) {
      return "Your recovery is moderate with some sleep debt. Prioritize gentle movement and rest. A light walk or stretching would be ideal today."
    } else {
      return "Your recovery is moderate and activity is low. Gentle movement like a walk or light stretching would be beneficial today."
    }
  }

  // Moderate recovery + Moderate/High activity = Rest focus
  if (recoveryScore >= 50 && recoveryScore < 75 && activityScore >= 50) {
    if (shiftActivityLevel === 'intense' || shiftActivityLevel === 'busy') {
      return "You've had a demanding shift and moderate recovery. Focus on rest and recovery today. Light stretching or a gentle walk is enough."
    } else {
      return "Your recovery is moderate and you've had decent activity. Balance is key – consider lighter activities and prioritize rest."
    }
  }

  // Low recovery + Any activity = Rest priority
  if (recoveryScore < 50) {
    if (lastSleepHours !== null && lastSleepHours !== undefined && lastSleepHours < 5) {
      return "Your recovery is low due to very short sleep. Rest is your top priority today. Avoid intense activity and focus on recovery."
    } else if (sleepDebtHours > 7) {
      return "Your recovery is low due to accumulated sleep debt. Prioritize rest and recovery. Gentle movement only if you feel up to it."
    } else if (shiftType === 'night') {
      return "Your recovery is low. Before your night shift, focus on rest and gentle movement. Avoid any intense training."
    } else {
      return "Your recovery is low. Today is about rest and recovery, not pushing your limits. Gentle movement like walking is fine, but prioritize rest."
    }
  }

  // Default fallback
  return "Listen to your body today. Balance activity with recovery based on how you feel."
}

