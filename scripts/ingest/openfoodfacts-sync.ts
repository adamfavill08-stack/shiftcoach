/**
 * OpenFoodFacts Nightly Sync Script
 * 
 * Fetches the daily dump from OpenFoodFacts and merges into nutrition_foods table.
 * Run this nightly via cron or scheduled job.
 * 
 * Usage: npx tsx scripts/ingest/openfoodfacts-sync.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as zlib from 'zlib'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface OFFProduct {
  code: string
  product_name: string
  brands?: string
  nutriments?: {
    'energy-kcal_100g'?: number
    'energy-kcal'?: number
    proteins_100g?: number
    proteins?: number
    carbohydrates_100g?: number
    carbohydrates?: number
    fat_100g?: number
    fat?: number
    serving_size?: number
  }
}

async function downloadAndProcessDump() {
  console.log('[OFF Sync] Starting OpenFoodFacts sync...')

  // OpenFoodFacts provides daily dumps at:
  // https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz
  const dumpUrl = 'https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz'
  const tempFile = path.join(process.cwd(), 'tmp', 'off-dump.jsonl.gz')

  try {
    // Create tmp directory if it doesn't exist
    const tmpDir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true })
    }

    console.log('[OFF Sync] Downloading dump...')
    const response = await fetch(dumpUrl)
    if (!response.ok) {
      throw new Error(`Failed to download dump: ${response.statusText}`)
    }

    // Save to temp file
    const buffer = await response.arrayBuffer()
    fs.writeFileSync(tempFile, Buffer.from(buffer))

    console.log('[OFF Sync] Processing dump...')

    // Read and process line by line (streaming)
    const fileStream = createReadStream(tempFile)
    const gunzip = fileStream.pipe(zlib.createGunzip())
    
    const rl = createInterface({
      input: gunzip,
      crlfDelay: Infinity,
    })

    let processed = 0
    let inserted = 0
    let batch: any[] = []
    const BATCH_SIZE = 100

    for await (const line of rl) {
      if (!line.trim()) continue

      try {
        const product: OFFProduct = JSON.parse(line)

        // Skip if missing essential data
        if (!product.code || !product.product_name) continue

        const nutriments = product.nutriments || {}
        const caloriesPer100g = nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0

        // Only process products with nutrition data
        if (caloriesPer100g === 0) continue

        const servingSize = nutriments.serving_size || 100
        const caloriesPerServing = Math.round((caloriesPer100g / 100) * servingSize)
        const proteinPerServing = Math.round(((nutriments.proteins_100g || nutriments.proteins || 0) / 100) * servingSize * 10) / 10
        const carbsPerServing = Math.round(((nutriments.carbohydrates_100g || nutriments.carbohydrates || 0) / 100) * servingSize * 10) / 10
        const fatPerServing = Math.round(((nutriments.fat_100g || nutriments.fat || 0) / 100) * servingSize * 10) / 10

        batch.push({
          name: product.product_name.substring(0, 255), // Limit length
          brand: product.brands ? product.brands.substring(0, 255) : null,
          barcode: product.code,
          serving_size: servingSize,
          serving_unit: 'g',
          calories_per_serving: caloriesPerServing,
          protein_per_serving: proteinPerServing,
          carbs_per_serving: carbsPerServing,
          fat_per_serving: fatPerServing,
          source: 'openfoodfacts',
        })

        if (batch.length >= BATCH_SIZE) {
          // Insert batch (use upsert to avoid duplicates)
          const { error } = await supabase
            .from('nutrition_foods')
            .upsert(batch, {
              onConflict: 'barcode',
              ignoreDuplicates: false,
            })

          if (!error) {
            inserted += batch.length
          } else {
            console.error('[OFF Sync] Batch insert error:', error)
          }

          batch = []
        }

        processed++
        if (processed % 10000 === 0) {
          console.log(`[OFF Sync] Processed ${processed} products, inserted ${inserted}...`)
        }
      } catch (parseErr) {
        // Skip invalid JSON lines
        continue
      }
    }

    // Insert remaining batch
    if (batch.length > 0) {
      const { error } = await supabase
        .from('nutrition_foods')
        .upsert(batch, {
          onConflict: 'barcode',
          ignoreDuplicates: false,
        })

      if (!error) {
        inserted += batch.length
      }
    }

    console.log(`[OFF Sync] Complete! Processed ${processed} products, inserted/updated ${inserted}`)

    // Clean up temp file
    fs.unlinkSync(tempFile)
  } catch (err: any) {
    console.error('[OFF Sync] Error:', err)
    // Clean up temp file on error
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile)
    }
    throw err
  }
}

// Run if called directly
if (require.main === module) {
  downloadAndProcessDump()
    .then(() => {
      console.log('[OFF Sync] Sync completed successfully')
      process.exit(0)
    })
    .catch((err) => {
      console.error('[OFF Sync] Sync failed:', err)
      process.exit(1)
    })
}

export { downloadAndProcessDump }

