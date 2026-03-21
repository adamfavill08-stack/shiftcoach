/**
 * USDA FDC (FoodData Central) API Importer
 * 
 * Uses the USDA FDC API to bulk import foods.
 * 
 * API Documentation: https://fdc.nal.usda.gov/api-guide.html
 * 
 * Usage: npx tsx scripts/ingest/usda-importer.ts [search-term]
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const USDA_API_KEY = process.env.USDA_API_KEY || '' // Optional but recommended

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

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

// USDA nutrient IDs
const NUTRIENT_IDS = {
  ENERGY_KCAL: 1008, // Energy (kcal)
  PROTEIN: 1003,     // Protein
  CARBOHYDRATE: 1005, // Carbohydrate, by difference
  FAT: 1004,         // Total lipid (fat)
}

async function searchAndImportUSDA(query: string, maxResults: number = 100) {
  console.log(`[USDA] Searching for: ${query}`)

  try {
    // Search foods
    const searchUrl = new URL('https://api.nal.usda.gov/fdc/v1/foods/search')
    searchUrl.searchParams.set('query', query)
    searchUrl.searchParams.set('pageSize', maxResults.toString())
    if (USDA_API_KEY) {
      searchUrl.searchParams.set('api_key', USDA_API_KEY)
    }

    const response = await fetch(searchUrl.toString())
    if (!response.ok) {
      throw new Error(`USDA API error: ${response.statusText}`)
    }

    const data = await response.json()
    const foods: USDAFood[] = data.foods || []

    console.log(`[USDA] Found ${foods.length} foods`)

    const batch: any[] = []
    let inserted = 0

    for (const food of foods) {
      const nutrients = food.foodNutrients || []
      
      const energyNutrient = nutrients.find(n => n.nutrientId === NUTRIENT_IDS.ENERGY_KCAL)
      const proteinNutrient = nutrients.find(n => n.nutrientId === NUTRIENT_IDS.PROTEIN)
      const carbNutrient = nutrients.find(n => n.nutrientId === NUTRIENT_IDS.CARBOHYDRATE)
      const fatNutrient = nutrients.find(n => n.nutrientId === NUTRIENT_IDS.FAT)

      const caloriesPer100g = energyNutrient?.value || 0
      if (caloriesPer100g === 0) continue

      const proteinPer100g = proteinNutrient?.value || 0
      const carbsPer100g = carbNutrient?.value || 0
      const fatPer100g = fatNutrient?.value || 0

      const servingSize = food.servingSize || 100
      const servingUnit = food.servingSizeUnit || 'g'

      batch.push({
        name: food.description.substring(0, 255),
        brand: food.brandOwner ? food.brandOwner.substring(0, 255) : null,
        barcode: null,
        serving_size: servingSize,
        serving_unit: servingUnit,
        calories_per_serving: Math.round((caloriesPer100g / 100) * servingSize),
        protein_per_serving: Math.round((proteinPer100g / 100) * servingSize * 10) / 10,
        carbs_per_serving: Math.round((carbsPer100g / 100) * servingSize * 10) / 10,
        fat_per_serving: Math.round((fatPer100g / 100) * servingSize * 10) / 10,
        source: 'usda',
        external_id: `usda_${food.fdcId}`, // Store for reference
      })

      if (batch.length >= 50) {
        const { error } = await supabase
          .from('nutrition_foods')
          .upsert(batch, {
            onConflict: 'name,brand',
            ignoreDuplicates: false,
          })

        if (!error) {
          inserted += batch.length
        }

        batch.length = 0
      }
    }

    // Insert remaining
    if (batch.length > 0) {
      const { error } = await supabase
        .from('nutrition_foods')
        .upsert(batch, {
          onConflict: 'name,brand',
          ignoreDuplicates: false,
        })

      if (!error) {
        inserted += batch.length
      }
    }

    console.log(`[USDA] Import complete! Inserted/updated ${inserted} foods`)
  } catch (err: any) {
    console.error('[USDA] Import error:', err)
    throw err
  }
}

async function importPopularFoods() {
  // Import common food categories
  const queries = [
    'chicken breast',
    'rice',
    'pasta',
    'bread',
    'milk',
    'eggs',
    'banana',
    'apple',
    'pizza',
    'burger',
    'fries',
    'salad',
  ]

  for (const query of queries) {
    await searchAndImportUSDA(query, 20)
    // Rate limiting: wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

// Run if called directly
if (require.main === module) {
  const query = process.argv[2]

  if (query) {
    searchAndImportUSDA(query)
      .then(() => {
        console.log('[USDA] Import completed successfully')
        process.exit(0)
      })
      .catch((err) => {
        console.error('[USDA] Import failed:', err)
        process.exit(1)
      })
  } else {
    // Import popular foods
    importPopularFoods()
      .then(() => {
        console.log('[USDA] Bulk import completed successfully')
        process.exit(0)
      })
      .catch((err) => {
        console.error('[USDA] Bulk import failed:', err)
        process.exit(1)
      })
  }
}

export { searchAndImportUSDA, importPopularFoods }

