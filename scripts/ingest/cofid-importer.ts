/**
 * CoFID (Composition of Foods Integrated Dataset) Importer
 * 
 * Parses CoFID CSV dataset and loads into nutrition_foods table.
 * 
 * Download CoFID dataset from:
 * https://www.gov.uk/government/statistics/composition-of-foods-integrated-dataset-cofid
 * 
 * Usage: npx tsx scripts/ingest/cofid-importer.ts <path-to-cofid.csv>
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

interface CoFIDRow {
  'Food name': string
  'Brand'?: string
  'Energy (kcal)': string
  'Protein (g)': string
  'Carbohydrate (g)': string
  'Fat (g)': string
  'Serving size (g)'?: string
}

async function importCoFID(csvPath: string) {
  console.log('[CoFID] Starting CoFID import...')

  if (!fs.existsSync(csvPath)) {
    console.error(`[CoFID] File not found: ${csvPath}`)
    process.exit(1)
  }

  try {
    const fileContent = fs.readFileSync(csvPath, 'utf-8')
    
    // Parse CSV
    const records: CoFIDRow[] = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    console.log(`[CoFID] Parsed ${records.length} records`)

    const batch: any[] = []
    const BATCH_SIZE = 100
    let inserted = 0

    for (const row of records) {
      const name = row['Food name']?.trim()
      if (!name) continue

      const calories = parseFloat(row['Energy (kcal)'] || '0')
      if (calories === 0) continue

      const protein = parseFloat(row['Protein (g)'] || '0')
      const carbs = parseFloat(row['Carbohydrate (g)'] || '0')
      const fat = parseFloat(row['Fat (g)'] || '0')
      const servingSize = parseFloat(row['Serving size (g)'] || '100')

      batch.push({
        name: name.substring(0, 255),
        brand: row['Brand'] ? row['Brand'].substring(0, 255) : null,
        barcode: null, // CoFID doesn't have barcodes
        serving_size: servingSize,
        serving_unit: 'g',
        calories_per_serving: Math.round(calories),
        protein_per_serving: Math.round(protein * 10) / 10,
        carbs_per_serving: Math.round(carbs * 10) / 10,
        fat_per_serving: Math.round(fat * 10) / 10,
        source: 'cofid',
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
          console.error('[CoFID] Batch insert error:', error)
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

    console.log(`[CoFID] Import complete! Inserted/updated ${inserted} foods`)
  } catch (err: any) {
    console.error('[CoFID] Import error:', err)
    throw err
  }
}

// Run if called directly
if (require.main === module) {
  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error('Usage: npx tsx scripts/ingest/cofid-importer.ts <path-to-cofid.csv>')
    process.exit(1)
  }

  importCoFID(csvPath)
    .then(() => {
      console.log('[CoFID] Import completed successfully')
      process.exit(0)
    })
    .catch((err) => {
      console.error('[CoFID] Import failed:', err)
      process.exit(1)
    })
}

export { importCoFID }

