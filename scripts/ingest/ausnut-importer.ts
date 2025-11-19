/**
 * AUSNUT (Australian Food Composition Database) Importer
 * 
 * Parses AUSNUT CSV dataset and loads into nutrition_foods table.
 * 
 * Download AUSNUT dataset from:
 * https://www.foodstandards.gov.au/science/monitoringnutrients/ausnut/Pages/default.aspx
 * 
 * Usage: npx tsx scripts/ingest/ausnut-importer.ts <path-to-ausnut.csv>
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as csv from 'csv-parse/sync'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface AUSNUTRow {
  'Food Name': string
  'Brand'?: string
  'Energy (kJ)'?: string
  'Energy (kcal)'?: string
  'Protein (g)'?: string
  'Carbohydrate (g)'?: string
  'Fat (g)'?: string
  'Serving Size (g)'?: string
}

async function importAUSNUT(csvPath: string) {
  console.log('[AUSNUT] Starting AUSNUT import...')

  if (!fs.existsSync(csvPath)) {
    console.error(`[AUSNUT] File not found: ${csvPath}`)
    process.exit(1)
  }

  try {
    const fileContent = fs.readFileSync(csvPath, 'utf-8')
    
    // Parse CSV
    const records: AUSNUTRow[] = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    console.log(`[AUSNUT] Parsed ${records.length} records`)

    const batch: any[] = []
    const BATCH_SIZE = 100
    let inserted = 0

    for (const row of records) {
      const name = row['Food Name']?.trim()
      if (!name) continue

      // Prefer kcal, fallback to kJ conversion
      let calories = parseFloat(row['Energy (kcal)'] || '0')
      if (calories === 0 && row['Energy (kJ)']) {
        calories = parseFloat(row['Energy (kJ)']) / 4.184 // Convert kJ to kcal
      }

      if (calories === 0) continue

      const protein = parseFloat(row['Protein (g)'] || '0')
      const carbs = parseFloat(row['Carbohydrate (g)'] || '0')
      const fat = parseFloat(row['Fat (g)'] || '0')
      const servingSize = parseFloat(row['Serving Size (g)'] || '100')

      batch.push({
        name: name.substring(0, 255),
        brand: row['Brand'] ? row['Brand'].substring(0, 255) : null,
        barcode: null,
        serving_size: servingSize,
        serving_unit: 'g',
        calories_per_serving: Math.round(calories),
        protein_per_serving: Math.round(protein * 10) / 10,
        carbs_per_serving: Math.round(carbs * 10) / 10,
        fat_per_serving: Math.round(fat * 10) / 10,
        source: 'ausnut',
      })

      if (batch.length >= BATCH_SIZE) {
        const { error } = await supabase
          .from('nutrition_foods')
          .upsert(batch, {
            onConflict: 'name,brand',
            ignoreDuplicates: false,
          })

        if (!error) {
          inserted += batch.length
        } else {
          console.error('[AUSNUT] Batch insert error:', error)
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

    console.log(`[AUSNUT] Import complete! Inserted/updated ${inserted} foods`)
  } catch (err: any) {
    console.error('[AUSNUT] Import error:', err)
    throw err
  }
}

// Run if called directly
if (require.main === module) {
  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error('Usage: npx tsx scripts/ingest/ausnut-importer.ts <path-to-ausnut.csv>')
    process.exit(1)
  }

  importAUSNUT(csvPath)
    .then(() => {
      console.log('[AUSNUT] Import completed successfully')
      process.exit(0)
    })
    .catch((err) => {
      console.error('[AUSNUT] Import failed:', err)
      process.exit(1)
    })
}

export { importAUSNUT }

