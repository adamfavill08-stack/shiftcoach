import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

// Simple recipe parser for free-text queries
function parseRecipeQuery(query: string): { name: string; estimatedCalories: number; estimatedMacros: { protein: number; carbs: number; fat: number } } | null {
  const lowerQuery = query.toLowerCase().trim()
  
  // Common food patterns with rough estimates
  const patterns: Array<{
    pattern: RegExp
    name: string
    calories: number
    protein: number
    carbs: number
    fat: number
  }> = [
    { pattern: /bacon\s+sandwich|bacon\s+butty/i, name: 'Bacon Sandwich', calories: 350, protein: 15, carbs: 35, fat: 15 },
    { pattern: /cheese\s+sandwich/i, name: 'Cheese Sandwich', calories: 320, protein: 15, carbs: 30, fat: 14 },
    { pattern: /chicken\s+sandwich/i, name: 'Chicken Sandwich', calories: 380, protein: 25, carbs: 32, fat: 16 },
    { pattern: /pizza/i, name: 'Pizza Slice', calories: 280, protein: 12, carbs: 36, fat: 10 },
    { pattern: /curry/i, name: 'Curry', calories: 450, protein: 20, carbs: 50, fat: 18 },
    { pattern: /kebab/i, name: 'Kebab', calories: 520, protein: 25, carbs: 45, fat: 22 },
    { pattern: /latte/i, name: 'Latte', calories: 120, protein: 6, carbs: 10, fat: 5 },
    { pattern: /cappuccino/i, name: 'Cappuccino', calories: 80, protein: 4, carbs: 6, fat: 4 },
    { pattern: /mcflurry/i, name: 'McFlurry', calories: 330, protein: 8, carbs: 45, fat: 14 },
    { pattern: /big\s+mac/i, name: 'Big Mac', calories: 550, protein: 25, carbs: 45, fat: 33 },
    { pattern: /chicken\s+nuggets/i, name: 'Chicken Nuggets (6pc)', calories: 280, protein: 14, carbs: 18, fat: 16 },
    { pattern: /fish\s+and\s+chips/i, name: 'Fish and Chips', calories: 850, protein: 30, carbs: 95, fat: 35 },
  ]

  for (const { pattern, name, calories, protein, carbs, fat } of patterns) {
    if (pattern.test(lowerQuery)) {
      return { name, estimatedCalories: calories, estimatedMacros: { protein, carbs, fat } }
    }
  }

  return null
}

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await getServerSupabaseAndUserId()
    
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const limit = Number(searchParams.get('limit')) || 20

    if (!q.trim()) {
      return NextResponse.json({ foods: [] })
    }

    const query = q.trim()

    // Step 1: Search database first
    const { data: dbFoods, error: dbError } = await supabase
      .from('nutrition_foods')
      .select('*')
      .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
      .order('name', { ascending: true })
      .limit(limit)

    if (!dbError && dbFoods && dbFoods.length > 0) {
      // Found in DB, return results
      return NextResponse.json({
        foods: dbFoods.map((food: any) => ({
          id: food.id,
          name: food.name,
          brand: food.brand || null,
          barcode: food.barcode || null,
          servingSize: food.serving_size || 0,
          servingUnit: food.serving_unit || 'g',
          caloriesPerServing: food.calories_per_serving || 0,
          proteinPerServing: food.protein_per_serving || 0,
          carbsPerServing: food.carbs_per_serving || 0,
          fatPerServing: food.fat_per_serving || 0,
        })),
        source: 'database',
      })
    }

    // Step 2: Try recipe parser for free-text queries
    const recipeMatch = parseRecipeQuery(query)
    if (recipeMatch) {
      // Store parsed recipe in DB for future use
      const { data: insertedFood, error: insertError } = await supabase
        .from('nutrition_foods')
        .insert({
          name: recipeMatch.name,
          brand: null,
          barcode: null,
          serving_size: 100,
          serving_unit: 'g',
          calories_per_serving: recipeMatch.estimatedCalories,
          protein_per_serving: recipeMatch.estimatedMacros.protein,
          carbs_per_serving: recipeMatch.estimatedMacros.carbs,
          fat_per_serving: recipeMatch.estimatedMacros.fat,
          source: 'recipe_parser',
        })
        .select()
        .single()

      if (!insertError && insertedFood) {
        return NextResponse.json({
          foods: [{
            id: insertedFood.id,
            name: insertedFood.name,
            brand: null,
            barcode: null,
            servingSize: insertedFood.serving_size || 100,
            servingUnit: insertedFood.serving_unit || 'g',
            caloriesPerServing: insertedFood.calories_per_serving || 0,
            proteinPerServing: insertedFood.protein_per_serving || 0,
            carbsPerServing: insertedFood.carbs_per_serving || 0,
            fatPerServing: insertedFood.fat_per_serving || 0,
          }],
          source: 'recipe_parser',
        })
      }
    }

    // Step 3: Try USDA API search as fallback
    try {
      const usdaApiKey = process.env.USDA_API_KEY || ''
      const usdaUrl = new URL('https://api.nal.usda.gov/fdc/v1/foods/search')
      usdaUrl.searchParams.set('query', query)
      usdaUrl.searchParams.set('pageSize', '5')
      if (usdaApiKey) {
        usdaUrl.searchParams.set('api_key', usdaApiKey)
      }

      const usdaRes = await fetch(usdaUrl.toString())
      if (usdaRes.ok) {
        const usdaData = await usdaRes.json()
        const usdaFoods = usdaData.foods || []

        if (usdaFoods.length > 0) {
          // Process and store first result
          const food = usdaFoods[0]
          const nutrients = food.foodNutrients || []
          
          const energyNutrient = nutrients.find((n: any) => n.nutrientId === 1008) // Energy (kcal)
          const proteinNutrient = nutrients.find((n: any) => n.nutrientId === 1003) // Protein
          const carbNutrient = nutrients.find((n: any) => n.nutrientId === 1005) // Carbohydrate
          const fatNutrient = nutrients.find((n: any) => n.nutrientId === 1004) // Fat

          if (energyNutrient?.value) {
            const caloriesPer100g = energyNutrient.value
            const servingSize = food.servingSize || 100
            const servingUnit = food.servingSizeUnit || 'g'

            const caloriesPerServing = Math.round((caloriesPer100g / 100) * servingSize)
            const proteinPerServing = Math.round(((proteinNutrient?.value || 0) / 100) * servingSize * 10) / 10
            const carbsPerServing = Math.round(((carbNutrient?.value || 0) / 100) * servingSize * 10) / 10
            const fatPerServing = Math.round(((fatNutrient?.value || 0) / 100) * servingSize * 10) / 10

            // Store in DB
            const { data: insertedFood } = await supabase
              .from('nutrition_foods')
              .insert({
                name: food.description?.substring(0, 255) || query,
                brand: food.brandOwner?.substring(0, 255) || null,
                barcode: null,
                serving_size: servingSize,
                serving_unit: servingUnit,
                calories_per_serving: caloriesPerServing,
                protein_per_serving: proteinPerServing,
                carbs_per_serving: carbsPerServing,
                fat_per_serving: fatPerServing,
                source: 'usda',
              })
              .select()
              .single()

            if (insertedFood) {
              return NextResponse.json({
                foods: [{
                  id: insertedFood.id,
                  name: insertedFood.name,
                  brand: insertedFood.brand || null,
                  barcode: null,
                  servingSize: insertedFood.serving_size || 100,
                  servingUnit: insertedFood.serving_unit || 'g',
                  caloriesPerServing: insertedFood.calories_per_serving || 0,
                  proteinPerServing: insertedFood.protein_per_serving || 0,
                  carbsPerServing: insertedFood.carbs_per_serving || 0,
                  fatPerServing: insertedFood.fat_per_serving || 0,
                }],
                source: 'usda',
              })
            }
          }
        }
      }
    } catch (usdaErr) {
      // Silently fail USDA search
      console.error('[api/foods/search] USDA search error:', usdaErr)
    }

    // No results found
    return NextResponse.json({
      foods: [],
      source: 'none',
      message: 'No results found. Try a more specific search or use barcode scanning.',
    })
  } catch (err: any) {
    console.error('[api/foods/search] FATAL ERROR:', err)
    return NextResponse.json(
      { foods: [], error: 'Internal server error' },
      { status: 500 }
    )
  }
}
