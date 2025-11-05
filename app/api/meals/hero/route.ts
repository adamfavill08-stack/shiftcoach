import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import OpenAI from 'openai'
import { calculateAdjustedCalories } from '@/lib/nutrition/calculateAdjustedCalories'

function pickHeroMeal(meals: any[], shiftType: 'day'|'night'|'off'|'other') {
  if (!meals || meals.length === 0) return null
  const sortedByCalories = [...meals].sort((a,b)=> (b.calories||0) - (a.calories||0))
  if (shiftType === 'night') {
    const pre = meals.find(m => /pre[- ]?shift/i.test(m.label))
    return pre || sortedByCalories[0]
  }
  // day/off: prefer breakfast or lunch with highest calories
  const candidates = meals.filter(m => /breakfast|lunch/i.test(m.label))
  if (candidates.length) return candidates.sort((a,b)=> (b.calories||0)-(a.calories||0))[0]
  return sortedByCalories[0]
}

function estimateMacrosForHero(total: number, daily: { protein_g:number; carbs_g:number; fat_g:number }) {
  // Heuristic split ~35-40% protein/carbs, ~30% fat
  const protein_g = Math.round(daily.protein_g * 0.38)
  const carbs_g = Math.round(daily.carbs_g * 0.36)
  const fat_g = Math.round(daily.fat_g * 0.30)
  return { protein_g, carbs_g, fat_g }
}

function computeHealthScore(params: { rhythmScore: number|null; sleepHours: number|null; heroCals: number; dailyCals: number; proteinShare: number; }) {
  const { rhythmScore, sleepHours, heroCals, dailyCals, proteinShare } = params
  let score = 5
  if (typeof rhythmScore === 'number') score += rhythmScore >= 70 ? 2 : rhythmScore >= 50 ? 1 : 0
  if (typeof sleepHours === 'number') score += sleepHours >= 7 ? 2 : sleepHours >= 6 ? 1 : 0
  if (dailyCals > 0) {
    const share = heroCals / dailyCals
    // ideal hero ~30-40% of day
    if (share >= 0.25 && share <= 0.45) score += 1
  }
  if (proteinShare >= 0.3) score += 1
  return Math.max(0, Math.min(10, Math.round(score)))
}

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => req.cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0,10)

  try {
    // Fetch daily nutrition to get meals and factors
    const calc = await calculateAdjustedCalories(supabase as any, user.id)
    const hero = pickHeroMeal(calc.meals, calc.shiftType)
    if (!hero) return NextResponse.json({ error: 'No meals planned' }, { status: 200 })

    // Estimate macros for hero
    const heroMacros = estimateMacrosForHero(hero.calories, {
      protein_g: calc.macros.protein_g,
      carbs_g: calc.macros.carbs_g,
      fat_g: calc.macros.fat_g,
    })

    const proteinKcal = heroMacros.protein_g * 4
    const carbsKcal = heroMacros.carbs_g * 4
    const fatKcal = heroMacros.fat_g * 9
    const heroTotalKcal = proteinKcal + carbsKcal + fatKcal || hero.calories

    const proteinShare = heroTotalKcal > 0 ? proteinKcal / heroTotalKcal : 0

    const healthScore = computeHealthScore({
      rhythmScore: calc.rhythmScore,
      sleepHours: calc.sleepHoursLast24h,
      heroCals: hero.calories,
      dailyCals: calc.adjustedCalories,
      proteinShare,
    })

    // Check cache
    const { data: cached } = await supabase
      .from('meal_hero_images')
      .select('image_url, prompt')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()

    let imageUrl = cached?.image_url || ''
    let promptUsed = cached?.prompt || ''

    if (!imageUrl) {
      const prompt = `High quality food photography of a healthy ${hero.label.toLowerCase()} for a shift worker, balanced protein, complex carbs and colorful vegetables, clean white plate, soft daylight, overhead shot, minimal background.`
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      // Stable seed from user+date+meal
      const seed = Array.from(`${user.id}-${today}-${hero.id}`).reduce((a,c)=> (a*31 + c.charCodeAt(0)) % 1_000_000, 0)
      try {
        const img = await openai.images.generate({
          model: 'gpt-image-1',
          prompt,
          size: '1024x1024',
          user: user.id,
          // @ts-ignore seed supported by provider
          seed,
        })
        imageUrl = img.data?.[0]?.url || ''
        promptUsed = prompt
      } catch (e) {
        console.warn('[/api/meals/hero] OpenAI image error:', e)
        imageUrl = '/meals/placeholder-hero.jpg'
        promptUsed = prompt
      }

      if (imageUrl) {
        await supabase
          .from('meal_hero_images')
          .upsert({ user_id: user.id, date: today, meal_id: hero.id, image_url: imageUrl, prompt: promptUsed }, { onConflict: 'user_id,date' })
      }
    }

    console.log('[/api/meals/hero] imageUrl:', imageUrl)
    return NextResponse.json({
      heroMeal: {
        id: hero.id,
        label: hero.label,
        suggestedTime: hero.suggestedTime,
        calories: Math.round(hero.calories),
        protein_g: heroMacros.protein_g,
        carbs_g: heroMacros.carbs_g,
        fat_g: heroMacros.fat_g,
        healthScore,
      },
      imageUrl,
    }, { status: 200 })
  } catch (err: any) {
    console.error('[/api/meals/hero] error:', err)
    return NextResponse.json({ error: 'Failed to build hero meal' }, { status: 500 })
  }
}


