/**
 * OpenFoodFacts API provider
 * Wraps OpenFoodFacts API calls and normalizes data to our Food schema
 */

import type { Food, FoodSource } from '../types'

interface OFFProduct {
  code: string
  product_name: string
  brands?: string
  countries_tags?: string[]
  nutriments?: {
    'energy-kcal_100g'?: number
    'energy-kcal'?: number
    'energy-kcal_serving'?: number
    proteins_100g?: number
    proteins?: number
    carbohydrates_100g?: number
    carbohydrates?: number
    fat_100g?: number
    fat?: number
    fiber_100g?: number
    fiber?: number
    sugars_100g?: number
    sugars?: number
    salt_100g?: number
    salt?: number
    sodium_100g?: number
    serving_quantity?: number
    serving_size?: number
  }
  image_front_thumb_url?: string
  image_front_url?: string
  image_url?: string
}

interface OFFSearchResponse {
  products?: OFFProduct[]
  count?: number
}

/**
 * Lookup product by barcode
 */
export async function lookupBarcode(barcode: string): Promise<Food | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Shift Coach/1.0 (https://shiftcali.com)',
      },
    })

    if (!response.ok) {
      console.error('[OFF] Barcode lookup failed:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    
    if (data.status !== 1 || !data.product) {
      return null
    }

    return normalizeOFFProduct(data.product)
  } catch (error) {
    console.error('[OFF] Barcode lookup error:', error)
    return null
  }
}

/**
 * Search products by text query
 */
export async function searchProducts(query: string, limit: number = 20): Promise<Food[]> {
  try {
    const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
    url.searchParams.set('search_terms', query)
    url.searchParams.set('search_simple', '1')
    url.searchParams.set('action', 'process')
    url.searchParams.set('json', '1')
    url.searchParams.set('page_size', limit.toString())

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Shift Coach/1.0 (https://shiftcali.com)',
      },
    })

    if (!response.ok) {
      console.error('[OFF] Search failed:', response.status, response.statusText)
      return []
    }

    const data: OFFSearchResponse = await response.json()
    const products = data.products || []

    return products
      .map(normalizeOFFProduct)
      .filter((food): food is Food => food !== null)
  } catch (error) {
    console.error('[OFF] Search error:', error)
    return []
  }
}

/**
 * Normalize OpenFoodFacts product to our Food schema
 */
function normalizeOFFProduct(product: OFFProduct): Food | null {
  if (!product.product_name) {
    return null
  }

  const nutriments = product.nutriments || {}

  // Extract macros (per 100g)
  const kcalPer100g = nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || null
  const proteinPer100g = nutriments.proteins_100g || nutriments.proteins || null
  const carbsPer100g = nutriments.carbohydrates_100g || nutriments.carbohydrates || null
  const fatPer100g = nutriments.fat_100g || nutriments.fat || null
  const fiberPer100g = nutriments.fiber_100g || null
  const sugarPer100g = nutriments.sugars_100g || nutriments.sugars || null
  const saltPer100g = nutriments.salt_100g || null

  // Determine portion size
  let portionQty: number = 100
  let portionUnit: string = 'g'

  if (nutriments.serving_quantity && nutriments.serving_size) {
    portionQty = nutriments.serving_quantity * nutriments.serving_size
    portionUnit = 'g'
  } else if (nutriments.serving_size) {
    portionQty = nutriments.serving_size
    portionUnit = 'g'
  }

  // Get country (first from countries_tags)
  const country = product.countries_tags?.[0]?.replace('en:', '') || null

  // Get image URL
  const imageUrl = product.image_front_thumb_url || product.image_front_url || product.image_url || null

  return {
    id: '', // Will be set by database
    barcode: product.code || null,
    name: product.product_name,
    brand_id: null,
    brand_name: product.brands || null,
    country,
    source_id: 'OpenFoodFacts',
    kcal_per_100g: kcalPer100g ? Math.round(kcalPer100g) : null,
    protein_per_100g: proteinPer100g ? Math.round(proteinPer100g * 10) / 10 : null,
    carbs_per_100g: carbsPer100g ? Math.round(carbsPer100g * 10) / 10 : null,
    fat_per_100g: fatPer100g ? Math.round(fatPer100g * 10) / 10 : null,
    fiber_per_100g: fiberPer100g ? Math.round(fiberPer100g * 10) / 10 : null,
    sugar_per_100g: sugarPer100g ? Math.round(sugarPer100g * 10) / 10 : null,
    salt_per_100g: saltPer100g ? Math.round(saltPer100g * 10) / 10 : null,
    default_portion_qty: portionQty,
    default_portion_unit: portionUnit,
    image_url: imageUrl,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }
}

