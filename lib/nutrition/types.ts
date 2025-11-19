// Comprehensive nutrition system types

export type FoodSource = 'USDA' | 'OpenFoodFacts' | 'UserCreated' | 'Restaurant' | 'CoFID' | 'AUSNUT'

export type Food = {
  id: string
  barcode: string | null
  name: string
  brand_id?: string | null
  brand_name: string | null
  country: string | null
  source_id: FoodSource
  
  // Nutrition per 100g (standardized)
  kcal_per_100g: number | null
  protein_per_100g: number | null
  carbs_per_100g: number | null
  fat_per_100g: number | null
  fiber_per_100g: number | null
  sugar_per_100g: number | null
  salt_per_100g: number | null
  
  // Default portion
  default_portion_qty: number
  default_portion_unit: string
  
  image_url: string | null
  last_updated: string
  created_at: string
}

export type FoodPortion = {
  id: string
  food_id: string
  name: string
  qty: number
  unit: string
}

export type UserCustomFood = {
  id: string
  user_id: string
  barcode: string | null
  name: string
  brand_name: string | null
  country: string | null
  kcal_per_100g: number | null
  protein_per_100g: number | null
  carbs_per_100g: number | null
  fat_per_100g: number | null
  fiber_per_100g: number | null
  sugar_per_100g: number | null
  salt_per_100g: number | null
  default_portion_qty: number
  default_portion_unit: string
  image_url: string | null
  created_at: string
  updated_at: string
}

export type MealItem = {
  food_type: 'master' | 'custom'
  food_id: string
  food_name: string
  brand_name?: string | null
  portion_qty: number
  portion_unit: string
  // Calculated values for this portion
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  salt: number
}

export type NutritionLog = {
  id: string
  user_id: string
  eaten_at: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  meal_id: string | null // Groups foods in the same meal
  meal_item_index: number
  food_type: 'master' | 'custom' | 'recipe'
  food_id: string | null
  custom_name: string | null
  kcal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  fiber: number | null
  sugar: number | null
  salt: number | null
  portion_qty: number | null
  portion_unit: string | null
  created_at: string
}

export type Recipe = {
  id: string
  user_id: string
  name: string
  description: string | null
  servings: number
  image_url: string | null
  created_at: string
  updated_at: string
  // Calculated totals (per serving)
  kcal_per_serving: number
  protein_per_serving: number
  carbs_per_serving: number
  fat_per_serving: number
  fiber_per_serving: number
  sugar_per_serving: number
  salt_per_serving: number
}

export type RecipeIngredient = {
  id: string
  recipe_id: string
  ingredient_type: 'master' | 'custom'
  ingredient_id: string
  qty: number
  unit: string
  // Denormalized food data
  food_name?: string
  brand_name?: string | null
}

export type DaySummary = {
  date: string
  total: {
    kcal: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sugar: number
    salt: number
  }
  byMeal: Record<'breakfast' | 'lunch' | 'dinner' | 'snack', {
    kcal: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sugar: number
    salt: number
  }>
  meals: Array<{
    meal_id: string
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    eaten_at: string
    items: MealItem[]
    total: {
      kcal: number
      protein: number
      carbs: number
      fat: number
    }
  }>
}

export type FoodSearchResult = {
  id: string
  food_type: 'master' | 'custom'
  name: string
  brand_name: string | null
  barcode: string | null
  image_url: string | null
  kcal_per_100g: number | null
  protein_per_100g: number | null
  carbs_per_100g: number | null
  fat_per_100g: number | null
  default_portion_qty: number
  default_portion_unit: string
  source_id: FoodSource
  country: string | null
}
