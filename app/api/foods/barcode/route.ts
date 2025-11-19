import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await getServerSupabaseAndUserId()
    
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')

    if (!code || !code.trim()) {
      return NextResponse.json(
        { error: 'Barcode code is required' },
        { status: 400 }
      )
    }

    const barcode = code.trim()

    // Step 1: Check database first
    const { data: dbFood, error: dbError } = await supabase
      .from('nutrition_foods')
      .select('*')
      .eq('barcode', barcode)
      .single()

    if (!dbError && dbFood) {
      // Found in DB, return it
      return NextResponse.json({
        food: {
          id: dbFood.id,
          name: dbFood.name,
          brand: dbFood.brand || null,
          barcode: dbFood.barcode || null,
          servingSize: dbFood.serving_size || 0,
          servingUnit: dbFood.serving_unit || 'g',
          caloriesPerServing: dbFood.calories_per_serving || 0,
          proteinPerServing: dbFood.protein_per_serving || 0,
          carbsPerServing: dbFood.carbs_per_serving || 0,
          fatPerServing: dbFood.fat_per_serving || 0,
        },
        source: 'database',
      })
    }

    // Step 2: Not in DB, fetch from OpenFoodFacts
    try {
      const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
        headers: {
          'User-Agent': 'Shift Coach/1.0 (https://shiftcali.com)',
        },
      })

      const offData = await offRes.json()

      if (offData.status !== 1 || !offData.product) {
        return NextResponse.json(
          { error: 'Product not found in OpenFoodFacts' },
          { status: 404 }
        )
      }

      const p = offData.product
      const nutriments = p.nutriments || {}

      // Extract nutrition data (per 100g)
      const caloriesPer100g = nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0
      const proteinPer100g = nutriments.proteins_100g || nutriments.proteins || 0
      const carbsPer100g = nutriments.carbohydrates_100g || nutriments.carbohydrates || 0
      const fatPer100g = nutriments.fat_100g || nutriments.fat || 0

      // Use serving size if available, otherwise default to 100g
      const servingSize = nutriments.serving_size || 100
      const servingUnit = 'g'

      // Calculate per-serving values
      const caloriesPerServing = Math.round((caloriesPer100g / 100) * servingSize)
      const proteinPerServing = Math.round((proteinPer100g / 100) * servingSize * 10) / 10
      const carbsPerServing = Math.round((carbsPer100g / 100) * servingSize * 10) / 10
      const fatPerServing = Math.round((fatPer100g / 100) * servingSize * 10) / 10

      // Store in database for future use
      const { data: insertedFood, error: insertError } = await supabase
        .from('nutrition_foods')
        .insert({
          name: p.product_name || 'Unknown Product',
          brand: p.brands || null,
          barcode: barcode,
          serving_size: servingSize,
          serving_unit: servingUnit,
          calories_per_serving: caloriesPerServing,
          protein_per_serving: proteinPer100g > 0 ? proteinPerServing : 0,
          carbs_per_serving: carbsPer100g > 0 ? carbsPerServing : 0,
          fat_per_serving: fatPer100g > 0 ? fatPerServing : 0,
          source: 'openfoodfacts',
        })
        .select()
        .single()

      if (insertError) {
        console.error('[api/foods/barcode] Insert error (non-fatal):', insertError)
        // Continue even if insert fails
      }

      return NextResponse.json({
        food: {
          id: insertedFood?.id || null,
          name: p.product_name || 'Unknown Product',
          brand: p.brands || null,
          barcode: barcode,
          servingSize: servingSize,
          servingUnit: servingUnit,
          caloriesPerServing: caloriesPerServing,
          proteinPerServing: proteinPerServing,
          carbsPerServing: carbsPerServing,
          fatPerServing: fatPerServing,
        },
        source: 'openfoodfacts',
      })
    } catch (offErr: any) {
      console.error('[api/foods/barcode] OpenFoodFacts error:', offErr)
      return NextResponse.json(
        { error: 'Failed to fetch from OpenFoodFacts' },
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error('[api/foods/barcode] FATAL ERROR:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
