"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Alpha ramps up with fill so low progress = airy/transparent, full = rich/dark */
function fillAlpha(progress: number) {
  const p = clamp01(progress);
  const minA = 0.22;
  const maxA = 0.98;
  // Brighter mid-fill: ramp opacity a bit faster than linear
  const t = Math.pow(p, 0.78);
  return minA + (maxA - minA) * t;
}

function rgba(rgb: { r: number; g: number; b: number }, a: number) {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a.toFixed(3)})`;
}

type Rgb = { r: number; g: number; b: number };

type CircularRingProps = {
  radius: number;
  progress: number;
  trackWidth: number;
  activeWidth: number;
  trackColor: string;
  rgb: Rgb;
  softGlowId: string;
};

function CircularRing({
  radius,
  progress,
  trackWidth,
  activeWidth,
  trackColor,
  rgb,
  softGlowId,
}: CircularRingProps) {
  const p = clamp01(progress);
  const dashOffset = 100 * (1 - p);
  const showActive = p >= 0.015;
  const a = fillAlpha(p);
  const stroke = rgba(rgb, a);

  return (
    <g transform="rotate(-90 50 50)">
      <circle
        cx={50}
        cy={50}
        r={radius}
        fill="none"
        pathLength={100}
        stroke={trackColor}
        strokeWidth={trackWidth}
        strokeLinecap="round"
      />
      {showActive ? (
        <circle
          cx={50}
          cy={50}
          r={radius}
          fill="none"
          pathLength={100}
          stroke={stroke}
          strokeWidth={activeWidth}
          strokeLinecap="round"
          strokeDasharray={100}
          strokeDashoffset={dashOffset}
          filter={p > 0.22 ? `url(#${softGlowId})` : undefined}
        />
      ) : null}
    </g>
  );
}

type StartDotProps = {
  cx: number;
  cy: number;
  r: number;
  rgb: Rgb;
  progress: number;
};

function StartDot({ cx, cy, r, rgb, progress }: StartDotProps) {
  const p = clamp01(progress);
  const a = Math.min(0.96, 0.32 + 0.68 * fillAlpha(p));
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={rgba(rgb, a)}
      stroke="rgba(255,255,255,0.92)"
      strokeWidth={0.75}
    />
  );
}

export type HeartRecoveryRingsProps = {
  /** Steps vs daily target (0–1) */
  outerProgress: number;
  /** HR sample coverage in window (0–1) */
  middleProgress: number;
  /** Recovery: higher = calmer (1 = low Δ vs resting, 0 = very strained) */
  innerProgress: number;
  className?: string;
  "aria-label"?: string;
};

/** Vivid bases so translucent strokes still read “neon” on white */
const RGB_OUTER: Rgb = { r: 16, g: 245, b: 156 }; // bright mint / spring green
const RGB_MID: Rgb = { r: 56, g: 189, b: 248 }; // electric sky
const RGB_INNER: Rgb = { r: 255, g: 92, b: 205 }; // hot magenta-pink

/**
 * Three concentric rings: translucent strokes that deepen as each ring fills.
 */
export function HeartRecoveryRings({
  outerProgress,
  middleProgress,
  innerProgress,
  className,
  "aria-label": ariaLabel = "Three rings for steps, heart-rate coverage, and recovery",
}: HeartRecoveryRingsProps) {
  const uid = useId().replace(/:/g, "");
  const softGlow = `ring-soft-${uid}`;

  const trackColor = "rgba(148, 163, 184, 0.32)";

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("w-[200px] h-[200px] max-w-full", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <filter
          id={softGlow}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="0.55" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <CircularRing
        radius={40}
        progress={outerProgress}
        trackWidth={4}
        activeWidth={4.6}
        trackColor={trackColor}
        rgb={RGB_OUTER}
        softGlowId={softGlow}
      />
      <CircularRing
        radius={30}
        progress={middleProgress}
        trackWidth={3.4}
        activeWidth={4}
        trackColor={trackColor}
        rgb={RGB_MID}
        softGlowId={softGlow}
      />
      <CircularRing
        radius={20.5}
        progress={innerProgress}
        trackWidth={2.9}
        activeWidth={3.5}
        trackColor={trackColor}
        rgb={RGB_INNER}
        softGlowId={softGlow}
      />

      <g aria-hidden className="pointer-events-none">
        <StartDot cx={50} cy={10} r={2.35} rgb={RGB_OUTER} progress={outerProgress} />
        <StartDot cx={50} cy={20} r={2.05} rgb={RGB_MID} progress={middleProgress} />
        <StartDot cx={50} cy={29.5} r={1.75} rgb={RGB_INNER} progress={innerProgress} />
      </g>
    </svg>
  );
}
