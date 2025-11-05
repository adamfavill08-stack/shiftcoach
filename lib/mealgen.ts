import { computeToday } from '@/lib/engine'
import type { Profile } from '@/lib/profile'

export type MealSlot = 'breakfast'|'lunch'|'dinner'|'pre'|'mid'|'post'
export type MealPlan = {
  slot: MealSlot
  title: string
  kcal: number
  protein_g: number
  carbs_g: number
  fats_g: number
  items: { name: string; qty: string }[]
  thumbnail?: string
}

/** Base templates (per 1x serving). We'll scale to hit target kcal/macros. */
const TPL = {
  highProteinYogurt: {
    title: 'Greek Yogurt Bowl',
    thumbnail: '/meals/yogurt.png',
    kcal: 220, P: 22, C: 20, F: 6,
    items: [{ name: 'Greek yogurt (0–2%)', qty: '200 g' }, { name: 'Honey', qty: '1 tsp' }, { name: 'Berries', qty: '80 g' }]
  },
  chickenWrap: {
    title: 'Chicken Wrap',
    thumbnail: '/meals/wrap.png',
    kcal: 430, P: 35, C: 40, F: 15,
    items: [{ name: 'Tortilla wrap', qty: '1' }, { name: 'Chicken breast', qty: '120 g' }, { name: 'Salad + salsa', qty: '—' }]
  },
  tunaPasta: {
    title: 'Tuna Pasta',
    thumbnail: '/meals/tuna-pasta.png',
    kcal: 520, P: 35, C: 65, F: 12,
    items: [{ name: 'Pasta (dry)', qty: '80 g' }, { name: 'Tuna (spring water)', qty: '1 can' }, { name: 'Olive oil', qty: '1 tsp' }]
  },
  oatsShake: {
    title: 'Oats & Whey Shake',
    thumbnail: '/meals/oats-shake.png',
    kcal: 380, P: 30, C: 45, F: 8,
    items: [{ name: 'Milk (or water)', qty: '300 ml' }, { name: 'Whey protein', qty: '1 scoop' }, { name: 'Oats', qty: '40 g' }, { name: 'Banana', qty: '1 small' }]
  },
  salmonRice: {
    title: 'Salmon & Rice Bowl',
    thumbnail: '/meals/salmon-rice.png',
    kcal: 600, P: 40, C: 60, F: 18,
    items: [{ name: 'Salmon fillet', qty: '150 g' }, { name: 'Rice (cooked)', qty: '200 g' }, { name: 'Veg', qty: '—' }]
  },
  cottageToast: {
    title: 'Cottage Cheese Toast',
    thumbnail: '/meals/cottage-toast.png',
    kcal: 280, P: 20, C: 30, F: 7,
    items: [{ name: 'Wholegrain toast', qty: '2 slices' }, { name: 'Cottage cheese', qty: '120 g' }, { name: 'Tomato', qty: '—' }]
  },
  hpSnack: {
    title: 'High-Protein Snack',
    thumbnail: '/meals/snack.png',
    kcal: 220, P: 25, C: 15, F: 6,
    items: [{ name: 'Greek yogurt / skyr', qty: '170 g' }, { name: 'Almonds', qty: '15 g' }]
  }
} as const

type TplKey = keyof typeof TPL

/** choose a template by slot "feel" */
function templatesFor(slot: MealSlot): TplKey[] {
  switch (slot) {
    case 'breakfast': return ['oatsShake','highProteinYogurt','cottageToast']
    case 'lunch': return ['chickenWrap','tunaPasta','salmonRice']
    case 'dinner': return ['salmonRice','tunaPasta','chickenWrap']
    case 'pre': return ['oatsShake','highProteinYogurt','chickenWrap']
    case 'mid': return ['highProteinYogurt','cottageToast','oatsShake']
    case 'post': return ['tunaPasta','salmonRice','chickenWrap']
  }
}

/** scale template to approximate target kcal/macros */
function scaleTemplate(tpl: typeof TPL[TplKey], targetKcal: number) {
  const factor = clamp(targetKcal / tpl.kcal, 0.6, 1.8)
  return {
    title: tpl.title,
    thumbnail: tpl.thumbnail,
    kcal: Math.round(tpl.kcal * factor),
    protein_g: Math.round(tpl.P * factor),
    carbs_g: Math.round(tpl.C * factor),
    fats_g: Math.round(tpl.F * factor),
    items: tpl.items.map(i => ({ ...i, qty: scaleQty(i.qty, factor) }))
  }
}

function clamp(n:number, lo:number, hi:number){ return Math.min(hi, Math.max(lo, n)) }
function scaleQty(qty: string, f: number) {
  const m = qty.match(/^([\d.]+)\s*(g|ml)$/i)
  if (!m) return qty
  const val = parseFloat(m[1]); const unit = m[2]
  return `${Math.round(val * f)} ${unit}`
}

/** Split macros/kcal across slots depending on shift */
export function splitForShift(isNight: boolean, totalKcal: number) {
  // percentages per slot
  const pct = isNight
    ? { pre: 0.35, mid: 0.20, post: 0.45 }
    : { breakfast: 0.25, lunch: 0.35, dinner: 0.40 }
  return Object.entries(pct).map(([slot, p]) => ({ slot: slot as MealSlot, kcal: Math.round(totalKcal * p) }))
}

/** Generate meal plans from engine + shift */
export async function generateTodayMeals(profile: Profile) : Promise<MealPlan[]> {
  const eng = await computeToday(profile)

  // detect if today's timeline is night-shift style (pre/mid/post present)
  const isNight = eng.timeline.some(t => t.label.toLowerCase().includes('pre-shift'))
  const splits = splitForShift(isNight, eng.adjusted_kcal)

  const picks: MealPlan[] = []
  for (const s of splits) {
    // pick first template for the slot and scale
    const tpls = templatesFor(s.slot)
    const tpl = TPL[tpls[0]]
    const scaled = scaleTemplate(tpl, s.kcal)
    picks.push({
      slot: s.slot,
      title: scaled.title,
      thumbnail: scaled.thumbnail,
      kcal: scaled.kcal,
      protein_g: scaled.protein_g,
      carbs_g: scaled.carbs_g,
      fats_g: scaled.fats_g,
      items: scaled.items
    })
  }
  return picks
}

/** Swap: pick the next template for a slot */
export function swapForSlot(slot: MealSlot, currentTitle: string, targetKcal: number): MealPlan {
  const keys = templatesFor(slot)
  const idx = keys.findIndex(k => TPL[k].title === currentTitle)
  const next = TPL[keys[(idx + 1) % keys.length]]
  const scaled = scaleTemplate(next, targetKcal)
  return {
    slot,
    title: scaled.title,
    thumbnail: scaled.thumbnail,
    kcal: scaled.kcal,
    protein_g: scaled.protein_g,
    carbs_g: scaled.carbs_g,
    fats_g: scaled.fats_g,
    items: scaled.items
  }
}

/** Build a lighter snack for mid slot (~65% kcal of target) */
export function replaceWithSnack(targetKcal: number): MealPlan {
  const base = TPL.hpSnack
  const snackKcal = Math.round(targetKcal * 0.65)
  const scaled = scaleTemplate(base, snackKcal)
  return { slot: 'mid', ...scaled }
}

