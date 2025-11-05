export type Units = 'metric' | 'imperial'

// --- Length: cm ↔︎ ft/in
export function cmToFeetInches(cm: number) {
  const inchesTotal = cm / 2.54
  const ft = Math.floor(inchesTotal / 12)
  const inches = Math.round(inchesTotal - ft * 12)
  return { ft, inches }
}

export function feetInchesToCm(ft: number, inches: number) {
  return Math.round(((ft * 12) + inches) * 2.54)
}

// --- Weight: kg ↔︎ lb
export function kgToLb(kg: number) {
  return Math.round(kg * 2.2046226218 * 10) / 10
}

export function lbToKg(lb: number) {
  return Math.round((lb / 2.2046226218) * 10) / 10
}

// --- Volume (water): ml ↔︎ fl oz (US)
const ML_PER_FLOZ = 29.5735295625
export function mlToFloz(ml: number) {
  return Math.round((ml / ML_PER_FLOZ) * 10) / 10
}

export function flozToMl(oz: number) {
  return Math.round(oz * ML_PER_FLOZ)
}

