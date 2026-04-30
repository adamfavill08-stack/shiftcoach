/**
 * Knob fill for the 3-column risk bar: green | orange | red.
 * Matches visible bar segments at `scorePct` (0–100 along the track).
 */
export function riskScaleBarMarkerFill(scorePct: number): string {
  const p = Math.max(0, Math.min(100, scorePct))
  if (p < 33) return "rgb(110 231 183)" // emerald-300
  if (p < 66) return "rgb(251 146 60)" // orange-400
  return "rgb(239 68 68)" // red-500
}

/**
 * Knob fill for the fatigue detail-page bar:
 * `bg-gradient-to-r from-emerald-300 via-orange-400 to-red-500`
 */
export function fatigueWindowBarMarkerFill(scorePct: number): string {
  const p = Math.max(0, Math.min(100, scorePct)) / 100
  const green = { r: 52, g: 199, b: 89 }
  const orange = { r: 255, g: 149, b: 0 }
  const red = { r: 255, g: 59, b: 48 }
  const lerp = (a: typeof green, b: typeof green, t: number) =>
    `rgb(${Math.round(a.r + (b.r - a.r) * t)} ${Math.round(a.g + (b.g - a.g) * t)} ${Math.round(a.b + (b.b - a.b) * t)})`
  if (p <= 0.5) {
    return lerp(green, orange, p / 0.5)
  }
  return lerp(orange, red, (p - 0.5) / 0.5)
}
