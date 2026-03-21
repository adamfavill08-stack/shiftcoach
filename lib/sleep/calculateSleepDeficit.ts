/**
 * Sleep Deficit Calculation
 * Computes weekly sleep deficit based on required vs actual sleep hours
 */

export type SleepDeficitCategory = "surplus" | "low" | "medium" | "high";

export interface SleepDeficitDay {
  date: string;        // "2025-11-19"
  label: string;       // "Mon" etc
  required: number;    // hours
  actual: number;      // hours
  deficit: number;     // hours (can be negative for surplus)
}

export interface SleepDeficitResponse {
  requiredDaily: number; // 7.5
  weeklyDeficit: number; // clamped, in hours
  daily: SleepDeficitDay[];
  category: SleepDeficitCategory;
}

/**
 * Calculate sleep deficit for the last 7 days
 */
export function calculateSleepDeficit(
  sleepData: Array<{
    date: string;
    totalMinutes: number;
  }>,
  requiredDailyHours: number = 7.5
): SleepDeficitResponse {
  // If there is effectively no sleep data at all (all zeros), treat deficit as 0 for new users.
  const hasAnySleep =
    Array.isArray(sleepData) && sleepData.some((d) => (d?.totalMinutes ?? 0) > 0);

  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Build 7 days array (most recent first)
  const daily: SleepDeficitDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12, 0, 0);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dayOfWeek = date.getDay();
    const label = dayNames[dayOfWeek];
    
    // Find sleep data for this date
    const dayData = sleepData.find(d => d.date === dateStr);
    const actualHours = dayData ? dayData.totalMinutes / 60 : 0;
    const deficit = requiredDailyHours - actualHours;
    
    daily.push({
      date: dateStr,
      label,
      required: requiredDailyHours,
      actual: actualHours,
      deficit,
    });
  }
  
  // Calculate weekly deficit (sum of all deficits)
  const weeklyDeficit = hasAnySleep
    ? daily.reduce((sum, day) => sum + day.deficit, 0)
    : 0;
  
  // Clamp weekly deficit to [-8, 20]
  const clampedDeficit = Math.max(-8, Math.min(20, weeklyDeficit));
  
  // Determine category
  let category: SleepDeficitCategory;
  if (clampedDeficit <= -1) {
    category = "surplus";
  } else if (clampedDeficit < 3) {
    category = "low";
  } else if (clampedDeficit < 8) {
    category = "medium";
  } else {
    category = "high";
  }
  
  return {
    requiredDaily: requiredDailyHours,
    weeklyDeficit: clampedDeficit,
    daily,
    category,
  };
}

