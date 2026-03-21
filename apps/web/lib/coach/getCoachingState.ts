export type CoachingStateStatus = 'green' | 'amber' | 'red'

export type CoachingState = {
  status: CoachingStateStatus
  label: string
  summary: string
}

/**
 * Get coaching state based on user's current metrics
 * Determines if user is in a depleted (red), borderline (amber), or stable (green) state
 */
export function getCoachingState(opts: {
  bodyClockScore?: number | null
  recoveryScore?: number | null
  sleepHoursLast24h?: number | null
  shiftType?: 'day' | 'night' | 'late' | 'off' | null
  moodScore?: number | null // 1–5
  focusScore?: number | null // 1–5
}): CoachingState {
  const {
    bodyClockScore,
    recoveryScore,
    sleepHoursLast24h,
    shiftType,
    moodScore,
    focusScore,
  } = opts

  // Default values / safety
  const sleep = sleepHoursLast24h ?? 7
  const body = bodyClockScore ?? 65
  const rec = recoveryScore ?? 60
  const mood = moodScore ?? 3
  const focus = focusScore ?? 3
  const shift = shiftType ?? 'day'

  let status: CoachingStateStatus = 'green'
  let label = 'Stable'

  // Define thresholds
  const veryLowSleep = sleep < 5
  const lowSleep = sleep < 6.5
  const lowRecovery = rec < 40
  const moderateRecovery = rec < 60
  const poorBodyClock = body < 45
  const moderateBodyClock = body < 60
  const lowMood = mood <= 2
  const moderateMood = mood <= 3
  const lowFocus = focus <= 2
  const moderateFocus = focus <= 3

  // Count red flags (severe issues)
  const redFlags = [
    veryLowSleep,
    lowRecovery,
    poorBodyClock,
    lowMood,
    lowFocus,
  ].filter(Boolean).length

  // Count amber flags (moderate issues)
  const amberFlags = [
    lowSleep && !veryLowSleep,
    moderateRecovery && !lowRecovery,
    moderateBodyClock && !poorBodyClock,
    moderateMood && !lowMood,
    moderateFocus && !lowFocus,
  ].filter(Boolean).length

  // Determine status
  if (redFlags >= 2) {
    status = 'red'
  } else if (redFlags === 1 || (amberFlags >= 2 && shift === 'night')) {
    status = 'amber'
  } else if (amberFlags >= 2) {
    status = 'amber'
  } else {
    status = 'green'
  }

  // Generate label based on status and context
  if (status === 'red') {
    if (veryLowSleep && shift === 'night') {
      label = 'Depleted on night shift'
    } else if (veryLowSleep) {
      label = 'Critically underslept'
    } else if (lowRecovery && shift === 'night') {
      label = 'Depleted on night shift'
    } else if (lowMood && lowFocus) {
      label = 'Low mood & focus'
    } else if (lowRecovery) {
      label = 'Depleted & under-recovered'
    } else {
      label = 'Depleted'
    }
  } else if (status === 'amber') {
    if (lowSleep && shift === 'night') {
      label = 'Running on low sleep (nights)'
    } else if (lowSleep) {
      label = 'Running on low sleep'
    } else if (lowMood) {
      label = 'Mood needs support'
    } else if (lowFocus) {
      label = 'Focus needs support'
    } else if (moderateRecovery && shift === 'night') {
      label = 'Borderline on nights'
    } else if (moderateRecovery) {
      label = 'Borderline recovery'
    } else {
      label = 'Stable but tired'
    }
  } else {
    // Green status
    if (shift === 'off') {
      label = 'Well rested & ready'
    } else if (shift === 'night' && rec >= 70) {
      label = 'Strong on nights'
    } else if (rec >= 75 && body >= 70) {
      label = 'Well recovered & aligned'
    } else {
      label = 'Stable & building momentum'
    }
  }

  // Build summary string
  const summary = [
    `Shift: ${shift}`,
    `Sleep last 24h: ${sleep.toFixed(1)}h`,
    `Body Clock Score: ${body}`,
    `Recovery Score: ${rec}`,
    `Mood: ${mood}/5`,
    `Focus: ${focus}/5`,
    `Overall state: ${status.toUpperCase()} - ${label}`,
  ].join('\n')

  return { status, label, summary }
}

