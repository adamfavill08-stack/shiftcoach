/**
 * Knob fill for the 3-column risk bar: emerald-300 | emerald-400 | amber-400→orange-500.
 * Matches visible bar segments at `scorePct` (0–100 along the track).
 */
export function riskScaleBarMarkerFill(scorePct: number): string {
  const p = Math.max(0, Math.min(100, scorePct)) / 100
  const e3 = { r: 110, g: 231, b: 183 }
  const e4 = { r: 52, g: 211, b: 153 }
  const a4 = { r: 251, g: 191, b: 36 }
  const o5 = { r: 249, g: 115, b: 22 }

  const lerp = (a: typeof e3, b: typeof e3, t: number) =>
    `rgb(${Math.round(a.r + (b.r - a.r) * t)} ${Math.round(a.g + (b.g - a.g) * t)} ${Math.round(a.b + (b.b - a.b) * t)})`

  if (p < 1 / 3) {
    return lerp(e3, e4, p / (1 / 3))
  }
  if (p < 2 / 3) {
    return lerp(e4, a4, (p - 1 / 3) / (1 / 3))
  }
  return lerp(a4, o5, (p - 2 / 3) / (1 / 3))
}

/**
 * Knob fill for the fatigue detail-page bar:
 * `bg-gradient-to-r from-emerald-300 via-lime-300 via-60% to-orange-400`
 */
export function fatigueWindowBarMarkerFill(scorePct: number): string {
  const p = Math.max(0, Math.min(100, scorePct)) / 100
  const emerald = { r: 110, g: 231, b: 183 }
  const lime = { r: 190, g: 242, b: 100 }
  const orange = { r: 251, g: 146, b: 60 }
  const lerp = (a: typeof emerald, b: typeof emerald, t: number) =>
    `rgb(${Math.round(a.r + (b.r - a.r) * t)} ${Math.round(a.g + (b.g - a.g) * t)} ${Math.round(a.b + (b.b - a.b) * t)})`
  if (p <= 0.6) {
    return lerp(emerald, lime, p / 0.6)
  }
  return lerp(lime, orange, (p - 0.6) / 0.4)
}
