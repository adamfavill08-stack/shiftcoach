"use client";

import { Footprints, Moon, Sunrise, Sun, Lightbulb } from "lucide-react";
import { estimateStepsByHourCivil, getLocalHourFromIso } from "@/lib/activity/buildStepsByHour";

type DayType = "shift" | "recovery" | "day_off";
type ShiftType = "day" | "evening" | "night" | "unknown";
type Verdict = "Low" | "Good" | "High";

export type StepSample = {
  timestamp: string;
  steps: number;
};

export type Shift = {
  start: string;
  end: string;
  type?: ShiftType;
};

export type AdaptiveMovementData =
  | {
      mode: "shift";
      title: "Your shift movement";
      mainSteps: number;
      verdict: Verdict;
      label: string;
      insight: string;
      totalSteps: number;
      segments: {
        before: number;
        during: number;
        after: number;
      };
    }
  | {
      mode: "recovery" | "day_off";
      title: "Your recovery movement" | "Your movement today";
      mainSteps: number;
      verdict: Verdict;
      label: string;
      insight: string;
      totalSteps: number;
      segments: {
        morning: number;
        midday: number;
        evening: number;
      };
    };

function safeSteps(value: number) {
  return Math.max(0, Number.isFinite(value) ? value : 0);
}

function toTime(value: string) {
  return new Date(value).getTime();
}

function isValidTime(value: number) {
  return Number.isFinite(value);
}

function formatSteps(value: number) {
  return new Intl.NumberFormat("en-GB").format(Math.round(value || 0));
}

function inferShiftType(shift: Shift): ShiftType {
  if (shift.type) return shift.type;

  const hour = new Date(shift.start).getHours();

  if (hour >= 5 && hour < 14) return "day";
  if (hour >= 14 && hour < 20) return "evening";
  return "night";
}

function getShiftVerdict(steps: number, shiftType: ShiftType): Verdict {
  if (shiftType === "night") {
    if (steps < 1500) return "Low";
    if (steps <= 5500) return "Good";
    return "High";
  }

  if (shiftType === "day") {
    if (steps < 2500) return "Low";
    if (steps <= 7500) return "Good";
    return "High";
  }

  if (shiftType === "evening") {
    if (steps < 2000) return "Low";
    if (steps <= 6500) return "Good";
    return "High";
  }

  if (steps < 2000) return "Low";
  if (steps <= 6500) return "Good";
  return "High";
}

function getRecoveryVerdict(steps: number): Verdict {
  if (steps < 1500) return "Low";
  if (steps <= 5000) return "Good";
  return "High";
}

function getDayOffVerdict(steps: number): Verdict {
  if (steps < 2500) return "Low";
  if (steps <= 8000) return "Good";
  return "High";
}

function getShiftInsight(verdict: Verdict, shiftType: ShiftType) {
  if (verdict === "Low") {
    return shiftType === "night"
      ? "Quiet night. Try a short walk halfway through."
      : "Quiet shift. Try a short walk when you can.";
  }

  if (verdict === "Good") {
    return "Good movement during your shift.";
  }

  return "High movement today. Prioritise recovery after work.";
}

function getRecoveryInsight(verdict: Verdict) {
  if (verdict === "Low") return "Very quiet day. A gentle walk may help recovery.";
  if (verdict === "Good") return "Good balance. Light movement supports recovery.";
  return "High activity today. Make space for rest later.";
}

function getDayOffInsight(verdict: Verdict) {
  if (verdict === "Low") return "Low movement today. A short walk could help energy.";
  if (verdict === "Good") return "Good movement for a day off.";
  return "Active day. Remember to recover before your next shift.";
}

function getDayPart(timestamp: string, activityTimeZone?: string | null): "morning" | "midday" | "evening" | null {
  const time = toTime(timestamp);
  if (!isValidTime(time)) return null;

  let hour = 12;
  if (typeof activityTimeZone === "string" && activityTimeZone.trim()) {
    try {
      hour = getLocalHourFromIso(timestamp, activityTimeZone.trim());
    } catch {
      hour = new Date(timestamp).getHours();
    }
  } else {
    hour = new Date(timestamp).getHours();
  }

  /** Civil clock day-parts aligned with UX copy (recovery / day off). */
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "midday";
  return "evening";
}

/** Bucket `stepsByHour[h]` is civil hour `h` in `activityIntelTimeZone` (anchor null). */
function morningMidEveningFrom24CivilBuckets(buckets: readonly number[]): {
  morning: number;
  midday: number;
  evening: number;
} {
  let morning = 0;
  let midday = 0;
  let evening = 0;
  if (buckets.length !== 24) return { morning, midday, evening };
  for (let h = 0; h < 24; h += 1) {
    const steps = Math.max(0, Math.round(buckets[h] ?? 0));
    if (steps <= 0) continue;
    if (h >= 5 && h < 12) morning += steps;
    else if (h >= 12 && h < 18) midday += steps;
    else evening += steps;
  }
  return { morning, midday, evening };
}

function stepsTotalFromBuckets(b: { morning: number; midday: number; evening: number }) {
  return b.morning + b.midday + b.evening;
}

export function buildAdaptiveMovementData({
  samples,
  dayType,
  shift,
  activityTimeZone,
  hourlyCivilBuckets,
  coherentStepsFallback,
  nowForDistribution,
}: {
  samples: StepSample[];
  dayType: DayType;
  shift?: Shift | null;
  /** Align 15‑min samples to morning/mid/evening in this IANA zone (not device locale). */
  activityTimeZone?: string | null;
  /** Fallback when `samples` yield 0: today’s civil `stepsByHour` from `/api/activity/today` (same zone as snapshots). */
  hourlyCivilBuckets?: readonly number[] | null;
  /** Last resort when both samples and hourly are empty but activity total is known from logs. */
  coherentStepsFallback?: number | null;
  nowForDistribution?: Date;
}): AdaptiveMovementData {
  if (dayType === "shift") {
    if (!shift) {
      throw new Error("Shift day requires shift start and end.");
    }

    const shiftStart = toTime(shift.start);
    const shiftEnd = toTime(shift.end);

    if (!isValidTime(shiftStart) || !isValidTime(shiftEnd)) {
      throw new Error("Invalid shift start or end time.");
    }

    if (shiftEnd <= shiftStart) {
      throw new Error(
        "Shift end must be after shift start. For overnight shifts, use the next day as the end date.",
      );
    }

    let before = 0;
    let during = 0;
    let after = 0;

    for (const sample of samples) {
      const time = toTime(sample.timestamp);
      if (!isValidTime(time)) continue;

      const steps = safeSteps(sample.steps);

      if (time < shiftStart) {
        before += steps;
      } else if (time >= shiftStart && time <= shiftEnd) {
        during += steps;
      } else {
        after += steps;
      }
    }

    const totalSteps = before + during + after;
    const shiftType = inferShiftType(shift);
    const verdict = getShiftVerdict(during, shiftType);

    return {
      mode: "shift",
      title: "Your shift movement",
      mainSteps: during,
      verdict,
      label: totalSteps === 0 ? "No movement data" : `${verdict} for a ${shiftType} shift`,
      insight: totalSteps === 0 ? "No movement data yet." : getShiftInsight(verdict, shiftType),
      totalSteps,
      segments: {
        before,
        during,
        after,
      },
    };
  }

  let morning = 0;
  let midday = 0;
  let evening = 0;

  const now = nowForDistribution ?? new Date();

  for (const sample of samples) {
    const part = getDayPart(sample.timestamp, activityTimeZone);
    if (!part) continue;

    const steps = safeSteps(sample.steps);

    if (part === "morning") morning += steps;
    if (part === "midday") midday += steps;
    if (part === "evening") evening += steps;
  }

  let totalSteps = morning + midday + evening;

  if (totalSteps <= 0 && hourlyCivilBuckets && hourlyCivilBuckets.length === 24) {
    const fromHourly = morningMidEveningFrom24CivilBuckets(hourlyCivilBuckets);
    if (stepsTotalFromBuckets(fromHourly) > 0) {
      morning = fromHourly.morning;
      midday = fromHourly.midday;
      evening = fromHourly.evening;
      totalSteps = stepsTotalFromBuckets(fromHourly);
    }
  }

  const tzTrim =
    typeof activityTimeZone === "string" && activityTimeZone.trim() ? activityTimeZone.trim() : null;
  if (totalSteps <= 0 && tzTrim != null && typeof coherentStepsFallback === "number" && coherentStepsFallback > 0) {
    const est = estimateStepsByHourCivil(Math.round(coherentStepsFallback), tzTrim, now);
    const fb = morningMidEveningFrom24CivilBuckets(est);
    if (stepsTotalFromBuckets(fb) > 0) {
      morning = fb.morning;
      midday = fb.midday;
      evening = fb.evening;
      totalSteps = stepsTotalFromBuckets(fb);
    }
  }

  if (dayType === "recovery") {
    const verdict = getRecoveryVerdict(totalSteps);

    return {
      mode: "recovery",
      title: "Your recovery movement",
      mainSteps: totalSteps,
      verdict,
      label: totalSteps === 0 ? "No movement data" : `${verdict} for a recovery day`,
      insight: totalSteps === 0 ? "No movement data yet." : getRecoveryInsight(verdict),
      totalSteps,
      segments: {
        morning,
        midday,
        evening,
      },
    };
  }

  const verdict = getDayOffVerdict(totalSteps);

  return {
    mode: "day_off",
    title: "Your movement today",
    mainSteps: totalSteps,
    verdict,
    label: totalSteps === 0 ? "No movement data" : `${verdict} for a day off`,
    insight: totalSteps === 0 ? "No movement data yet." : getDayOffInsight(verdict),
    totalSteps,
    segments: {
      morning,
      midday,
      evening,
    },
  };
}

export function buildEmptyShiftMovementData(): AdaptiveMovementData {
  return {
    mode: "shift",
    title: "Your shift movement",
    mainSteps: 0,
    verdict: "Low",
    label: "Shift times unavailable",
    insight: "Add shift times to see movement during work.",
    totalSteps: 0,
    segments: {
      before: 0,
      during: 0,
      after: 0,
    },
  };
}

function getVerdictClasses(verdict: Verdict) {
  if (verdict === "Low") return "text-amber-700 dark:text-amber-300";
  if (verdict === "Good") return "text-emerald-700 dark:text-emerald-300";
  return "text-rose-700 dark:text-rose-300";
}

function getSegmentItems(data: AdaptiveMovementData) {
  if (data.mode === "shift") {
    return [
      { label: "Before shift", value: data.segments.before, emphasis: false },
      { label: "During shift", value: data.segments.during, emphasis: true },
      { label: "After shift", value: data.segments.after, emphasis: false },
    ];
  }

  return [
    { label: "Morning", value: data.segments.morning, emphasis: false },
    { label: "Midday", value: data.segments.midday, emphasis: true },
    { label: "Evening", value: data.segments.evening, emphasis: false },
  ];
}

function segmentIcon(label: string) {
  if (label.includes("During") || label === "Midday") return Moon;
  if (label.includes("After") || label === "Evening") return Sun;
  return Sunrise;
}

export function AdaptiveMovementCard({
  data,
}: {
  data: AdaptiveMovementData;
}) {
  const items = getSegmentItems(data);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const mainLabel = data.mode === "shift" ? "steps during shift" : "steps today";
  const HeaderIcon = data.mode === "shift" ? Moon : data.mode === "recovery" ? Lightbulb : Sun;

  return (
    <section className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.08)] dark:border-[var(--border-subtle)] dark:bg-[var(--card)] dark:shadow-[0_12px_34px_rgba(0,0,0,0.35)]">
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300">
            <HeaderIcon className="h-5 w-5" />
          </span>
          <p className="text-lg font-semibold tracking-tight text-slate-900 dark:text-[var(--text-main)]">{data.title}</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[var(--border-subtle)] dark:bg-[var(--card-subtle)]">
            <p className="text-6xl font-semibold leading-none tracking-tight text-slate-900 dark:text-[var(--text-main)]">
              {formatSteps(data.mainSteps)}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-[var(--text-soft)]">{mainLabel}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[var(--border-subtle)] dark:bg-[var(--card-subtle)]">
            <p className={`text-base font-semibold ${getVerdictClasses(data.verdict)}`}>{data.label}</p>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-[var(--text-soft)]">{data.insight}</p>

            <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              {items.map((item) => {
                const width =
                  total > 0
                    ? Math.max((item.value / total) * 100, item.value > 0 ? 6 : 0)
                    : item.emphasis
                      ? 60
                      : 20;
                return (
                  <div
                    key={item.label}
                    className={item.emphasis ? "bg-emerald-400 dark:bg-amber-300" : "bg-slate-400/70 dark:bg-white/20"}
                    style={{ width: `${width}%` }}
                  />
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {items.map((item, index) => {
                const Icon = segmentIcon(item.label);
                return (
                  <div key={item.label} className={index > 0 ? "border-l border-slate-200 pl-2 dark:border-[var(--border-subtle)]" : ""}>
                    <Icon className="mb-1 h-4 w-4 text-emerald-500 dark:text-emerald-300" />
                    <p className="text-sm text-slate-600 dark:text-[var(--text-soft)]">{item.label}</p>
                    <p className={item.emphasis ? "text-2xl font-semibold text-emerald-600 dark:text-amber-300" : "text-2xl font-semibold text-slate-900 dark:text-[var(--text-main)]"}>
                      {formatSteps(item.value)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[var(--text-muted)]">steps</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 dark:border-[var(--border-subtle)] dark:bg-[var(--card-subtle)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300">
            <Footprints className="h-5 w-5" />
          </span>
          <p className="flex-1 text-base text-slate-900 dark:text-[var(--text-main)]">{data.insight}</p>
          <span className="text-xl text-slate-500 dark:text-[var(--text-muted)]">›</span>
        </div>
      </div>
    </section>
  );
}
