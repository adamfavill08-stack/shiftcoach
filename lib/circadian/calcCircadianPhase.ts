// -------------------------------------------------------
// ShiftCoach Circadian Engine
// Based on sleep midpoint, shift pressure,
// light opportunity, sleep debt, and consistency.
// -------------------------------------------------------

export type ShiftType = "morning" | "day" | "evening" | "night" | "rotating";

interface CircadianInput {
  sleepStart: Date;
  sleepEnd: Date;
  avgBedtime: number;         // minutes from midnight
  avgWakeTime: number;        // minutes from midnight
  bedtimeVariance: number;    // minutes
  sleepDurationHours: number;
  sleepDebtHours: number;
  shiftType: ShiftType;
}

export interface CircadianOutput {
  circadianPhase: number;     // 0–100
  alignmentScore: number;     // 0–100 internal score
  factors: {
    latestShift: number;
    sleepDuration: number;
    sleepTiming: number;
    sleepDebt: number;
    inconsistency: number;
  };
}

// -------------------------------------------------------
// CONFIGURATION (scientifically grounded)
// -------------------------------------------------------

const IDEAL_MIDPOINT = 3 * 60; // 03:00 = optimal circadian midpoint

const SHIFT_EFFECT = {
  morning:  +10,
  day:       0,
  evening:  -5,
  night:   -15,
  rotating: -12,
};

const VARIANCE_PENALTY = (varianceMin: number) => {
  if (varianceMin < 30) return 0;
  if (varianceMin < 60) return -5;
  if (varianceMin < 120) return -10;
  return -15;
};

// -------------------------------------------------------
// MAIN ENGINE
// -------------------------------------------------------

export function calculateCircadianPhase(input: CircadianInput): CircadianOutput {
  const {
    sleepStart,
    sleepEnd,
    avgBedtime,
    avgWakeTime,
    bedtimeVariance,
    sleepDurationHours,
    sleepDebtHours,
    shiftType
  } = input;

  // Sleep midpoint
  const midpointMinutes =
    (sleepStart.getTime() + sleepEnd.getTime()) / 2 / (1000 * 60);

  // Convert to 0–1440 range
  const midpointMod = ((midpointMinutes % 1440) + 1440) % 1440;

  // Deviation from ideal 03:00 midpoint
  let deviation = Math.abs(midpointMod - IDEAL_MIDPOINT);

  // Wrap-around correction (e.g., 23:00 vs 03:00)
  deviation = Math.min(deviation, 1440 - deviation);

  const hoursDeviation = deviation / 60;

  // ----------------------------------------------------
  // FACTOR CONTRIBUTIONS
  // ----------------------------------------------------

  const latestShift = SHIFT_EFFECT[shiftType];

  const sleepDurationScore =
    sleepDurationHours >= 7 ? 12 :
    sleepDurationHours >= 6 ? 4 :
    -8;

  const sleepTimingScore =
    hoursDeviation <= 1 ? 12 :
    hoursDeviation <= 2 ? 4 :
    -8;

  const sleepDebtScore =
    sleepDebtHours <= 2 ? 8 :
    sleepDebtHours <= 5 ? 0 :
    -12;

  const inconsistencyScore = VARIANCE_PENALTY(bedtimeVariance);

  // Weighted alignment score
  const alignmentScore =
    50 +
    latestShift +
    sleepDurationScore +
    sleepTimingScore +
    sleepDebtScore +
    inconsistencyScore;

  const clampedScore = Math.max(0, Math.min(100, alignmentScore));

  // Circadian phase is alignment mapped to 0-100 scale
  const circadianPhase = clampedScore;

  return {
    circadianPhase,
    alignmentScore: clampedScore,
    factors: {
      latestShift,
      sleepDuration: sleepDurationScore,
      sleepTiming: sleepTimingScore,
      sleepDebt: sleepDebtScore,
      inconsistency: inconsistencyScore,
    },
  };
}

