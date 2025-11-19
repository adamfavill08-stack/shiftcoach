/**
 * Nutrition calculation utilities
 * Handles portion calculations, recipe totals, and meal aggregations
 */

import type { Food, UserCustomFood, MealItem, RecipeIngredient } from './types'

/**
 * Calculate nutrition for a portion of food
 */
export function calculatePortionNutrition(
  food: Food | UserCustomFood,
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
  // Convert portion to grams
  let portionInGrams = portionQty

  if (portionUnit === 'ml') {
    // Assume 1ml ≈ 1g for most foods
    portionInGrams = portionQty
  } else if (portionUnit === 'serving') {
    // Use food's default portion as serving size
    portionInGrams = (food.default_portion_qty || 100) * portionQty
  } else if (portionUnit === 'piece' || portionUnit === 'item') {
    // Assume 1 piece = default portion
    portionInGrams = (food.default_portion_qty || 100) * portionQty
  }

  // Calculate ratio (portion in grams / 100g)
  const ratio = portionInGrams / 100

  return {
    kcal: food.kcal_per_100g ? Math.round(food.kcal_per_100g * ratio) : 0,
    protein: food.protein_per_100g ? Math.round(food.protein_per_100g * ratio * 10) / 10 : 0,
    carbs: food.carbs_per_100g ? Math.round(food.carbs_per_100g * ratio * 10) / 10 : 0,
    fat: food.fat_per_100g ? Math.round(food.fat_per_100g * ratio * 10) / 10 : 0,
    fiber: food.fiber_per_100g ? Math.round(food.fiber_per_100g * ratio * 10) / 10 : 0,
    sugar: food.sugar_per_100g ? Math.round(food.sugar_per_100g * ratio * 10) / 10 : 0,
    salt: food.salt_per_100g ? Math.round(food.salt_per_100g * ratio * 10) / 10 : 0,
  }
}

/**
 * Calculate total nutrition for a meal (multiple foods)
 */
export function calculateMealTotal(items: MealItem[]): {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  salt: number
} {
  return items.reduce(
    (acc, item) => {
      acc.kcal += item.kcal
      acc.protein += item.protein
      acc.carbs += item.carbs
      acc.fat += item.fat
      acc.fiber += item.fiber
      acc.sugar += item.sugar
      acc.salt += item.salt
      return acc
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, salt: 0 }
  )
}

/**
 * Calculate recipe nutrition per serving
 */
export function calculateRecipeNutrition(
  ingredients: Array<RecipeIngredient & { food: Food | UserCustomFood }>,
  servings: number
): {
  kcal_per_serving: number
  protein_per_serving: number
  carbs_per_serving: number
  fat_per_serving: number
  fiber_per_serving: number
  sugar_per_serving: number
  salt_per_serving: number
} {
  const total = ingredients.reduce(
    (acc, ing) => {
      const nutrition = calculatePortionNutrition(ing.food, ing.qty, ing.unit)
      acc.kcal += nutrition.kcal
      acc.protein += nutrition.protein
      acc.carbs += nutrition.carbs
      acc.fat += nutrition.fat
      acc.fiber += nutrition.fiber
      acc.sugar += nutrition.sugar
      acc.salt += nutrition.salt
      return acc
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, salt: 0 }
  )

  return {
    kcal_per_serving: Math.round(total.kcal / servings),
    protein_per_serving: Math.round((total.protein / servings) * 10) / 10,
    carbs_per_serving: Math.round((total.carbs / servings) * 10) / 10,
    fat_per_serving: Math.round((total.fat / servings) * 10) / 10,
    fiber_per_serving: Math.round((total.fiber / servings) * 10) / 10,
    sugar_per_serving: Math.round((total.sugar / servings) * 10) / 10,
    salt_per_serving: Math.round((total.salt / servings) * 10) / 10,
  }
}

