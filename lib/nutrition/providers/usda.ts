/**
 * USDA FoodData Central API provider
 * Wraps USDA FDC API calls and normalizes data to our Food schema
 */

import type { Food, FoodSource } from '../types'

const USDA_API_KEY = process.env.USDA_API_KEY || ''
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1'

// USDA nutrient IDs
const NUTRIENT_IDS = {
  ENERGY_KCAL: 1008, // Energy (kcal)
  PROTEIN: 1003,     // Protein
  CARBOHYDRATE: 1005, // Carbohydrate, by difference
  FAT: 1004,         // Total lipid (fat)
  FIBER: 1079,       // Fiber, total dietary
  SUGAR: 2000,       // Sugars, total including NLEA
  SODIUM: 1093,      // Sodium, Na
}

interface USDAFood {
  fdcId: number
  description: string
  brandOwner?: string
  foodNutrients?: Array<{
    nutrientId: number
    nutrientName: string
    value: number
    unitName: string
  }>
  servingSize?: number
  servingSizeUnit?: string
}

interface USDASearchResponse {
  foods?: USDAFood[]
  totalHits?: number
}

/**
 * Search foods by query
 */
export async function searchFoods(query: string, limit: number = 20): Promise<Food[]> {
  if (!USDA_API_KEY) {
    console.warn('[USDA] API key not configured, skipping search')
    return []
  }

  try {
    const url = new URL(`${USDA_BASE_URL}/foods/search`)
    url.searchParams.set('query', query)
    url.searchParams.set('pageSize', limit.toString())
    url.searchParams.set('api_key', USDA_API_KEY)

    const response = await fetch(url.toString())

    if (!response.ok) {
      console.error('[USDA] Search failed:', response.status, response.statusText)
      return []
    }

    const data: USDASearchResponse = await response.json()
    const foods = data.foods || []

    return foods
      .map(normalizeUSDAFood)
      .filter((food): food is Food => food !== null)
  } catch (error) {
    console.error('[USDA] Search error:', error)
    return []
  }
}

/**
 * Normalize USDA food to our Food schema
 */
function normalizeUSDAFood(food: USDAFood): Food | null {
  if (!food.description) {
    return null
  }

  const nutrients = food.foodNutrients || []

  // Extract nutrients
  const energyNutrient = nutrients.find(n => n.nutrientId === NUTRIENT_IDS.ENERGY_KCAL)
  const proteinNutrient = nutrients.find(n => n.nutrientId === NUTRIENT_IDS.PROTEIN)
  const carbNutrient = nutrients.find(n => n.nutrientId === NUTRIENT_IDS.CARBOHYDRATE)
  const fatNutrient = nutrients.find(n => n.nutrientId === NUTRIENT_IDS.FAT)
  const fiberNutrient = nutrients.find(n => n.nutrientId === NUTRIENT_IDS.FIBER)
  const sugarNutrient = nutrients.find(n => n.nutrientId === NUTRIENT_IDS.SUGAR)
  const sodiumNutrient = nutrients.find(n => n.nutrientId === NUTRIENT_IDS.SODIUM)

  // Get values (per 100g)
  const kcalPer100g = energyNutrient?.value || null
  const proteinPer100g = proteinNutrient?.value || null
  const carbsPer100g = carbNutrient?.value || null
  const fatPer100g = fatNutrient?.value || null
  const fiberPer100g = fiberNutrient?.value || null
  const sugarPer100g = sugarNutrient?.value || null
  
  // Convert sodium (mg) to salt (g): salt = sodium * 2.5 / 1000
  const saltPer100g = sodiumNutrient?.value 
    ? (sodiumNutrient.value * 2.5) / 1000 
    : null

  // Determine portion size
  const portionQty = food.servingSize || 100
  const portionUnit = food.servingSizeUnit || 'g'

  return {
    id: '', // Will be set by database
    barcode: null, // USDA doesn't provide barcodes
    name: food.description,
    brand_id: null,
    brand_name: food.brandOwner || null,
    country: 'US',
    source_id: 'USDA',
    kcal_per_100g: kcalPer100g ? Math.round(kcalPer100g) : null,
    protein_per_100g: proteinPer100g ? Math.round(proteinPer100g * 10) / 10 : null,
    carbs_per_100g: carbsPer100g ? Math.round(carbsPer100g * 10) / 10 : null,
    fat_per_100g: fatPer100g ? Math.round(fatPer100g * 10) / 10 : null,
    fiber_per_100g: fiberPer100g ? Math.round(fiberPer100g * 10) / 10 : null,
    sugar_per_100g: sugarPer100g ? Math.round(sugarPer100g * 10) / 10 : null,
    salt_per_100g: saltPer100g ? Math.round(saltPer100g * 10) / 10 : null,
    default_portion_qty: portionQty,
    default_portion_unit: portionUnit,
    image_url: null,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }
}

