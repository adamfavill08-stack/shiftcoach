"use client";

import { Footprints, Moon, Sunrise, Sun, Lightbulb } from "lucide-react";
import { estimateStepsByHourCivil, getLocalHourFromIso } from "@/lib/activity/buildStepsByHour";
import { formatYmdInTimeZone, startOfLocalDayUtcMs } from "@/lib/sleep/utils";

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
      /** Used for icons / emphasis; inferred from `shift` when not supplied at build time. */
      shiftType: ShiftType;
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

const HOUR_MS = 60 * 60 * 1000;

function sameCalendarDayInZone(isoA: string, isoB: string, timeZone: string): boolean {
  try {
    return formatYmdInTimeZone(new Date(isoA), timeZone) === formatYmdInTimeZone(new Date(isoB), timeZone);
  } catch {
    return false;
  }
}

/** Split one hourly bucket’s steps across before / during / after the shift window using overlap length. */
function splitBucketStepsAcrossShift(
  steps: number,
  intervalStartMs: number,
  intervalEndMs: number,
  shiftStartMs: number,
  shiftEndMs: number,
): { before: number; during: number; after: number } {
  const span = intervalEndMs - intervalStartMs;
  if (span <= 0 || steps <= 0) return { before: 0, during: 0, after: 0 };

  const beforeDur = Math.max(0, Math.min(shiftStartMs, intervalEndMs) - intervalStartMs);
  const duringDur = Math.max(0, Math.min(intervalEndMs, shiftEndMs) - Math.max(intervalStartMs, shiftStartMs));
  const afterDur = Math.max(0, intervalEndMs - Math.max(intervalStartMs, shiftEndMs));

  return {
    before: (steps * beforeDur) / span,
    during: (steps * duringDur) / span,
    after: (steps * afterDur) / span,
  };
}

function roundBeforeDuringAfter(
  before: number,
  during: number,
  after: number,
  targetTotal: number,
): { before: number; during: number; after: number } {
  const t = Math.round(targetTotal);
  let b = Math.max(0, Math.round(before));
  let d = Math.max(0, Math.round(during));
  let a = Math.max(0, Math.round(after));
  let diff = t - (b + d + a);
  let guard = 0;
  while (diff !== 0 && guard < 50) {
    if (diff > 0) {
      if (d >= b && d >= a) d++;
      else if (b >= a) b++;
      else a++;
      diff--;
    } else {
      if (a > 0 && a >= d && a >= b) a--;
      else if (b > 0 && b >= d) b--;
      else if (d > 0) d--;
      else break;
      diff++;
    }
    guard++;
  }
  return { before: b, during: d, after: a };
}

function shiftSegmentsFrom24HourlyBuckets(
  buckets: readonly number[],
  shiftStartMs: number,
  shiftEndMs: number,
  intervalForIndex: (hourIndex: number) => { startMs: number; endMs: number },
): { before: number; during: number; after: number; hourlySum: number } | null {
  if (buckets.length !== 24) return null;
  let before = 0;
  let during = 0;
  let after = 0;
  let hourlySum = 0;
  for (let h = 0; h < 24; h += 1) {
    const steps = Math.max(0, Math.round(buckets[h] ?? 0));
    if (steps <= 0) continue;
    hourlySum += steps;
    const { startMs, endMs } = intervalForIndex(h);
    const part = splitBucketStepsAcrossShift(steps, startMs, endMs, shiftStartMs, shiftEndMs);
    before += part.before;
    during += part.during;
    after += part.after;
  }
  if (hourlySum <= 0) return null;
  const rounded = roundBeforeDuringAfter(before, during, after, hourlySum);
  return { ...rounded, hourlySum };
}

export function buildAdaptiveMovementData({
  samples,
  dayType,
  shift,
  activityTimeZone,
  hourlyCivilBuckets,
  hourlyShiftAnchoredBuckets,
  stepsByHourAnchorStart,
  activityDateYmd,
  coherentStepsFallback,
  nowForDistribution,
}: {
  samples: StepSample[];
  dayType: DayType;
  shift?: Shift | null;
  /** Align 15‑min samples to morning/mid/evening in this IANA zone (not device locale). */
  activityTimeZone?: string | null;
  /** Civil clock `stepsByHour` (anchor null on API) — 24 buckets local hour 0–23 for `activityDateYmd`. */
  hourlyCivilBuckets?: readonly number[] | null;
  /** Shift‑anchored `stepsByHour` when `stepsByHourAnchorStart` is set (bucket i = hour i after anchor). */
  hourlyShiftAnchoredBuckets?: readonly number[] | null;
  /** ISO start of bucket 0 for `hourlyShiftAnchoredBuckets` (e.g. window start including pre‑shift buffer). */
  stepsByHourAnchorStart?: string | null;
  /** Civil `YYYY-MM-DD` for the activity card (matches `/api/activity/today` `date`). */
  activityDateYmd?: string | null;
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

    const shiftType = inferShiftType(shift);
    const tzTrim =
      typeof activityTimeZone === "string" && activityTimeZone.trim() ? activityTimeZone.trim() : null;
    const now = nowForDistribution ?? new Date();

    if (samples.length === 0) {
      const civilYmd =
        (typeof activityDateYmd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(activityDateYmd.trim())
          ? activityDateYmd.trim()
          : null) ??
        (tzTrim != null ? formatYmdInTimeZone(new Date(shift.start), tzTrim) : null);

      let filledFromHourly = false;

      if (
        tzTrim != null &&
        civilYmd != null &&
        hourlyCivilBuckets &&
        hourlyCivilBuckets.length === 24 &&
        sameCalendarDayInZone(shift.start, shift.end, tzTrim)
      ) {
        const dayStartMs = startOfLocalDayUtcMs(civilYmd, tzTrim);
        const split = shiftSegmentsFrom24HourlyBuckets(
          hourlyCivilBuckets,
          shiftStart,
          shiftEnd,
          (h) => ({ startMs: dayStartMs + h * HOUR_MS, endMs: dayStartMs + (h + 1) * HOUR_MS }),
        );
        if (split && split.hourlySum > 0) {
          before = split.before;
          during = split.during;
          after = split.after;
          filledFromHourly = true;
        }
      }

      if (
        !filledFromHourly &&
        typeof stepsByHourAnchorStart === "string" &&
        stepsByHourAnchorStart.trim() &&
        hourlyShiftAnchoredBuckets &&
        hourlyShiftAnchoredBuckets.length === 24
      ) {
        const anchorMs = toTime(stepsByHourAnchorStart.trim());
        if (isValidTime(anchorMs)) {
          const split = shiftSegmentsFrom24HourlyBuckets(
            hourlyShiftAnchoredBuckets,
            shiftStart,
            shiftEnd,
            (h) => ({ startMs: anchorMs + h * HOUR_MS, endMs: anchorMs + (h + 1) * HOUR_MS }),
          );
          if (split && split.hourlySum > 0) {
            before = split.before;
            during = split.during;
            after = split.after;
            filledFromHourly = true;
          }
        }
      }

      if (
        !filledFromHourly &&
        tzTrim != null &&
        civilYmd != null &&
        typeof coherentStepsFallback === "number" &&
        coherentStepsFallback > 0
      ) {
        const est = estimateStepsByHourCivil(Math.round(coherentStepsFallback), tzTrim, now);
        const dayStartMsFallback = startOfLocalDayUtcMs(civilYmd, tzTrim);
        const split = shiftSegmentsFrom24HourlyBuckets(est, shiftStart, shiftEnd, (h) => ({
          startMs: dayStartMsFallback + h * HOUR_MS,
          endMs: dayStartMsFallback + (h + 1) * HOUR_MS,
        }));
        if (split && split.hourlySum > 0) {
          before = split.before;
          during = split.during;
          after = split.after;
        }
      }
    }

    const totalSteps = before + during + after;
    const verdict = getShiftVerdict(during, shiftType);

    return {
      mode: "shift",
      title: "Your shift movement",
      mainSteps: during,
      verdict,
      label: totalSteps === 0 ? "No movement data" : `${verdict} for a ${shiftType} shift`,
      insight: totalSteps === 0 ? "No movement data yet." : getShiftInsight(verdict, shiftType),
      totalSteps,
      shiftType,
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
    shiftType: "unknown",
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

function shiftHeaderIcon(shiftType: ShiftType) {
  if (shiftType === "day") return Sun;
  if (shiftType === "evening") return Sun;
  if (shiftType === "night") return Moon;
  return Moon;
}

function segmentIcon(label: string, card: AdaptiveMovementData) {
  if (label.includes("During") || label === "Midday") {
    if (card.mode === "shift" && (card.shiftType === "day" || card.shiftType === "evening")) return Sun;
    return Moon;
  }
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
  const HeaderIcon =
    data.mode === "shift" ? shiftHeaderIcon(data.shiftType) : data.mode === "recovery" ? Lightbulb : Sun;

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
                const Icon = segmentIcon(item.label, data);
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
