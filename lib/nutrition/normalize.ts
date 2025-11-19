/**
 * Utilities for normalizing and upserting foods into the database
 */

import type { Food } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Upsert a food into foods_master
 * Deduplicates by barcode (if present) or name+brand
 */
export async function upsertFoodToMaster(
  supabase: SupabaseClient,
  food: Food
): Promise<Food | null> {
  try {
    // Prepare data for insert
    const foodData: any = {
      name: food.name.substring(0, 255),
      brand_name: food.brand_name ? food.brand_name.substring(0, 255) : null,
      barcode: food.barcode || null,
      country: food.country || null,
      source_id: food.source_id,
      kcal_per_100g: food.kcal_per_100g,
      protein_per_100g: food.protein_per_100g,
      carbs_per_100g: food.carbs_per_100g,
      fat_per_100g: food.fat_per_100g,
      fiber_per_100g: food.fiber_per_100g,
      sugar_per_100g: food.sugar_per_100g,
      salt_per_100g: food.salt_per_100g,
      default_portion_qty: food.default_portion_qty || 100,
      default_portion_unit: food.default_portion_unit || 'g',
      image_url: food.image_url || null,
      last_updated: new Date().toISOString(),
    }

    // Try to find existing food
    let existingFood: any = null

    if (food.barcode) {
      // Try to find by barcode first
      const { data } = await supabase
        .from('foods_master')
        .select('*')
        .eq('barcode', food.barcode)
        .single()

      existingFood = data
    }

    if (!existingFood && food.brand_name) {
      // Try to find by name + brand
      const { data } = await supabase
        .from('foods_master')
        .select('*')
        .eq('name', food.name)
        .eq('brand_name', food.brand_name)
        .single()

      existingFood = data
    }

    if (existingFood) {
      // Update existing food
      const { data, error } = await supabase
        .from('foods_master')
        .update(foodData)
        .eq('id', existingFood.id)
        .select()
        .single()

      if (error) {
        console.error('[normalize] Update error:', error)
        return null
      }

      return data as Food
    } else {
      // Insert new food
      const { data, error } = await supabase
        .from('foods_master')
        .insert(foodData)
        .select()
        .single()

      if (error) {
        console.error('[normalize] Insert error:', error)
        return null
      }

      return data as Food
    }
  } catch (error) {
    console.error('[normalize] Upsert error:', error)
    return null
  }
}

/**
 * Calculate macros for a portion of food
 * @deprecated Use calculatePortionNutrition from lib/nutrition/calculate.ts
 */
export function calculatePortionMacros(
  food: Food | any,
  portionQty: number,
  portionUnit: string
): {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  salt: number
} {
  // Handle both Food type and raw DB row (which might have different field names)
  const foodKcal = food.kcal_per_100g ?? food.kcal ?? food.calories_per_serving ?? 0
  const foodProtein = food.protein_per_100g ?? food.protein ?? food.protein_per_serving ?? 0
  const foodCarbs = food.carbs_per_100g ?? food.carbs ?? food.carbs_per_serving ?? 0
  const foodFat = food.fat_per_100g ?? food.fat ?? food.fat_per_serving ?? 0
  const foodFiber = food.fiber_per_100g ?? food.fiber ?? food.fiber_per_serving ?? 0
  const foodSugar = food.sugar_per_100g ?? food.sugar ?? food.sugar_per_serving ?? 0
  const foodSalt = food.salt_per_100g ?? food.salt ?? food.salt_per_serving ?? 0
  
  const basePortionQty = food.default_portion_qty ?? food.portion_qty ?? food.serving_size ?? 100
  const basePortionUnit = food.default_portion_unit ?? food.portion_unit ?? food.serving_unit ?? 'g'

  // Convert portion to grams for calculation
  let portionInGrams = portionQty

  if (portionUnit === 'ml') {
    // Assume 1ml ≈ 1g for most foods
    portionInGrams = portionQty
  } else if (portionUnit === 'serving') {
    // Use food's portion_qty as serving size
    portionInGrams = basePortionQty * portionQty
  }

  // Calculate ratio based on 100g (standardized)
  const ratio = portionInGrams / 100

  return {
    kcal: foodKcal ? Math.round(foodKcal * ratio) : 0,
    protein: foodProtein ? Math.round(foodProtein * ratio * 10) / 10 : 0,
    carbs: foodCarbs ? Math.round(foodCarbs * ratio * 10) / 10 : 0,
    fat: foodFat ? Math.round(foodFat * ratio * 10) / 10 : 0,
    fiber: foodFiber ? Math.round(foodFiber * ratio * 10) / 10 : 0,
    sugar: foodSugar ? Math.round(foodSugar * ratio * 10) / 10 : 0,
    salt: foodSalt ? Math.round(foodSalt * ratio * 10) / 10 : 0,
  }
}
